import { execFileSync, spawnSync } from "node:child_process";

// Basılmış videonun ses seviyesini sosyal medya düzeyine getirir; görüntüye dokunmaz.
// (LudenMain/video/scripts/ses-seviye.mjs'ten uyarlandı.) Tüm karışımın yüksekliği ölçülür (EBU R128), aradaki fark
// kadar tek ve sabit kazanç verilir, tepeler alimiter ile sınırlanır; bölümler arası denge korunur.
// Referanstan farkı: AAC kodlaması gerçek tepeyi limiter'ın üstüne çıkarabilir, limiter de yüksekliği düşürür.
// Bu yüzden çıktı yeniden ölçülür ve gerçek tepe ≤ TEPE_UST, yükseklik hedefin ±TOLERANS_LU'sunda olana dek düzeltilir.

export type Seviye = { I: number; tepe: number };
export type Deneme = { kazanc: number; limit: number };
export type SesSeviyeSonucu = {
  once: Seviye;
  sonra: Seviye;
  /** Son denemede uygulanan kazanç (dB) ve alimiter sınırı (doğrusal, 1 = 0 dBFS). */
  kazancDb: number;
  limit: number;
  /** Kaç kodlama yapıldı. */
  deneme: number;
  /** Yükseklik hedefin toleransı içinde mi (limiter yüksekliği hedefe çıkarmaya izin vermeyebilir). */
  hedefte: boolean;
};

/** Gerçek tepe bunun altında olmalı (dBFS): sosyal medya yeniden kodlamasında kırpılma payı. */
export const TEPE_UST = -1.0;
/** İlk limiter sınırı: 0,84 ≈ −1,5 dBFS (referans). */
export const LIMIT_ILK = 0.84;
export const TOLERANS_LU = 0.3;
const EN_COK_DENEME = 6;
const TEPE_PAYI_DB = 0.1;

/** ffmpeg ebur128 özetinden bütünleşik yükseklik (LUFS) ve gerçek tepe (dBFS). */
export function olcumuOku(stderr: string): Seviye {
  const ozet = stderr.split("Summary:")[1] ?? stderr;
  const I = Number(/Integrated loudness:\s+I:\s+(-?[\d.]+) LUFS/.exec(ozet)?.[1]);
  const tepe = Number(/True peak:\s+Peak:\s+(-?[\d.]+) dBFS/.exec(ozet)?.[1]);
  if (Number.isNaN(I) || Number.isNaN(tepe)) throw new Error("Ses ölçülemedi (ses akışı yok ya da sessiz)");
  return { I, tepe };
}

/**
 * Ölçülen çıktıya göre sonraki deneme; tamamsa null. Gerçek tepe aşımı önceliklidir (limiter aşım + pay kadar
 * kısılır, kazanç aynı kalır). Tepe tamamsa yükseklik farkı kadar kazanç eklenir.
 */
export function sonrakiDeneme(d: Deneme, sonra: Seviye, hedef: number): Deneme | null {
  if (sonra.tepe > TEPE_UST) {
    const kisma = sonra.tepe - TEPE_UST + TEPE_PAYI_DB;
    return { kazanc: d.kazanc, limit: d.limit * 10 ** (-kisma / 20) };
  }
  const fark = hedef - sonra.I;
  if (Math.abs(fark) <= TOLERANS_LU + 1e-9) return null;
  return { kazanc: d.kazanc + fark, limit: d.limit };
}

function olc(dosya: string): Seviye {
  const { stderr } = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", dosya, "-map", "0:a", "-af", "ebur128=peak=true", "-f", "null", "-"], {
    encoding: "utf8",
    maxBuffer: 1 << 26,
  });
  try {
    return olcumuOku(stderr);
  } catch (e) {
    throw new Error(`${(e as Error).message}: ${dosya}`);
  }
}

function kodla(girdi: string, cikti: string, d: Deneme) {
  execFileSync("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error", "-i", girdi,
    "-c:v", "copy",
    "-af", `volume=${d.kazanc.toFixed(2)}dB,alimiter=limit=${d.limit.toFixed(4)}:attack=5:release=60:level=0`,
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    "-movflags", "+faststart",
    cikti,
  ]);
}

/** `girdi`nin sesini `hedef` LUFS'a (varsayılan −16) getirip `cikti`ya yazar; görüntü kopyalanır. */
export function sesSeviyesi(girdi: string, cikti: string, hedef = -16): SesSeviyeSonucu {
  const once = olc(girdi);
  let d: Deneme = { kazanc: hedef - once.I, limit: LIMIT_ILK };
  for (let deneme = 1; ; deneme++) {
    kodla(girdi, cikti, d);
    const sonra = olc(cikti);
    const sonraki = sonrakiDeneme(d, sonra, hedef);
    const sonuc = (): SesSeviyeSonucu => ({ once, sonra, kazancDb: d.kazanc, limit: d.limit, deneme, hedefte: Math.abs(hedef - sonra.I) <= TOLERANS_LU + 1e-9 });
    if (!sonraki) return sonuc();
    if (deneme >= EN_COK_DENEME) {
      if (sonra.tepe > TEPE_UST) throw new Error(`gerçek tepe ${sonra.tepe} dBFS, ${deneme} denemede ${TEPE_UST} dBFS altına indirilemedi: ${cikti}`);
      return sonuc();
    }
    d = sonraki;
  }
}
