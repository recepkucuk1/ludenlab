import type { RunPromptResult } from "@ludenlab/ai";
import type { Prisma } from "@/generated/atolye/client";
import { prisma } from "./db";
import { COST_PER_GENERATION, PLAN_CONFIG } from "./plans";
import { logUsage } from "./usage";
import { rateLimit } from "@/lib/rateLimit";

/** 24 saatte kullanıcı başına en fazla iade sayısı (bkz. withCredits). */
const DAILY_REFUND_CAP = 10;

/** Kullanıcı başına AI üretim hız sınırı (dk). Tüm atölye AI araçları withCredits'ten geçer. */
const GEN_RATE_LIMIT_PER_MIN = 12;

/* Kullanıcı kredi sistemi. Bakiye = Account.credits; her hareket CreditTransaction'a yazılır. */

export async function getBalance(accountId: string): Promise<number> {
  const a = await prisma.account.findUnique({ where: { id: accountId }, select: { credits: true } });
  return a?.credits ?? 0;
}

/** tx İÇİNDE kredi yükle — çağıranın transaction'ına dahil olur (nested transaction YOK).
    callback/webhook gibi zaten $transaction içinde olan yerlerden bunu kullan. */
export async function grantCreditsOnTx(
  tx: Prisma.TransactionClient,
  accountId: string,
  amount: number,
  reason: string,
): Promise<number> {
  const updated = await tx.account.update({
    where: { id: accountId },
    data: { credits: { increment: amount } },
    select: { credits: true },
  });
  await tx.creditTransaction.create({ data: { accountId, amount, type: "EARN", reason } });
  return updated.credits;
}

/** Bağımsız kredi yükleme (kendi transaction'ı). tx içindeysen grantCreditsOnTx kullan. */
export async function grantCredits(accountId: string, amount: number, reason: string): Promise<number> {
  return prisma.$transaction((tx) => grantCreditsOnTx(tx, accountId, amount, reason));
}

// shouldGrantCredits → @ludenlab/billing (saf, paylaşılan; central-billing reconcile kullanır).

export function listCreditTxns(accountId: string, take = 20) {
  return prisma.creditTransaction.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

type WithCreditsResult =
  | { ok: true; result: RunPromptResult; balance: number }
  | { ok: false; status: number; error: string };

/** Üretim hakkını ÜRETİMDEN ÖNCE atomik REZERVE eder, sonra AI'ı çağırır; üretim
    patlarsa hakkı İADE eder. Kullanım/maliyet başarıda loglanır.

    NEDEN ÖNCE REZERVE (2026-08 denetimi #22): eskiden akış "bakiyeye bak → üret → düş"
    idi. Kontrol ile düşüm arasındaki pencerede eşzamanlı istekler AYNI bakiyeyi görüyordu:
    hepsi ön-kontrolü geçip AI'ı çağırıyor (faturayı biz ödüyoruz), sonunda yalnız biri
    düşebiliyordu. `credits=1` olan bir hesap, hız sınırı kadar (dakikada 12) üretimi TEK
    krediyle aldırabiliyordu. Artık kaybeden istek AI'ı hiç çağırmaz. */
export async function withCredits(
  accountId: string,
  gen: () => Promise<RunPromptResult>,
): Promise<WithCreditsResult> {
  const cost = COST_PER_GENERATION;

  // Kullanıcı başına hız sınırı (tüm atölye AI araçlarının ortak boğazı).
  const { allowed, retryAfter } = rateLimit(`atolye:gen:${accountId}`, GEN_RATE_LIMIT_PER_MIN);
  if (!allowed) {
    return { ok: false, status: 429, error: `Çok fazla istek. ${retryAfter} sn sonra tekrar deneyin.` };
  }

  // Atomik REZERVASYON: koşullu updateMany (WHERE credits>=cost) tek SQL ifadesinde satır
  // kilidiyle çalışır → READ COMMITTED'da bile yarışa karşı güvenli, negatife düşmez.
  // Defter kaydı aynı transaction'da → bakiye her an `Σ(EARN) − Σ(SPEND)`'e eşit kalır.
  // SINIRSIZ PLAN (2026-09 denetimi #22): ENTERPRISE "Sınırsız üretim" vaat ediyor (hak
  // `-1`) ama rezervasyon `credits >= cost` istediği için kurumsal kullanıcı hiç
  // üretemiyordu. Sınırsız planda düşüm/iade yapılmaz; hız sınırı ve kullanım logu geçerli.
  let unlimited = false;
  const balance = await prisma.$transaction(async (tx) => {
    const me = await tx.account.findUnique({ where: { id: accountId }, select: { planType: true, credits: true } });
    if (me && PLAN_CONFIG[me.planType as keyof typeof PLAN_CONFIG]?.credits === -1) {
      unlimited = true;
      return me.credits;
    }
    const dec = await tx.account.updateMany({
      where: { id: accountId, credits: { gte: cost } },
      data: { credits: { decrement: cost } },
    });
    if (dec.count === 0) return null; // hak yok / eşzamanlı istek kaptı → AI çağrısı YAPILMAZ
    await tx.creditTransaction.create({
      data: { accountId, amount: -cost, type: "SPEND", reason: "Araç üretimi" },
    });
    const acc = await tx.account.findUnique({ where: { id: accountId }, select: { credits: true } });
    return acc?.credits ?? 0;
  });

  if (balance === null) {
    return { ok: false, status: 402, error: "Üretim hakkınız tükendi. Planınızı yükseltin." };
  }

  let result: RunPromptResult;
  try {
    result = await gen();
  } catch (e) {
    if (unlimited) throw e; // düşüm yapılmadı → iade yok
    // GÜNLÜK İADE TAVANI (2026-09 denetimi #16) — bkz. studio refundCredits: iade, faturalanmış
    // AI çağrısından sonra da yapıldığı için kasıtlı başarısızlıkla bedava üretim alınabiliyordu.
    const recentRefunds = await prisma.creditTransaction
      .count({
        where: {
          accountId,
          type: "EARN",
          reason: { contains: " — iade" },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      })
      .catch(() => 0);
    if (recentRefunds >= DAILY_REFUND_CAP) {
      console.warn("[atolye/withCredits] günlük iade tavanı doldu — iade yapılmadı", { accountId, recentRefunds });
      throw e;
    }
    // Üretim yok → rezerve edilen hak geri verilir (deftere EARN olarak yazılır).
    // İade de patlarsa GÖRÜNÜR logla; elle düzeltilebilsin diye sessizce yutma.
    await grantCredits(accountId, cost, "Araç üretimi — iade (üretim tamamlanamadı)").catch(
      (refundError) =>
        console.error("[atolye/withCredits] KREDİ İADESİ BAŞARISIZ", { accountId, cost }, refundError),
    );
    throw e;
  }

  await logUsage(accountId, result.model, result.usage); // admin gözlem (best-effort)
  return { ok: true, result, balance };
}
