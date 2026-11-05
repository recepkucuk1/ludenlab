// apps/hub/src/lib/hedefDenetimi/schema.ts
import { z } from "zod";

/* Hedef denetçisi — ortak çekirdek sözleşmesi (spec §4.1–4.2). İstemci + sunucu paylaşır; server-only import YOK.
   Çağıran taraf hedef metnini RUMUZLAYIP verir (Studio `scrub`, Atölye `pseudonymizeDeep`); çekirdek ad bilmez. */

export const HEDEF_METNI_MAX = 600;
/** Uzman başına TR takvim günü başına denetim sayısı (iki modülde aynı). */
export const HEDEF_DENETIM_GUNLUK = 10;
export const HEDEF_DENETIM_SINIR_METNI = `Günlük hedef denetimi sınırı (${HEDEF_DENETIM_GUNLUK}) doldu; yarın devam edebilirsiniz.`;

export const hedefMetniSchema = z
  .string()
  .trim()
  .min(1, "Hedef boş olamaz")
  .max(HEDEF_METNI_MAX, `En fazla ${HEDEF_METNI_MAX} karakter`);

export const BILESENLER = ["davranis", "olcut", "kosul", "zaman", "taban"] as const;
export type Bilesen = (typeof BILESENLER)[number];
export const BILESEN_ETIKETI: Record<Bilesen, string> = {
  davranis: "Gözlenebilir davranış",
  olcut: "Ölçüt",
  kosul: "Koşul",
  zaman: "Zaman çerçevesi",
  taban: "Taban düzey",
};

export const DURUMLAR = ["var", "eksik", "belirsiz"] as const;
export type Durum = (typeof DURUMLAR)[number];

export const MEB_UYUM = ["uyumlu", "kismen", "uyumsuz"] as const;
export type MebUyum = (typeof MEB_UYUM)[number];
export const MEB_UYUM_ETIKETI: Record<MebUyum, string> = { uyumlu: "Uyumlu", kismen: "Kısmen uyumlu", uyumsuz: "Uyumsuz" };

/** Alan bütçeleri (karakter); doğrulayıcı önce kırpar, sonra şemadan geçirir. */
export const BUTCE = { alinti: 160, not: 200, soru: 160, ornek: 80, ozet: 300, soruSayisi: 3 } as const;

const bilesenSchema = z.object({
  durum: z.enum(DURUMLAR),
  /** Hedef metninden birebir parça; "var"da zorunlu (doğrulayıcı denetler). */
  alinti: z.string().trim().max(BUTCE.alinti).default(""),
  not: z.string().trim().max(BUTCE.not).default(""),
});
export type BilesenSonucu = z.infer<typeof bilesenSchema>;

export const denetimSonucuSchema = z.object({
  bilesenler: z.object({
    davranis: bilesenSchema,
    olcut: bilesenSchema,
    kosul: bilesenSchema,
    zaman: bilesenSchema,
    taban: bilesenSchema,
  }),
  mebUyum: z
    .object({ durum: z.enum(MEB_UYUM), not: z.string().trim().max(BUTCE.not).default("") })
    .nullable()
    .default(null),
  sorular: z
    .array(
      z.object({
        bilesen: z.enum(BILESENLER),
        soru: z.string().trim().min(1).max(BUTCE.soru),
        ornek: z.string().trim().max(BUTCE.ornek).default(""),
      }),
    )
    .max(BUTCE.soruSayisi)
    .default([]),
  ozet: z.string().trim().min(1).max(BUTCE.ozet),
});
export type DenetimSonucu = z.infer<typeof denetimSonucuSchema>;

export interface DenetimGirdisi {
  /** RUMUZLANMIŞ ve `temizle`den geçmiş hedef metni. */
  hedef: string;
  baglam?: {
    /** "İlkokul (1–4. sınıf), 8 yaş" — boşsa satır yazılmaz. */
    kademeYas?: string;
    /** Studio: üst MEB müfredat hedefi "1.1 Konuşma sırasında nefes kontrolünü sağlar". */
    ustHedef?: string;
    /** Atölye: `mebToPrompt()` çıktısı. Varsa `mebUyum` doldurulur. */
    meb?: string;
  };
}

/** C0 kontrol (NUL dahil), DEL, sıfır-genişlik, bidi, BOM (1b `composeText` kümesi). */
// eslint-disable-next-line no-control-regex -- bilinçli: kontrol karakterlerini söküyoruz
const GORUNMEZ = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

/** Hedef metni temizliği: görünmezler ve HTML/etiketler gider (`</hedef>` dahil), satır içi boşluk tekilleşir,
    satır sonları korunur (en çok bir boş satır). */
export function temizle(s: string): string {
  return s
    .replace(GORUNMEZ, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** "var" sayısı — puan DEĞİL, istemci "5 bileşenden N'i var" yazar. */
export const varSayisi = (s: DenetimSonucu): number => BILESENLER.filter((b) => s.bilesenler[b].durum === "var").length;

const SAYI_EKI = ["0'ı", "1'i", "2'si", "3'ü", "4'ü", "5'i"] as const;
export const varSayisiMetni = (n: number): string => `${BILESENLER.length} bileşenden ${SAYI_EKI[Math.max(0, Math.min(5, n))]} var`;

/** Nesnedeki tüm dizgileri dönüştürür (rumuz → ad geri çevirme; dizi/nesne korunur, diğer değerler dokunulmaz). */
export function dizgileriDonustur<T>(v: T, fn: (s: string) => string): T {
  if (typeof v === "string") return fn(v) as unknown as T;
  if (Array.isArray(v)) return v.map((x) => dizgileriDonustur(x, fn)) as unknown as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[k] = dizgileriDonustur(x, fn);
    return out as T;
  }
  return v;
}
