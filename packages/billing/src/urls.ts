/* ============================================================
   Apex checkout + modül dönüş URL yardımcıları (merkezi model).
   Modül anahtarları: STUDIO | ATOLYE (BRY ayrı ürün → brytakip.com; checkout'ta yok).
   ============================================================ */

export type CheckoutModule = "STUDIO" | "ATOLYE";
export type CheckoutInterval = "MONTHLY" | "YEARLY";

const APEX_URL = "https://ludenlab.com";
const MODULE_BASE_URL: Record<CheckoutModule, string> = {
  STUDIO: "https://studio.ludenlab.com",
  ATOLYE: "https://atolye.ludenlab.com",
};

/** Modüllerin "abone ol" aksiyonları → apex checkout (P6). */
export function buildCheckoutUrl(opts: {
  module: CheckoutModule;
  code: string;
  interval: CheckoutInterval;
  apexBase?: string;
}): string {
  const base = (opts.apexBase || APEX_URL).replace(/\/$/, "");
  const q = new URLSearchParams({ module: opts.module, code: opts.code, interval: opts.interval });
  return `${base}/odeme?${q.toString()}`;
}

/** Ödeme sonrası kullanıcının döneceği modül subdomain URL'i. */
export function moduleReturnUrl(module: CheckoutModule, path?: string): string {
  // Studio/Atölye (Next) `/abonelik`'i sunar.
  const p = path ?? "/abonelik";
  return `${MODULE_BASE_URL[module]}${p}`;
}
