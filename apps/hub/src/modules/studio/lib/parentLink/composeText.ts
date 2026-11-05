import { chipLabelLower, type ParentFeedbackBody } from "./schema";

/* Yanıt → gözlem metni (spec §6). Tek satır, HTML'siz, ≤1000 (not 300 olduğundan doğal olarak sığar; yine de kırp). */
const MAX = 1000;
const tekSatir = (s: string) => s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

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
