import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BOLUMLER_169, BOLUMLER_916, saniye, type Bolum } from "../src/marka/zaman.ts";
import { ORNEKLEME, muzikIzi, stereoWavYaz, type MuzikSecenekleri } from "./lib/muzik.ts";

/** Marka filmi müziği: public/marka/muzik-169.wav (60 sn) ve muzik-916.wav (30 sn). Ücretsiz, yereldir. */
const PROMO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const hedefler: { ad: string; bolumler: Bolum[]; secenekler: MuzikSecenekleri }[] = [
  { ad: "muzik-169.wav", bolumler: BOLUMLER_169, secenekler: { sonAkorVurusu: 93 } },
  // 9:16: son akor varsayılanı kapanış.ilk + 4 (v47).
  { ad: "muzik-916.wav", bolumler: BOLUMLER_916, secenekler: {} },
];

const db = (x: number) => (20 * Math.log10(x)).toFixed(1);

for (const { ad, bolumler, secenekler } of hedefler) {
  const iz = muzikIzi(bolumler, secenekler);
  const cikti = resolve(PROMO, "public/marka", ad);
  mkdirSync(dirname(cikti), { recursive: true });
  writeFileSync(cikti, stereoWavYaz(iz));

  let tepe = 0;
  for (let i = 0; i < iz.sol.length; i++) tepe = Math.max(tepe, Math.abs(iz.sol[i]), Math.abs(iz.sag[i]));
  const bolumRms = bolumler.map((b) => {
    const i0 = Math.round(saniye(b.ilk) * ORNEKLEME), i1 = Math.round(saniye(b.son + 1) * ORNEKLEME);
    let s = 0;
    for (let i = i0; i < i1; i++) s += iz.sol[i] ** 2 + iz.sag[i] ** 2;
    return `${b.id} ${db(Math.sqrt(s / (2 * (i1 - i0))))}`;
  });
  console.log(`${cikti} yazıldı (${(iz.sol.length / ORNEKLEME).toFixed(3)} sn, tepe ${db(tepe)} dBFS)`);
  console.log(`  bölüm RMS dBFS: ${bolumRms.join(" · ")}`);
}
