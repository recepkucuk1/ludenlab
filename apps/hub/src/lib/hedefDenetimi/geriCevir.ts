import { alintiGecerli } from "./dogrula";
import { BILESENLER, dizgileriDonustur, type DenetimSonucu } from "./schema";

/* Rumuzlu sonucu gerçek ada çevirme (spec §15 "alıntı başına ad geri çevirme"). Atölye ve Studio rotaları ortak kullanır.
   Alıntı, uzmanın yazdığı hedefin parçası kalmalı: tam ad çevirisi hedefte geçmiyorsa ("Arda Yılmaz doğru okur" ama hedef
   "Arda doğru okur") ad parçası çevirileri denenir; `alintiGecerli(gercekHedef, aday)` olan ilk aday alınır. */

export function sonucuGeriCevir(
  rumuzlu: DenetimSonucu,
  gercekHedef: string,
  cevir: (s: string) => string,
  parcaCeviriciler: ((s: string) => string)[] = [],
): DenetimSonucu {
  const sonuc = dizgileriDonustur(rumuzlu, cevir);
  for (const k of BILESENLER) {
    const a = rumuzlu.bilesenler[k].alinti;
    if (!a) continue;
    const adaylar = [cevir(a), ...parcaCeviriciler.map((f) => f(a))];
    sonuc.bilesenler[k].alinti = adaylar.find((c) => alintiGecerli(gercekHedef, c)) ?? adaylar[0]!;
  }
  return sonuc;
}

/** Ad ≥2 kelimeyse her kelime için ayrı `{real: parça, alias}` eşlemesiyle çevirici; tek kelimede boş. `rehydrate` = `@ludenlab/ai` `rehydrateText`. */
export function adParcaCeviricileri(
  real: string,
  alias: string,
  rehydrate: (s: string, m: { real: string; alias: string }[]) => string,
): ((s: string) => string)[] {
  const parcalar = real.split(/\s+/).filter(Boolean);
  if (parcalar.length < 2) return [];
  return parcalar.map((p) => (s: string) => rehydrate(s, [{ real: p, alias }]));
}
