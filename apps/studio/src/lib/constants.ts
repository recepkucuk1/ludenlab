// Paylaşılan etiket ve renk sabitleri
// UI'da Tailwind class, PDF'de hex renk farklı olduğu için
// DIFFICULTY_COLOR_PDF CardPDFDocument içinde yerel kalır.

import type { BadgeColor } from "@/components/poster";

// ─── Tek kanonik kategori → renk/label tablosu ────────────────────────────────
// `workArea` (öğrenci) 3 değer kullanır (speech/language/hearing); `category`
// (üretilen kart) bunlara ek fluency + voice alabilir. Tek tabloyla ikisini
// de besliyoruz; 5 alanın hepsinde rengi tanımlı tutmak fluency/voice
// öğrencilerinde gri "soft" badge'i önler.
export const CATEGORY_META: Record<
  string,
  { label: string; cssVar: string; badge: BadgeColor }
> = {
  speech:   { label: "Konuşma",  cssVar: "var(--poster-yellow)", badge: "yellow" },
  language: { label: "Dil",       cssVar: "var(--poster-accent)", badge: "accent" },
  hearing:  { label: "İşitme",    cssVar: "var(--poster-blue)",   badge: "blue" },
  fluency:  { label: "Akıcılık",  cssVar: "var(--poster-pink)",   badge: "pink" },
  voice:    { label: "Ses",       cssVar: "var(--poster-green)",  badge: "green" },
};

export function getCategoryBadge(key: string | null | undefined): BadgeColor {
  if (!key) return "soft";
  return CATEGORY_META[key]?.badge ?? "soft";
}

export function getCategoryLabel(key: string | null | undefined, fallback?: string): string {
  if (!key) return fallback ?? "";
  return CATEGORY_META[key]?.label ?? fallback ?? key;
}

// Kısa etiket (badge, filtre butonları) — workArea (3 değer)
// CATEGORY_META'dan türetilir, ekstra anahtar eklenirse buradaki tip
// genişletilmeden çalışmaz; bu kasıtlı (workArea sadece 3 değer alır).
export const WORK_AREA_LABEL: Record<string, string> = {
  speech: CATEGORY_META.speech.label,
  language: CATEGORY_META.language.label,
  hearing: CATEGORY_META.hearing.label,
};

// Müfredat alt-alan etiketleri
export const AREA_LABELS: Record<string, string> = {
  speech: "Akıcılık Bozukluğu",
  language: "Dil",
  acquired_language: "Edinilmiş Dil",
  speech_sound: "Konuşma Sesi",
  motor_speech: "Motor Konuşma",
  resonance: "Rezonans",
  voice: "Ses",
  hearing: "İşitme Eğitimi",
  hearing_language: "Dil Eğitimi (İşitme)",
  hearing_social: "Sosyal İletişim",
  hearing_learning: "Öğrenmeye Destek",
  hearing_literacy: "Okuma ve Yazma",
  hearing_early_math: "Erken Matematik",
  hearing_math: "Matematik",
};

// Çalışma alanından izin verilen müfredat alanlarına mapping
export const WORK_AREA_FILTER: Record<string, string[]> = {
  speech:   ["speech", "speech_sound", "motor_speech", "resonance", "voice"],
  language: ["language", "acquired_language"],
  hearing:  ["hearing", "hearing_language", "hearing_social", "hearing_learning", "hearing_literacy", "hearing_early_math", "hearing_math"],
};

export const WORK_AREA_COLOR: Record<string, string> = {
  speech: "bg-[#107996]/10 text-[#107996]",
  language: "bg-[#F4B2A6]/40 text-[#692137]",
  hearing: "bg-[#F4AE10]/15 text-amber-900",
};

export const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Kolay",
  medium: "Orta",
  hard: "Zor",
};

// Tailwind sınıfları — sadece UI bileşenlerinde kullanılır
export const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  hard: "bg-red-100 text-red-700",
};

// Poster badge eşlemesi — UI'da DIFFICULTY_BADGE_COLOR yerine kullan
export const DIFFICULTY_BADGE_COLOR: Record<string, BadgeColor> = {
  easy: "green",
  medium: "yellow",
  hard: "pink",
};

export function getDifficultyBadge(key: string | null | undefined): BadgeColor {
  if (!key) return "soft";
  return DIFFICULTY_BADGE_COLOR[key] ?? "soft";
}

export const AGE_LABEL: Record<string, string> = {
  "3-6": "3–6 yaş",
  "7-12": "7–12 yaş",
  "13-18": "13–18 yaş",
  adult: "Yetişkin",
};

export const CARD_STATUS_LABEL: Record<string, string> = {
  not_started: "Başlanmadı",
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
};

export const CARD_STATUS_COLOR: Record<string, string> = {
  not_started: "bg-zinc-100 text-zinc-500",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
};

/**
 * Revenue dashboard veri toplama başlangıcı.
 *
 * Bu tarihten önce oluşturulmuş Subscription kayıtları admin gelir/churn/renewal
 * istatistiklerine **dahil edilmez** — kuruluş öncesi test/dev verisi metrikleri
 * çarpıtmasın diye. Tarih ileri taşınırsa eski sub'lar yine sayılmaz; geri
 * çekilirse o tarihten sonraki kayıtlar eklenir.
 *
 * Yalnızca `/admin/revenue` filtreler — users listesi, audit, webhooks tüm
 * veriyi gösterir.
 */
export const REVENUE_STATS_SINCE = new Date("2026-05-02T00:00:00.000Z");

export function calcAge(birthDate: string | null): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  return months > 0 ? `${years} yaş ${months} ay` : `${years} yaş`;
}
