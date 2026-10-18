// apps/hub/src/modules/studio/lib/prefill.ts
/**
 * Asistan → araç formu ön-doldurma taşıyıcısı. Araç sayfası `?prefill=<base64url(JSON)>` okur,
 * çözer, kendi zod şemasıyla süzer (bkz. toolSchemas.ts). Çözücü HİÇ fırlatmaz: bozuk/aşırı
 * girdi `null` döner ve sayfa boş formla açılır. Hem tarayıcıda hem Node'da çalışır
 * (TextEncoder/atob/btoa — Buffer yok).
 */
export const PREFILL_MAX_BYTES = 2048;

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) return null;
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  try {
    const bin = atob(b64);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

export function encodePrefill(obj: Record<string, unknown>): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(obj)));
}

export function decodePrefill(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  const bytes = fromBase64Url(raw);
  if (!bytes || bytes.byteLength === 0 || bytes.byteLength > PREFILL_MAX_BYTES) return null;
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}
