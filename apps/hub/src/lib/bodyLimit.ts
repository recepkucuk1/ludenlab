/**
 * İstek gövdesi boyut sınırı (2026-08 denetimi #29).
 *
 * SORUN: hiçbir uçta gövde sınırı yoktu — `await req.json()` gövdenin TAMAMINI belleğe
 * alır, Zod ancak ondan SONRA çalışır. Tek Node süreci (Hostinger) için bu iki maliyet
 * demek: (a) bellek/DoS — birkaç eşzamanlı dev gövde süreci düşürebilir, (b) token —
 * sınırsız serbest-metin alanları doğrudan prompt'a girdiği için girdi boyutu = LLM faturası.
 *
 * İKİ KADEME:
 *   1. `contentLengthExceeds` — middleware'de, TEK yerde, tüm uçlar için ucuz ön eleme.
 *   2. `readJsonBody` — pahalı AI uçlarında akışı SAYARAK okur; `content-length` yoksa
 *      (chunked) da korur. Sınır aşılınca akış iptal edilir, gövde belleğe alınmaz.
 */
/**
 * AI/prompt uçları için sıkı sınır. Bu uçlarda gövde = prompt girdisi = LLM faturası.
 * En büyük meşru form gövdesinin kat kat üstü.
 */
export const MAX_JSON_BODY_BYTES = 64 * 1024; // 64 KB

/**
 * Middleware'in TÜM uçlara uyguladığı üst tavan — DoS emniyet supabı, "sıkı sınır" değil.
 *
 * NEDEN 64 KB DEĞİL: avatar uçları 300 KB'lık görseli data-URL (base64) olarak JSON içinde
 * alır → gövde ~400 KB. Global 64 KB koysaydık AVATAR YÜKLEME KIRILIRDI. Genel tavanı
 * meşru en büyük gövdenin üstünde tutup, sıkı sınırı gerçekten pahalı olan AI uçlarında
 * `readJsonBody(req)` ile uyguluyoruz — böylece bir özel-durum listesi bakmaya gerek kalmıyor.
 */
export const MAX_REQUEST_BODY_BYTES = 512 * 1024; // 512 KB

/** Middleware ön elemesi: bildirilen boyut sınırı aşıyor mu? (başlık yoksa `false`) */
export function contentLengthExceeds(
  header: string | null | undefined,
  maxBytes: number = MAX_REQUEST_BODY_BYTES,
): boolean {
  if (!header) return false; // chunked / gövdesiz — akış kademesi ilgilenir
  const declared = Number(header);
  return Number.isFinite(declared) && declared > maxBytes;
}

export type JsonBodyResult =
  | { ok: true; data: unknown }
  | { ok: false; status: 400 | 413; error: string };

/**
 * Gövdeyi sınırı AŞMADAN okur ve JSON'a çevirir.
 * `content-length` yalanlanabilir/eksik olabilir diye baytlar okunurken de sayılır.
 */
export async function readJsonBody(
  req: Request,
  maxBytes: number = MAX_JSON_BODY_BYTES,
): Promise<JsonBodyResult> {
  if (contentLengthExceeds(req.headers.get("content-length"), maxBytes)) {
    return { ok: false, status: 413, error: "İstek gövdesi çok büyük." };
  }

  const reader = req.body?.getReader();
  if (!reader) return { ok: false, status: 400, error: "Geçersiz istek gövdesi." };

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {}); // gerisini okuma — bellek ayırma
      return { ok: false, status: 413, error: "İstek gövdesi çok büyük." };
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }

  try {
    return { ok: true, data: JSON.parse(new TextDecoder().decode(merged)) };
  } catch {
    return { ok: false, status: 400, error: "Geçersiz istek gövdesi." };
  }
}
