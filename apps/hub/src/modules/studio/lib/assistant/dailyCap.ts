// apps/hub/src/modules/studio/lib/assistant/dailyCap.ts

/** Öğrenci başına TR takvim günü başına en çok gözlem (asistan çağrısı) sayısı. */
export const OBSERVATIONS_PER_DAY = 10;

/** TR saatiyle (UTC+3, yaz saati yok) `now`'ın içinde bulunduğu günün başlangıcı, UTC Date olarak. */
export function trGunBaslangici(now: Date = new Date()): Date {
  const tr = new Date(now.getTime() + 3 * 3600_000);
  return new Date(Date.UTC(tr.getUTCFullYear(), tr.getUTCMonth(), tr.getUTCDate()) - 3 * 3600_000);
}
