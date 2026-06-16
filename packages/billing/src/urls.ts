/* ============================================================
   Apex checkout + modül dönüş URL yardımcıları (BİRLEŞİK app modeli).
   Modül anahtarları: STUDIO | ATOLYE (BRY ayrı ürün → brytakip.com; checkout'ta yok).
   Studio+Atölye artık ludenlab.com/studio + /atolye (PATH-based; subdomain TERK edildi).
   ============================================================ */

export type CheckoutModule = "STUDIO" | "ATOLYE";
export type CheckoutInterval = "MONTHLY" | "YEARLY";

const APEX_URL = "https://ludenlab.com";

/** Modül kök path'i (birleşik app). */
const MODULE_PATH: Record<CheckoutModule, string> = {
  STUDIO: "/studio",
  ATOLYE: "/atolye",
};

/** Modülün abonelik landing path'i (gerçek route: studio=/subscription, atolye=/abonelik). */
const MODULE_SUBSCRIPTION_PATH: Record<CheckoutModule, string> = {
  STUDIO: "/studio/subscription",
  ATOLYE: "/atolye/abonelik",
};

/** Modülün kök URL'i (landing "modüle git" linkleri). */
export function moduleBaseUrl(module: CheckoutModule, apexBase?: string): string {
  const base = (apexBase || APEX_URL).replace(/\/$/, "");
  return `${base}${MODULE_PATH[module]}`;
}

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

/**
 * Ödeme sonrası kullanıcının döneceği modül abonelik URL'i (birleşik app, path-based).
 * `path` verilirse apex'ten tam path olarak kullanılır; yoksa modülün abonelik landing'i.
 */
export function moduleReturnUrl(module: CheckoutModule, path?: string, apexBase?: string): string {
  const base = (apexBase || APEX_URL).replace(/\/$/, "");
  const p = path ?? MODULE_SUBSCRIPTION_PATH[module];
  return `${base}${p}`;
}
