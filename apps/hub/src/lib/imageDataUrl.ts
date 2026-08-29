/**
 * Avatar data-URL doğrulaması — SİHİRLİ BAYT kontrolü (2026-08 denetimi #39).
 *
 * SORUN: doğrulama yalnız `data:image/png;` gibi bir ÖNEK karşılaştırmasıydı. Önek
 * istemci tarafından yazılır: `data:image/png;base64,<HTML/SVG/keyfi bayt>` sunucuyu
 * rahatça geçiyordu. Bu değer `Therapist.avatarUrl`'e yazılıp her yerde `<img src>` ile
 * gösterildiği için, saklanan içerik ile ilan edilen tür arasındaki fark gerçek bir
 * sorundur (tarayıcı sniffing'i, ileride bu URL'in başka bir bağlamda kullanılması).
 *
 * ÇÖZÜM: base64'ün ilk baytları GERÇEKTEN o formatın imzası mı, sunucuda kontrol edilir.
 * SVG kabul edilmez (script taşıyabilir) — zaten izinli listede yok.
 */
export type AvatarFormat = "png" | "jpeg" | "webp";

const PREFIX: Record<string, AvatarFormat> = {
  "data:image/png;base64,": "png",
  "data:image/jpeg;base64,": "jpeg",
  "data:image/jpg;base64,": "jpeg",
  "data:image/webp;base64,": "webp",
};

/** İlk baytlar gerçekten bu formatın imzası mı? */
function magicMatches(bytes: Uint8Array, format: AvatarFormat): boolean {
  if (format === "png") {
    // 89 50 4E 47 0D 0A 1A 0A
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return sig.every((b, i) => bytes[i] === b);
  }
  if (format === "jpeg") {
    // FF D8 FF
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  // webp: "RIFF" .... "WEBP"
  const riff = [0x52, 0x49, 0x46, 0x46];
  const webp = [0x57, 0x45, 0x42, 0x50];
  return riff.every((b, i) => bytes[i] === b) && webp.every((b, i) => bytes[8 + i] === b);
}

export type AvatarCheck =
  | { ok: true; format: AvatarFormat; bytes: number }
  | { ok: false; error: string };

export function validateAvatarDataUrl(dataUrl: unknown, maxBytes: number): AvatarCheck {
  if (typeof dataUrl !== "string" || !dataUrl) {
    return { ok: false, error: "Görsel gönderilmedi." };
  }

  const prefix = Object.keys(PREFIX).find((p) => dataUrl.startsWith(p));
  if (!prefix) {
    return { ok: false, error: "Sadece PNG, JPEG ve WebP formatları desteklenir" };
  }
  const format = PREFIX[prefix]!;
  const b64 = dataUrl.slice(prefix.length);

  // Boyutu ÇÖZMEDEN önce kontrol et — dev bir dizeyi belleğe açmayalım.
  const approxBytes = Math.floor((b64.length * 3) / 4);
  if (approxBytes > maxBytes) {
    return { ok: false, error: `Görsel ${Math.round(maxBytes / 1024)}KB'dan küçük olmalı (sıkıştırılmış)` };
  }

  // İmza için yalnız BAŞTAKİ birkaç baytı çöz (tamamını açmaya gerek yok).
  let head: Uint8Array;
  try {
    head = Uint8Array.from(Buffer.from(b64.slice(0, 32), "base64"));
  } catch {
    return { ok: false, error: "Görsel çözümlenemedi." };
  }
  if (head.length < 12 || !magicMatches(head, format)) {
    return { ok: false, error: "Dosya içeriği bildirilen görsel biçimiyle uyuşmuyor." };
  }

  return { ok: true, format, bytes: approxBytes };
}
