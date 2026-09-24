import { prisma } from "@/lib/db";
import { cancelAtProviderAndVerify } from "@/lib/iyzicoOps";
import { billingAlarm } from "@/lib/billingAlarm";

/**
 * Modül "aboneliği iptal et" isteğinin MERKEZİ (para) tarafı — Studio ve Atölye ortak.
 *
 * OTORİTE = merkezi billing.Subscription: sweep ve modül reconcile merkezi durumu okur,
 * iyzico'ya iptali sweep A fazı iletir. Bu yüzden iptal merkezde kaydedilmeden kullanıcıya
 * "iptal edildi" DENMEZ.
 *
 * DÜZELTİLEN (2026-09 denetimi):
 *  - Merkezi abonelik e-posta ile aranıyordu; bulunamazsa yalnız yerel mirror iptal ediliyor
 *    ve `ok:true` dönülüyordu — iyzico çekmeye devam ederken kullanıcı iptal ettiğini
 *    sanıyordu. Artık mirror'ın `centralSubscriptionId` bağı esastır; bağlı merkezi kayıt
 *    yoksa işlem REDDEDİLİR. Bağsız (eski/elle verilmiş) mirror'da e-posta yedeği kalır.
 *  - PAST_DUE abonelik de iptal edilir (iyzico ödemeyi yeniden denemeye devam ediyordu).
 *  - Dönem sonuna ≤24h kalmışsa iptal HEMEN iletilir; doğrulanamazsa sonuç
 *    `providerPending` olarak döner ve alarm verilir (sessiz başarı yok).
 */

const IMMEDIATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const CANCELLABLE = ["ACTIVE", "PAST_DUE"] as const;

export type CentralCancelResult =
  | { ok: true; providerPending: boolean; hadCentral: boolean }
  | { ok: false; reason: "central_missing" };

export async function cancelCentralSubscription(input: {
  module: "STUDIO" | "ATOLYE";
  email: string | null | undefined;
  /** Yerel mirror'ın merkezi abonelik bağı (varsa otoriter). */
  centralSubscriptionId: string | null | undefined;
}): Promise<CentralCancelResult> {
  let accountId: string | null = null;

  if (input.centralSubscriptionId) {
    const linked = await prisma.subscription.findUnique({
      where: { id: input.centralSubscriptionId },
      select: { accountId: true },
    });
    if (!linked) {
      billingAlarm("iptal: mirror'ın bağlı olduğu merkezi abonelik yok — iptal reddedildi", {
        module: input.module,
        centralSubscriptionId: input.centralSubscriptionId,
      });
      return { ok: false, reason: "central_missing" };
    }
    accountId = linked.accountId;
  } else if (input.email) {
    // Bağsız mirror (eski/elle verilmiş plan): e-posta yedeği.
    const central = await prisma.account.findFirst({
      where: { email: { equals: input.email, mode: "insensitive" } },
      select: { id: true },
    });
    accountId = central?.id ?? null;
  }

  if (!accountId) return { ok: true, providerPending: false, hadCentral: false };

  const targets = await prisma.subscription.findMany({
    where: { accountId, module: input.module, status: { in: [...CANCELLABLE] } },
    select: { id: true, iyzicoSubscriptionRef: true, currentPeriodEnd: true },
  });
  if (targets.length === 0) return { ok: true, providerPending: false, hadCentral: false };

  await prisma.subscription.updateMany({
    where: { id: { in: targets.map((t) => t.id) } },
    data: { status: "CANCELED", cancelledAt: new Date() },
  });

  // SWEEP KÖR NOKTASI: iptal sağlayıcıya günlük sweep ile iletilir. Dönemi 24 saatten yakın
  // (ya da geçmiş, PAST_DUE) abonelikte bir sonraki sweep'i beklemek, iptal edilmiş
  // aboneliğin yenilenmesi demekti → HEMEN ilet. Daha uzak dönemler ertelenir: "Devam
  // ettir" çalışsın diye (sağlayıcıda kapatılan abonelik geri açılamaz).
  let providerPending = false;
  for (const t of targets) {
    const ref = t.iyzicoSubscriptionRef;
    const end = t.currentPeriodEnd;
    if (!ref || !end || end.getTime() - Date.now() > IMMEDIATE_WINDOW_MS) continue;

    const r = await cancelAtProviderAndVerify(ref);
    if (r.closed) {
      await prisma.subscription.update({ where: { id: t.id }, data: { iyzicoSubscriptionRef: null } });
    } else {
      // ref KORUNUR → sweep A tekrar dener (iptal idempotenttir).
      providerPending = true;
      billingAlarm("iptal: sağlayıcı iptali doğrulanamadı (yenilemeye <24h) — ref korundu", {
        sub: t.id,
        observed: r.observed,
        error: r.error,
      });
    }
  }

  return { ok: true, providerPending, hadCentral: true };
}

/** Kullanıcıya dönen iptal mesajı — sağlayıcı iletimi bekliyorsa bunu DÜRÜSTÇE söyler. */
export function cancelMessage(periodEnd: Date, providerPending: boolean): string {
  const date = periodEnd.toLocaleDateString("tr-TR");
  if (providerPending) {
    return (
      `İptal talebiniz kaydedildi; ${date} tarihine kadar mevcut planınızı kullanabilirsiniz. ` +
      "Ancak iptal ödeme sağlayıcısına henüz iletilemedi — otomatik olarak yeniden deneniyor. " +
      "Yenileme tarihinde yine de tahsilat yapılırsa info@ludenlab.com adresine yazın."
    );
  }
  return (
    `Aboneliğiniz iptal edildi. ${date} tarihine kadar mevcut planınızın özelliklerini kullanmaya ` +
    `devam edebilirsiniz. İptal kararınızdan vazgeçerseniz "Aboneliği Devam Ettir" butonunu kullanabilirsiniz.`
  );
}
