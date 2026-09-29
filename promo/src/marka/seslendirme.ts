import { kelimeSayisi } from "./metin.ts";
import { VO_SURELERI } from "./voSureleri.ts";
import type { BolumId } from "./zaman.ts";

// Seslendirme ipuçları: her cümle, ekrandaki karşılığının açıldığı vuruşta başlar (spec "Ses").
// Bir bölümün ipuçları birleşince METIN[bolum].vo'yu verir; mp3'ler public/marka/vo/<id>.mp3 (`npm run marka:tts -- tam`).

export type VoIpucu = { id: string; bolum: BolumId; vurus169: number; metin: string };

export const ANLATICI = "Chris" as const;

export const VO_IPUCLARI: readonly VoIpucu[] = [
  { id: "kanca-1", bolum: "kanca", vurus169: 2, metin: "Özel eğitimde her çocuk ayrı." },
  { id: "yuk-1", bolum: "yuk", vurus169: 10, metin: "Her çocuğa ayrı materyal, ayrı plan, ayrı rapor." },
  { id: "yuk-2", bolum: "yuk", vurus169: 19, metin: "Evrak büyüdükçe masada çocuğa yer kalmıyor." },
  { id: "donus-1", bolum: "donus", vurus169: 26, metin: "Bu yükü tek başına taşımak zorunda değilsin." },
  { id: "studio-1", bolum: "studio", vurus169: 34, metin: "Studio, dil ve konuşma alanında çalışan uzmanlar için." },
  { id: "studio-2", bolum: "studio", vurus169: 42, metin: "Hedef sesi seç, kelimeler görselleriyle gelsin." },
  { id: "atolye-1", bolum: "atolye", vurus169: 54, metin: "Atölye, öğrenme güçlüğü alanında çalışan uzmanlar için." },
  { id: "atolye-2", bolum: "atolye", vurus169: 61, metin: "Hedefini seç, seans planı taslağın hazırlansın." },
  { id: "atolye-3", bolum: "atolye", vurus169: 67, metin: "Son söz her zaman senin." },
  { id: "cocuk-1", bolum: "cocuk", vurus169: 74, metin: "Vaktin çocuğa kalsın." },
  { id: "kapanis-1", bolum: "kapanis", vurus169: 89, metin: "Her şey çocuğun etrafında." },
  { id: "kapanis-2", bolum: "kapanis", vurus169: 94, metin: "Luden Lab. ludenlab nokta com." },
];

/** Anlatıcının ölçülmüş hızı (Chris, Yük denemesi: 15 kelime / 6,27 sn). */
const KELIME_SN = 2.4;

/** Ölçülmüş mp3 süresi (voSureleri.ts), yoksa kelime sayısından tahmin (sn). */
export const voSuresi = (ip: Pick<VoIpucu, "id" | "metin">) => VO_SURELERI[ip.id] ?? kelimeSayisi(ip.metin) / KELIME_SN;

/** 9:16 kesimin (30 sn) ipucu: vuruş 9:16 ızgarasındadır (1–50); bölüm vuruştan BOLUMLER_916 ile bulunur. */
export type VoIpucu916 = { id: string; vurus916: number; metin: string };

/** 16:9'daki aynı kaydı (aynı kimlik = aynı mp3, aynı metin) 9:16 vuruşunda yeniden kullanır. */
const ayniKayit = (id: string, vurus916: number): VoIpucu916 => {
  const ana = VO_IPUCLARI.find((i) => i.id === id);
  if (!ana) throw new Error(`9:16 ipucu: 16:9'da "${id}" kaydı yok`);
  return { id, vurus916, metin: ana.metin };
};

/**
 * 9:16 seslendirmesi: 16:9 kayıtlarının dördü aynen, üçü 9:16'ya özgü (kimliği "-916").
 * Cümleler ekrandaki karşılıklarının vuruşunda ya da hemen ardında başlar (ölçülmüş süreler voSureleri.ts'te).
 */
export const VO_IPUCLARI_916: readonly VoIpucu916[] = [
  ayniKayit("kanca-1", 2),
  ayniKayit("yuk-1", 8),
  ayniKayit("donus-1", 16),
  { id: "studio-916", vurus916: 22, metin: "Studio'da hedef sesi seç, kelimeler görselleriyle gelsin." },
  { id: "atolye-916", vurus916: 30, metin: "Atölye'de hedefini seç, taslağın hazırlansın; son söz senin." },
  ayniKayit("cocuk-1", 38),
  { id: "kapanis-916", vurus916: 45, metin: "Her şey çocuğun etrafında. Luden Lab." },
];

/** Üretilecek mp3'ler: iki kesimin kimliğe göre tekil birleşimi (16:9 sırası, ardından 9:16'ya özgüler). */
export const VO_KAYITLARI: readonly { id: string; metin: string }[] = [...VO_IPUCLARI, ...VO_IPUCLARI_916]
  .filter((ip, i, tum) => tum.findIndex((x) => x.id === ip.id) === i)
  .map(({ id, metin }) => ({ id, metin }));
