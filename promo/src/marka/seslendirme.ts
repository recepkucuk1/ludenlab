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
export const voSuresi = (ip: VoIpucu) => VO_SURELERI[ip.id] ?? kelimeSayisi(ip.metin) / KELIME_SN;
