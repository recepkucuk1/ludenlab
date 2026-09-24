import { createHmac } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { buildInvoiceSnapshot } from "@/lib/invoiceIdentity";
import { prisma } from "@/lib/db";
import { studioDb } from "@/lib/db/studio";
import { atolyeDb } from "@/lib/db/atolye";
import { cancelAtProviderAndVerify } from "@/lib/iyzicoOps";
import { billingAlarm } from "@/lib/billingAlarm";
import { maskEmail } from "@/lib/logRedact";

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

/**
 * Silme kütüğü e-posta anahtarı — HMAC, düz sha256 DEĞİL.
 *
 * Düz `sha256(email)` sözlük saldırısıyla çözülür (e-posta uzayı küçük ve tahmin edilebilir);
 * o zaman kütük, silmeyi vaat ettiğimiz veriyi geri getiren bir yapıya dönüşürdü. Gizli
 * anahtarlı HMAC ile "bu e-posta silinmiş mi?" sorusu hesaplanarak sorulabilir, ama kütükten
 * e-postaya gidilemez.
 */
export function deletionEmailHash(email: string): string {
  // Ayrı anahtar (2026-09 denetimi #27): AUTH_SECRET oturum anahtarıdır ve sızıntıda
  // DÖNDÜRÜLMESİ gerekir; kütük onunla anahtarlanınca döndürme eski silme kayıtlarını
  // sorgulanamaz yapıyordu. DELETION_LEDGER_SECRET verilmişse o kullanılır (bir kez
  // belirlenip sabit kalmalı). Geçişten önceki satırları sorgularken AUTH_SECRET ile de
  // hesaplayın.
  const secret = process.env.DELETION_LEDGER_SECRET?.trim() || process.env.AUTH_SECRET || "";
  return createHmac("sha256", secret).update(email.toLowerCase().trim()).digest("hex");
}

export type DeleteAccountResult =
  | { ok: true; email: string; deleted: { studio: boolean; atolye: boolean; central: boolean; paymentsKept: number } }
  | { ok: false; reason: "not_found" | "provider_cancel_failed" | "module_delete_failed"; message: string };

/**
 * E-posta ile bilinen bir hesabı tüm sistemlerden siler.
 * Modül satırı YOKSA akış durmaz; ama modül silmesi HATA verirse merkezi hesap silinmez
 * (bkz. adım 3) — silme yeniden denenebilir kalır.
 */
