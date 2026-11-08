// apps/hub/src/lib/gorunmez.ts
/* Görünmez / yön karakterleri sökme — çocuk PII kapılarının ORTAK ön adımı.

   Bir ad yumuşak tire (U+00AD), sıfır-genişlik (U+200B…) ya da bidi işaretiyle
   bölünmüş gelirse rumuzlama onu "ad" olarak tanıyamaz ve gerçek ad modele sızar
   (2026-11-05 hedef denetçisi bulgusu: "Ar<U+00AD>da" → aliastan sonra "Arda").
   Bu yüzden rumuzlamadan ÖNCE her serbest metin bu kümeden arındırılır.
   Satır sonu (\n, \r) ve sekme (\t) korunur; görünür metin değişmez. */

/** C0 kontrol (NUL dahil), DEL, sıfır-genişlik, bidi, BOM, yumuşak tire, satır/paragraf ayracı.
    Aynı küme `@ludenlab/ai` `stripInvisible` içinde (rumuz kapısının kökü); bu kopya istemciye
    gidebilen `hedefDenetimi/schema.ts` için — @ludenlab/ai kökü sunucu istemcisini de dışa aktarır. */
// eslint-disable-next-line no-control-regex -- bilinçli: kontrol karakterlerini söküyoruz
export const GORUNMEZ = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u00AD\u2060\u180E\u2028\u2029]/g;

export function gorunmezSok(s: string): string {
  return s.replace(GORUNMEZ, "");
}

/** Nesne/dizi içindeki tüm dizgileri temizler; diğer türler aynen kalır. Girdi değişmez. */
export function gorunmezSokDeep<T>(value: T): T {
  if (typeof value === "string") return gorunmezSok(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => gorunmezSokDeep(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = gorunmezSokDeep(v);
    return out as T;
  }
  return value;
}
