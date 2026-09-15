/**
 * hCaptcha — kayıt ucu bot koruması (2026-08 denetimi #15'in ikinci yarısı; ilk yarı:
 * kanonik e-posta başına günlük tavan + IP başına saatlik limit, register/route.ts).
 *
 * TASARIM
 *  - `HCAPTCHA_SECRET` yoksa özellik KAPALI: token istenmez, her şey geçer. Anahtarlar
 *    hPanel'e girilene kadar deploy davranışı değiştirmez.
 *  - Secret varsa token ZORUNLU ve hCaptcha'ya doğrulatılır. API ulaşılamazsa FAIL-CLOSED:
 *    bu bir güvenlik kapısı, kullanılabilirlik özelliği değil (kayıt nadir bir eylemdir;
 *    kullanıcı birazdan tekrar dener, bot ise geçemez).
 *  - İstemci tarafı widget `NEXT_PUBLIC_HCAPTCHA_SITEKEY` ile açılır (kayit/page.tsx);
 *    çift yarım yapılandırılırsa açılışta uyarı (lib/env.ts).
 */

const SITEVERIFY = "https://api.hcaptcha.com/siteverify";

export function hcaptchaEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.HCAPTCHA_SECRET?.trim());
}

export interface HcaptchaVerdict {
  ok: boolean;
  /** Neden (log için): disabled | missing-token | http-<kod> | network | hCaptcha error-codes */
  reason?: string;
}

export async function verifyHcaptcha(
  token: string | null | undefined,
  remoteIp?: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<HcaptchaVerdict> {
  const secret = process.env.HCAPTCHA_SECRET?.trim();
  if (!secret) return { ok: true, reason: "disabled" };
  if (!token) return { ok: false, reason: "missing-token" };

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetchImpl(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { ok: false, reason: `http-${res.status}` };
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (data.success === true) return { ok: true };
    return { ok: false, reason: (data["error-codes"] ?? []).join(",") || "failed" };
  } catch {
    return { ok: false, reason: "network" };
  }
}
