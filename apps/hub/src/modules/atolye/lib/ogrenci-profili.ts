import { z } from "zod";
import { KADEME, KADEME_KEYS } from "./bep";

/* Paylaşılan öğrenci profili omurgası — tüm yeni araçlar bunu `.extend()` eder,
   tüm prompt'lar `profilToPrompt()` ile aynı profil bloğunu basar.
   Client + server paylaşır (server-only kod yok). */

export const TANI_KEYS = [
  "disleksi",
  "diskalkuli",
  "disgrafi",
  "dehb_dikkat",
  "dehb_hiperaktif",
  "dehb_kombine",
] as const;
export type Tani = (typeof TANI_KEYS)[number];
export const TANI_LABEL: Record<Tani, string> = {
  disleksi: "Disleksi (okuma güçlüğü)",
  diskalkuli: "Diskalkuli (matematik güçlüğü)",
  disgrafi: "Disgrafi (yazma güçlüğü)",
  dehb_dikkat: "DEHB — dikkat eksikliği baskın",
  dehb_hiperaktif: "DEHB — hiperaktif/dürtüsel baskın",
  dehb_kombine: "DEHB — kombine tip",
};

export const GUCLUK_DUZEYI_KEYS = ["hafif", "orta", "belirgin"] as const;
export type GuclukDuzeyi = (typeof GUCLUK_DUZEYI_KEYS)[number];
export const GUCLUK_DUZEYI_LABEL: Record<GuclukDuzeyi, string> = {
  hafif: "Hafif",
  orta: "Orta",
  belirgin: "Belirgin",
};

export const ogrenciProfiliSchema = z.object({
  /** Öğrencinin adı soyadı (kimlik). */
  rumuz: z.string().trim().min(1, "Öğrenci adı gerekli").max(120),
  kademe: z.enum(KADEME_KEYS),
  yas: z.coerce.number().int().min(3).max(22).optional(),
  /** Eştanı yaygın (ör. disleksi + DEHB) → çoklu seçim. */
  taniProfili: z.array(z.enum(TANI_KEYS)).min(1, "En az bir güçlük alanı seçin"),
  guclukDuzeyi: z.enum(GUCLUK_DUZEYI_KEYS).default("orta"),
  gucluYonler: z.string().trim().max(500).optional(),
  ilgiAlanlari: z.string().trim().max(300).optional(),
  calisilanKazanim: z.string().trim().max(500).optional(),
});

export type OgrenciProfili = z.infer<typeof ogrenciProfiliSchema>;

/** Profili prompt'a gömülecek okunur Türkçe bloğa çevirir. */
export function profilToPrompt(p: OgrenciProfili): string {
  const tanilar = p.taniProfili.map((t) => TANI_LABEL[t]).join(", ");
  const yas = p.yas ? `, ${p.yas} yaş` : "";
  return [
    `- Öğrenci: ${p.rumuz}`,
    `- Kademe: ${KADEME[p.kademe]}${yas}`,
    `- Güçlük profili: ${tanilar}`,
    `- Güçlük düzeyi: ${GUCLUK_DUZEYI_LABEL[p.guclukDuzeyi]}`,
    p.gucluYonler ? `- Güçlü yönler: ${p.gucluYonler}` : null,
    p.ilgiAlanlari ? `- İlgi alanları: ${p.ilgiAlanlari}` : null,
    p.calisilanKazanim ? `- Çalışılan kazanım: ${p.calisilanKazanim}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
