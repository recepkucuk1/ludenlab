import { mapIyzicoSubscriptionStatus } from "@ludenlab/billing";
import { cancelSubscription, retrieveSubscription } from "@/lib/iyzico";

/**
 * iyzico ile ORTAK işlemler — iptal etme ve iptali DOĞRULAMA.
 *
 * Bu mantığın üç ayrı kopyası vardı (sweep cron'u, hesap silme, hiç yapılmayan anlık iptal).
 * Kopyaların ayrışması para-kritiktir: biri "iptal oldu" sayıp ref'i temizlerken diğeri
 * denemeye devam ederse müşteriden tahsilat sürer. Tek kural: CEVABI DEĞİL DURUMU SOR
 * (2026-08 denetimi #32) — hata metni yorumlamak, işlemin adı zaten "cancel" olduğu için
 * olağan hata mesajlarını "başarı" sanmaya yol açıyordu.
 */

/** iyzico tarih alanını Date'e çevirir (ISO ya da epoch ms); çözümlenemezse null. */
export function parseIyzicoDate(s: string | undefined | null): Date | null {
  if (!s) return null;
  const iso = new Date(s);
  if (!isNaN(iso.getTime())) return iso;
  const n = Number(s);
  if (Number.isFinite(n) && n > 0) {
    const d = new Date(n);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

export interface ProviderStatusProbe {
  closed: boolean;
  observed: string;
}

/** Abonelik sağlayıcıda KAPALI mı? Doğrulanamazsa `closed:false` (fail-closed). */
export async function isClosedAtProvider(ref: string): Promise<ProviderStatusProbe> {
  const r = await retrieveSubscription(ref);
  if (r.status !== "success") {
    return { closed: false, observed: `retrieve_failed:${r.errorCode ?? r.errorMessage ?? "?"}` };
  }
  const mapped = mapIyzicoSubscriptionStatus(r.subscriptionStatus);
  return {
    closed: mapped === "CANCELED" || mapped === "EXPIRED",
    observed: r.subscriptionStatus ?? "unknown",
  };
}

export interface ProviderCancelOutcome {
  closed: boolean;
  observed: string;
  alreadyClosed: boolean;
  error?: string;
}

/**
 * Aboneliği sağlayıcıda iptal eder ve KAPANDIĞINI doğrular. Asla fırlatmaz.
 * `closed:false` dönerse çağıran taraf `iyzicoSubscriptionRef`'i KORUMALIDIR — sweep
 * cron'u ertesi gün tekrar dener (iptal idempotenttir).
 */
export async function cancelAtProviderAndVerify(ref: string): Promise<ProviderCancelOutcome> {
  try {
    const pre = await isClosedAtProvider(ref);
    if (pre.closed) return { closed: true, observed: pre.observed, alreadyClosed: true };
  } catch {
    // Ön kontrol patlarsa iptali yine de dene.
  }

  let error: string | undefined;
  try {
    const r = await cancelSubscription(ref);
    if (r.status !== "success") error = r.errorMessage ?? r.errorCode ?? "cancel_failed";
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  try {
    const post = await isClosedAtProvider(ref);
    return { closed: post.closed, observed: post.observed, alreadyClosed: false, error };
  } catch (e) {
    return {
      closed: false,
      observed: "verify_failed",
      alreadyClosed: false,
      error: error ?? (e instanceof Error ? e.message : String(e)),
    };
  }
}
