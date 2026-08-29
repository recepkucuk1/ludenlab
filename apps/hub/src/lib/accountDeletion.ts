import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { studioDb } from "@/lib/db/studio";
import { atolyeDb } from "@/lib/db/atolye";
import { cancelSubscription } from "@/lib/iyzico";

/**
 * Hesabın TAM silinmesi — üç DB + ödeme sağlayıcısı boyunca orkestrasyon.
 * 2026-08 güvenlik denetimi #03.
 *
 * ÖNCEDEN NE OLUYORDU: admin "sil" dediğinde yalnız MODÜL satırı siliniyordu
 * (`therapist.delete` / atolye `account.delete`). Merkezi tarafa hiç dokunulmuyordu, yani:
 *   · `billing.Account` kalıyor  → kişi HÂLÂ giriş yapabiliyor
 *   · `Subscription` + iyzico ref → KART ÇEKİLMEYE DEVAM EDEBİLİYOR
 *   · `BillingProfile` (TCKN/adres) kalıyor → gizlilik vaadi karşılanmıyor
 *   · diğer modül hesabı yaşıyor
 *   · kullanıcı tekrar girince SELF-HEAL modül satırını yeniden yaratıyor → silme kalıcı değil
 *   · hiçbir audit kaydı yok
 *
 * SIRA ÖNEMLİ — önce sağlayıcı, sonra veri:
 * iyzico aboneliği iptal EDİLEMEZSE silme ABORT edilir. Aksi hâlde kaydı sildiğimiz ama
 * kartı çekilmeye devam eden bir müşteri kalırdı ki bu, hiç silmemekten daha kötüdür
 * (kimin parası çekiliyor artık sistemde görünmez).
 *
 * VUK ↔ KVKK: `Payment` satırları SİLİNMEZ (fatura saklama yükümlülüğü). Bunun yerine
 * fatura kimliği `invoiceSnapshot`'a kopyalanır ve `accountId` NULL'a düşer (0015 migration).
 * Böylece işletme sisteminden kişisel veri gider, yasal kayıt ayakta kalır.
 *
 * DİRİLTME: merkezi `Account` silindiği için giriş yapılamaz → oturum olmaz → self-heal
 * tetiklenemez. Ayrı bir "tombstone" gerekmez.
 */

export type DeleteAccountResult =
  | { ok: true; email: string; deleted: { studio: boolean; atolye: boolean; central: boolean; paymentsKept: number } }
  | { ok: false; reason: "not_found" | "provider_cancel_failed"; message: string };

/** Fatura kaydında saklanacak kimlik anlık kopyası. */
function buildInvoiceSnapshot(
  account: { email: string; name: string | null },
  profile: {
    type: string; fullName: string; tckn: string | null; companyName: string | null;
    taxNumber: string | null; taxOffice: string | null; address: string | null;
    city: string; district: string | null;
  } | null,
  deletedAt: Date,
): Prisma.InputJsonValue {
  return {
    deletedAt: deletedAt.toISOString(),
    email: account.email,
    name: account.name ?? null,
    profile: profile
      ? {
          type: profile.type,
          fullName: profile.fullName,
          tckn: profile.tckn,
          companyName: profile.companyName,
          taxNumber: profile.taxNumber,
          taxOffice: profile.taxOffice,
          address: profile.address,
          city: profile.city,
          district: profile.district,
        }
      : null,
  };
}

/**
 * E-posta ile bilinen bir hesabı tüm sistemlerden siler.
 * Modül silmeleri best-effort (biri yoksa akış durmaz); merkezi silme ise kesin.
 */
export async function deleteAccountEverywhere(rawEmail: string): Promise<DeleteAccountResult> {
  const email = rawEmail.toLowerCase().trim();

  const account = await prisma.account.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      billingProfile: true,
      subscriptions: { select: { id: true, iyzicoSubscriptionRef: true, status: true } },
    },
  });
  if (!account) {
    return { ok: false, reason: "not_found", message: "Merkezi hesap bulunamadı." };
  }

  // ── 1) SAĞLAYICI ÖNCE: canlı iyzico aboneliklerini iptal et ──
  // Başarısız olursa hiçbir şey silmeyiz (bkz. başlıktaki gerekçe).
  for (const sub of account.subscriptions) {
    if (!sub.iyzicoSubscriptionRef) continue; // zaten sağlayıcıda kapalı
    if (sub.status === "CANCELED" || sub.status === "EXPIRED") continue;
    try {
      const r = await cancelSubscription(sub.iyzicoSubscriptionRef);
      const alreadyClosed = /already|zaten/i.test(r.errorMessage ?? "");
      if (r.status !== "success" && !alreadyClosed) {
        return {
          ok: false,
          reason: "provider_cancel_failed",
          message: `iyzico aboneliği iptal edilemedi (${r.errorCode ?? "?"}: ${r.errorMessage ?? "bilinmeyen"}). Silme iptal edildi — aksi hâlde kart çekilmeye devam ederdi.`,
        };
      }
    } catch (e) {
      return {
        ok: false,
        reason: "provider_cancel_failed",
        message: `iyzico'ya ulaşılamadı: ${e instanceof Error ? e.message : String(e)}. Silme iptal edildi.`,
      };
    }
  }

  // ── 2) Fatura kimliğini kalıcı kayda kopyala (VUK) ──
  const snapshot = buildInvoiceSnapshot(account, account.billingProfile, new Date());
  const kept = await prisma.payment.updateMany({
    where: { accountId: account.id },
    data: { invoiceSnapshot: snapshot },
  });

  // ── 3) Modül kayıtları (best-effort; yoksa sorun değil) ──
  let studioDeleted = false;
  let atolyeDeleted = false;
  try {
    const r = await studioDb.therapist.deleteMany({ where: { email } });
    studioDeleted = r.count > 0;
  } catch (e) {
    console.error("[accountDeletion] studio silinemedi:", email, e);
  }
  try {
    const r = await atolyeDb.account.deleteMany({ where: { email } });
    atolyeDeleted = r.count > 0;
  } catch (e) {
    console.error("[accountDeletion] atolye silinemedi:", email, e);
  }

  // ── 4) Merkezi hesap — BillingProfile + Subscription cascade ile gider,
  //      Payment ise SET NULL ile ÖKSÜZ KALIR (silinmez). ──
  await prisma.account.delete({ where: { id: account.id } });

  return {
    ok: true,
    email,
    deleted: { studio: studioDeleted, atolye: atolyeDeleted, central: true, paymentsKept: kept.count },
  };
}
