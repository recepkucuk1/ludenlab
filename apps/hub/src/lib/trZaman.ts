/* TR takvim günü/ayı (UTC+3, yaz saati yok) — Studio asistanı günlük/aylık kota ve hedef denetçisi günlük sınırı
   aynı başlangıcı kullanır. Eski yer: `@studio/lib/assistant/dailyCap` (yeniden dışa aktarır). */

/** TR saatiyle `now`'ın içinde bulunduğu günün başlangıcı, UTC Date olarak. */
export function trGunBaslangici(now: Date = new Date()): Date {
  const tr = new Date(now.getTime() + 3 * 3600_000);
  return new Date(Date.UTC(tr.getUTCFullYear(), tr.getUTCMonth(), tr.getUTCDate()) - 3 * 3600_000);
}

/** TR saatiyle `now`'ın içinde bulunduğu AYIN başlangıcı, UTC Date olarak (aylık kota sayımı). */
export function trAyBaslangici(now: Date = new Date()): Date {
  const tr = new Date(now.getTime() + 3 * 3600_000);
  return new Date(Date.UTC(tr.getUTCFullYear(), tr.getUTCMonth(), 1) - 3 * 3600_000);
}
