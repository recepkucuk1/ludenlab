import { prisma } from "@studio/lib/db";
import { CREDIT_COSTS } from "@studio/lib/plans";
import type { Prisma } from "@/generated/studio/client";

/* Studio kredi (üretim hakkı) sistemi.

   TEK KURAL: pahalı bir işlemi (AI/görsel çağrısı) hak KONTROLÜNE dayandırma — hakkı
   çağrıdan ÖNCE `reserveCredits`/`reserveCreditsFor` ile REZERVE et, iş tamamlanmazsa
   `refundCredits`/`refundCreditsFor` ile iade et.

   Eskiden burada `checkCredits` (kontrol) + `deductCredits` (sonradan düşüm) çifti vardı;
   ikisi arasındaki pencere eşzamanlı isteklerin aynı bakiyeyi görmesine ve HEPSİNİN AI'ı
   çağırmasına izin veriyordu (2026-08 denetimi #22). Aynı tuzak tekrar kurulmasın diye o
   fonksiyonlar KALDIRILDI — bakiyeyi "önce oku sonra düş" deseni bu dosyada artık yok. */

// shouldGrantCredits → @ludenlab/billing (saf, paylaşılan; central-billing reconcile kullanır).

type CreditCostKey = keyof typeof CREDIT_COSTS;

const DESCRIPTIONS: Record<CreditCostKey, string> = {
  card_generate: "Öğrenme kartı üretimi",
  ai_profile:    "AI profil oluşturma",
};

/**
 * Pahalı işlemden ÖNCE krediyi ATOMİK rezerve eder (2026-08 denetimi #22).
 *
 * Koşullu tek SQL (`WHERE credits >= cost`) satır kilidiyle çalışır → READ COMMITTED'da
 * bile yarışa karşı güvenli, negatife düşmez. Kaybeden eşzamanlı istek AI'ı HİÇ çağırmaz.
 * Defter kaydı rezervasyonla AYNI transaction'da yazılır: bakiye her an
 * `Σ(EARN) − Σ(SPEND)`'e eşit kalır; iade de deftere EARN olarak düşer.
 */
export async function reserveCredits(
  therapistId: string,
  cost: number,
  description: string,
): Promise<boolean> {
  if (cost <= 0) return true;

  return prisma.$transaction(async (tx) => {
    const dec = await tx.therapist.updateMany({
      where: { id: therapistId, credits: { gte: cost } },
      data: { credits: { decrement: cost } },
    });
    if (dec.count === 0) return false;

    await tx.creditTransaction.create({
      data: { therapistId, amount: cost, type: "SPEND", description },
    });
    return true;
  });
}

/**
 * Rezerve edilmiş hakkın İADESİ (üretim tamamlanamadı / ücretsiz çıktı). Asla fırlatmaz:
 * iade de başarısız olursa kullanıcı hakkını kaybeder, bu yüzden GÖRÜNÜR loglanır.
 */
export async function refundCredits(
  therapistId: string,
  cost: number,
  description: string,
): Promise<void> {
  if (cost <= 0) return;
  try {
    await grantCredits(therapistId, cost, description);
  } catch (e) {
    console.error("[studio/credits] KREDİ İADESİ BAŞARISIZ", { therapistId, cost }, e);
  }
}

/** `CREDIT_COSTS` anahtarı için rezervasyon — maliyet + defter açıklaması sabit tablodan. */
export async function reserveCreditsFor(
  therapistId: string,
  type: CreditCostKey,
): Promise<boolean> {
  return reserveCredits(therapistId, CREDIT_COSTS[type], DESCRIPTIONS[type]);
}

/**
 * Rezerve edilmiş hakkın İADESİ (üretim tamamlanamadı). Asla fırlatmaz: iade de
 * başarısız olursa kullanıcı hakkını kaybeder, bu yüzden GÖRÜNÜR loglanır.
 */
export async function refundCreditsFor(
  therapistId: string,
  type: CreditCostKey,
  reason: string,
): Promise<void> {
  await refundCredits(therapistId, CREDIT_COSTS[type], `${DESCRIPTIONS[type]} — iade (${reason})`);
}

/**
 * Atomically grants credits to a therapist account.
 * Used by admin credit top-ups, signup bonuses and (soon) payment
 * webhooks. Always creates a matching `CreditTransaction(EARN)` entry so the
 * ledger stays in sync with `Therapist.credits`.
 *
 * When passed a transaction client, the grant joins that transaction — so
 * callers can couple the grant to other side-effects (e.g. creating a
 * Subscription row on successful payment) and roll everything back together.
 */
export async function grantCredits(
  therapistId: string,
  amount: number,
  description: string,
  tx?: Prisma.TransactionClient,
): Promise<{ newBalance: number }> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("grantCredits: amount must be a positive integer");
  }

  const run = async (client: Prisma.TransactionClient): Promise<{ newBalance: number }> => {
    const updated = await client.therapist.update({
      where: { id: therapistId },
      data: { credits: { increment: amount } },
      select: { credits: true },
    });
    await client.creditTransaction.create({
      data: {
        therapistId,
        amount,
        type: "EARN",
        description,
      },
    });
    return { newBalance: updated.credits };
  };

  if (tx) return run(tx);
  return prisma.$transaction(run);
}

/**
 * Atomically revokes credits from a therapist account — admin refund flow.
 *
 * Yetersiz bakiyede `{ ok: false }` döner — caller UI'da uyarır. Sessiz clamp
 * yapmıyoruz çünkü audit'te "ne kadar düşürüldü" net olmalı; admin amount'u
 * kararlı verir. `grantCredits`'in simetrik karşılığı: bakiyeyi düşürür ve
 * `CreditTransaction(SPEND)` yazar.
 */
export async function revokeCredits(
  therapistId: string,
  amount: number,
  description: string,
  tx?: Prisma.TransactionClient,
): Promise<{ ok: true; newBalance: number } | { ok: false; credits: number }> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("revokeCredits: amount must be a positive integer");
  }

  const run = async (
    client: Prisma.TransactionClient,
  ): Promise<{ ok: true; newBalance: number } | { ok: false; credits: number }> => {
    const therapist = await client.therapist.findUnique({
      where: { id: therapistId },
      select: { credits: true },
    });
    if (!therapist) throw new Error("Therapist not found");
    if (therapist.credits < amount) {
      return { ok: false as const, credits: therapist.credits };
    }
    const updated = await client.therapist.update({
      where: { id: therapistId },
      data: { credits: { decrement: amount } },
      select: { credits: true },
    });
    await client.creditTransaction.create({
      data: {
        therapistId,
        amount,
        type: "SPEND",
        description,
      },
    });
    return { ok: true as const, newBalance: updated.credits };
  };

  if (tx) return run(tx);
  return prisma.$transaction(run);
}