export async function deleteAccountEverywhere(
  rawEmail: string,
  by: { deletedBy: "self" | "admin"; actorId?: string | null } = { deletedBy: "admin" },
): Promise<DeleteAccountResult> {
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
    if (!sub.iyzicoSubscriptionRef) continue; // sağlayıcıda karşılığı yok

    // DURUMA DEĞİL REF'E BAK (2026-09 denetimi): bizdeki "CANCELED" yalnız kullanıcının
    // NİYETİDİR — sağlayıcıdaki gerçek iptal ancak sweep cron'u koştuğunda olur. Ertelenmiş
    // iptalli bir aboneliği durumuna bakıp atlamak, hesabı sildiğimiz hâlde kartın çekilmeye
    // devam etmesi demekti; üstelik silinen müşterinin parası artık hiçbir ekranda görünmez.
    // `cancelAtProviderAndVerify` zaten kapalıysa ekstra istek atmaz ve asla fırlatmaz.
    const providerResult = await cancelAtProviderAndVerify(sub.iyzicoSubscriptionRef);
    if (!providerResult.closed) {
      return {
        ok: false,
        reason: "provider_cancel_failed",
        message: `iyzico aboneliğinin iptali DOĞRULANAMADI (sağlayıcı durumu: ${providerResult.observed}${providerResult.error ? `, hata: ${providerResult.error}` : ""}). Silme iptal edildi — aksi hâlde kart çekilmeye devam ederdi.`,
      };
    }
  }

  // ── 2) Fatura kimliğini kalıcı kayda kopyala (VUK) ──
  // Tahsilat anında alınmış kopya (işlem anındaki alıcı) KORUNUR; yalnız kopyası olmayan
  // eski kayıtlara silme anındaki kimlik yazılır.
  const snapshot = buildInvoiceSnapshot(account, account.billingProfile, {
    deletedAt: new Date(),
  }) as Prisma.InputJsonValue;
  await prisma.payment.updateMany({
    where: { accountId: account.id, invoiceSnapshot: { equals: Prisma.DbNull } },
    data: { invoiceSnapshot: snapshot },
  });
  const kept = { count: await prisma.payment.count({ where: { accountId: account.id } }) };

  // ── 3) Modül kayıtları — satır yoksa sorun değil, SİLME HATASI ise DUR ──
  // Eskiden hatalar yutulup merkezi hesap yine siliniyordu (2026-09 denetimi #19): geride
  // öğrenci/klinik veri (çocuk verisi) kalıyor, kullanıcıya "silindi" deniyordu (KVKK m.7).
  // Üstelik aynı e-postayla yeniden kayıtta provision `upsert` eski modül satırını geri
  // bağlıyordu. Merkezi hesap durursa silme yeniden denenebilir (adımlar idempotent).
  let studioDeleted = false;
  let atolyeDeleted = false;
  const moduleErrors: string[] = [];
  try {
    const r = await studioDb.therapist.deleteMany({ where: { email } });
    studioDeleted = r.count > 0;
  } catch (e) {
    moduleErrors.push("studio");
    console.error("[accountDeletion] studio silinemedi:", maskEmail(email), e);
  }
  try {
    const r = await atolyeDb.account.deleteMany({ where: { email } });
    atolyeDeleted = r.count > 0;
  } catch (e) {
    moduleErrors.push("atolye");
    console.error("[accountDeletion] atolye silinemedi:", maskEmail(email), e);
  }
  if (moduleErrors.length > 0) {
    billingAlarm("hesap silme: modül verisi silinemedi — merkezi hesap KORUNDU, yeniden denenmeli", {
      account: account.id,
      failed: moduleErrors,
      studioDeleted,
      atolyeDeleted,
    });
    return {
      ok: false,
      reason: "module_delete_failed",
      message:
        "Hesabınızın bazı verileri şu an silinemedi; hesabınız silinmedi (varsa aboneliğiniz iptal edildi). Lütfen birkaç dakika sonra tekrar deneyin; sorun sürerse info@ludenlab.com adresine yazın.",
    };
  }

  // ── 4) Merkezi hesap — BillingProfile + Subscription cascade ile gider,
  //      Payment ise SET NULL ile ÖKSÜZ KALIR (silinmez). ──
  await prisma.account.delete({ where: { id: account.id } });

  // ── 5) Silme KÜTÜĞÜ (KVKK kanıtı) ──
  // Buraya kadar geldiysek hesap gerçekten gitti; geriye tek bir iz kalmıyordu. Kütük
  // e-postayı DÜZ TUTMAZ (HMAC) — silmeyi geri almadan "silindi mi, ne zaman, kim sildi"
  // sorusunu yanıtlar. Best-effort: kütük yazılamazsa silme geçersiz sayılmaz (veri zaten
  // gitti, kullanıcıya "silinmedi" demek yanlış olurdu) ama GÖRÜNÜR loglanır.
  try {
    await prisma.accountDeletion.create({
      data: {
        emailHash: deletionEmailHash(email),
        deletedBy: by.deletedBy,
        actorId: by.actorId ?? null,
        modules: { studio: studioDeleted, atolye: atolyeDeleted, central: true },
        paymentsKept: kept.count,
        hadSubscription: account.subscriptions.length > 0,
      },
    });
  } catch (e) {
    console.error("[accountDeletion] KÜTÜK YAZILAMADI (silme tamamlandı):", e);
  }

  return {
    ok: true,
    email,
    deleted: { studio: studioDeleted, atolye: atolyeDeleted, central: true, paymentsKept: kept.count },
  };
}
