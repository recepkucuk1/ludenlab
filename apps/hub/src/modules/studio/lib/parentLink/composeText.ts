import { chipLabelLower, type ParentFeedbackBody } from "./schema";

/* Yanıt → gözlem metni (spec §6). Tek satır, HTML'siz, ≤1000 (not 300 olduğundan doğal olarak sığar; yine de kırp). */
const MAX = 1000;
/* \s; C0 kontrol (NUL dahil — Postgres text reddeder), DEL, sıfır genişlik, bidi, BOM karakterlerini yakalamaz: önce at. */
// eslint-disable-next-line no-control-regex
const GORUNMEZ = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
const tekSatir = (s: string) => s.replace(GORUNMEZ, "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

export function composeObservationText(b: ParentFeedbackBody): string {
  const parcalar: string[] = [];
  parcalar.push(b.days === 0 ? "Veli: bu hafta çalışılamadı." : `Veli: ${b.days} gün çalışıldı.`);
  if (b.easy.length) parcalar.push(`Kolay: ${b.easy.map(chipLabelLower).join(", ")}.`);
  if (b.hard.length) parcalar.push(`Zor: ${b.hard.map(chipLabelLower).join(", ")}.`);
  const not = b.note ? tekSatir(b.note) : "";
  if (not) parcalar.push(`Not: ${not}`);
  const t = parcalar.join(" ");
  return t.length > MAX ? t.slice(0, MAX - 1) + "…" : t;
}
