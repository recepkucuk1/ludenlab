import type { BolumId } from "./zaman.ts";

// Spec: "Bölümler" ve "Seslendirme metni". Ekran yazısı tek başına anlatır (film sessiz de izlenir).

export const MEB_PROGRAM = "Öğrenme Güçlüğü Olan Bireyler İçin Destek Eğitim Programı";

export type BolumMetni = {
  /** Büyük harf başlık; her eleman bir satır (satır kırılımı burada verilir). Başlığı olmayan bölümde boş. */
  baslik: string[];
  /** Başlık dışındaki ekran metinleri, okunma sırasıyla (animasyon sırası bölüm kodunda). */
  ekran: string[];
  /** Seslendirme satırı; TTS yazımıyla ("Luden Lab", "ludenlab nokta com"). */
  vo: string;
};

export const METIN: Record<BolumId, BolumMetni> = {
  kanca: {
    baslik: ["HER ÇOCUK", "AYRI."],
    ekran: ["Özel eğitimde"],
    vo: "Özel eğitimde her çocuk ayrı.",
  },
  yuk: {
    baslik: ["HER MATERYAL", "AYRI."],
    ekran: ["Evrak büyüdükçe masada\nçocuğa yer kalmıyor."],
    vo: "Her çocuğa ayrı materyal, ayrı plan, ayrı rapor. Evrak büyüdükçe masada çocuğa yer kalmıyor.",
  },
  donus: {
    baslik: [],
    ekran: ["Bu yükü tek başına\ntaşımak zorunda\ndeğilsin.", "01 Studio", "02 Atölye"],
    vo: "Bu yükü tek başına taşımak zorunda değilsin.",
  },
  studio: {
    baslik: ["STUDIO"],
    ekran: [
      "Dil ve konuşma alanında\nçalışan uzmanlar için.",
      "Hedef sesi seç;\nkelimeler görselleriyle\ngelsin.",
      "Öğrenme Kartı · Sosyal Hikaye · Artikülasyon ve 7 araç daha",
    ],
    vo: "Studio, dil ve konuşma alanında çalışan uzmanlar için. Hedef sesi seç, kelimeler görselleriyle gelsin.",
  },
  atolye: {
    baslik: ["ATÖLYE"],
    ekran: [
      "Öğrenme güçlüğü alanında\nçalışan uzmanlar için.",
      `MEB ${MEB_PROGRAM} · 172 hedef`,
      "Hedefini seç;\nseans planı taslağın\nhazırlansın.",
      "Son söz her zaman senin.",
      "Seans Planı · BEP & Rapor · Veli Mektubu ve 8 araç daha",
    ],
    vo: "Atölye, öğrenme güçlüğü alanında çalışan uzmanlar için. Hedefini seç, seans planı taslağın hazırlansın. Son söz her zaman senin.",
  },
  cocuk: {
    baslik: ["VAKTİN", "ÇOCUĞA", "KALSIN."],
    ekran: [],
    vo: "Vaktin çocuğa kalsın.",
  },
  kapanis: {
    baslik: ["HER ŞEY", "ÇOCUĞUN", "ETRAFINDA."],
    ekran: ["Özel eğitimde yapay zekâ destekli öğrenme yönetimi.", "Studio", "Atölye", "ludenlab.com"],
    vo: "Luden Lab. Her şey çocuğun etrafında. ludenlab nokta com.",
  },
};

/** Açılışta çocuğun hedefleri; Çocuk bölümünde onları karşılayan modülün rengiyle geri gelir. */
export const HEDEFLER = [
  { metin: "/r/ sesi", modul: "studio" },
  { metin: "okuma akıcılığı", modul: "atolye" },
  { metin: "sıra beklemek", modul: "studio" },
] as const;

/** Studio ve Atölye bölümlerinin etiketleri (içerik denetimi bunları da tarar). */
export const ETIKETLER = {
  studio: ["dil", "konuşma", "işitme"],
  studioKart: ["hedef ses: /r/", "görseliyle kelimeler"],
  atolye: ["modül", "bölüm", "hedef 3.1.2"],
  atolyeKart: ["MEB hedefi 3.1.2", "etkinlik akışı"],
  damga: ["TASLAK"],
} as const;

export const kelimeSayisi = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
