import { z } from "zod";

/* ÖÖB & DEHB destek eğitimi — form alanları (MEB çerçevesine hizalı).
   Client + server paylaşır; server-only kod (prompts) ayrı dosyada. */

export const KADEME_KEYS = ["okul_oncesi", "ilkokul_1_4", "ortaokul_5_8", "lise_9_uzeri"] as const;
export type Kademe = (typeof KADEME_KEYS)[number];
export const KADEME: Record<Kademe, string> = {
  okul_oncesi: "Okul öncesi (4–6 yaş)",
  ilkokul_1_4: "İlkokul (1–4. sınıf)",
  ortaokul_5_8: "Ortaokul (5–8. sınıf)",
  lise_9_uzeri: "Lise (9. sınıf ve üzeri)",
};

export const ALAN_KEYS = [
  "ogrenmeye_hazirlik",
  "okuma",
  "yazma",
  "matematik",
  "dikkat",
  "yurutucu_islev",
  "oz_duzenleme",
] as const;
export type Alan = (typeof ALAN_KEYS)[number];
export const ALAN: Record<Alan, string> = {
  ogrenmeye_hazirlik: "Öğrenmeye hazırlık",
  okuma: "Okuma (disleksi odağı)",
  yazma: "Yazma (disgrafi odağı)",
  matematik: "Matematik (diskalkuli odağı)",
  dikkat: "Dikkat ve odaklanma",
  yurutucu_islev: "Yürütücü işlevler",
  oz_duzenleme: "Öz-düzenleme ve davranış",
};

export const OUTPUT_KEYS = ["bep_hedef", "ilerleme_raporu", "aile_ozeti"] as const;
export type OutputType = (typeof OUTPUT_KEYS)[number];
export const OUTPUT: Record<OutputType, { label: string; desc: string }> = {
  bep_hedef: {
    label: "BEP hedef taslağı",
    desc: "Alan bazında uzun/kısa dönem ölçülebilir hedefler, yöntem ve ölçüt.",
  },
  ilerleme_raporu: {
    label: "İlerleme raporu",
    desc: "Ölçüm verilerine dayalı dönem ilerlemesi ve sonraki adımlar.",
  },
  aile_ozeti: {
    label: "Aile özeti",
    desc: "Aileye sade dilde özet, evde uygulama önerileri.",
  },
};

export const bepInputSchema = z.object({
  outputType: z.enum(OUTPUT_KEYS),
  /** Çocuğun gerçek adı DEĞİL — KVKK gereği kod/rumuz. */
  rumuz: z.string().trim().min(1, "Kod/rumuz gerekli").max(40),
  kademe: z.enum(KADEME_KEYS),
  yas: z.coerce.number().int().min(3).max(20).optional(),
  alanlar: z.array(z.enum(ALAN_KEYS)).min(1, "En az bir alan seçin"),
  gucluYonler: z.string().trim().max(2000).optional().default(""),
  guclukAlanlari: z
    .string()
    .trim()
    .min(1, "Güçlük alanları / mevcut düzey gerekli")
    .max(4000),
  olcumVerileri: z.string().trim().max(4000).optional().default(""),
  donem: z.string().trim().max(60).optional().default(""),
  ekNotlar: z.string().trim().max(2000).optional().default(""),
});

export type BepInput = z.infer<typeof bepInputSchema>;

/** Çıktının sonuna ve UI banner'ına basılan zorunlu uyarı. */
export const TASLAK_NOTU =
  "Bu metin yapay zekâ ile üretilmiş bir TASLAKTIR; uygulanmadan önce ilgili uzman tarafından gözden geçirilip onaylanmalıdır.";
