// apps/hub/evals/tools/atolye/bep/checks.ts
import { ALAN, type Alan } from "@atolye/lib/bep";
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { OLCUT, basligiNormalle, bulletsUnder, sections } from "../../../lib/markdown";
import { frac, lower, mean } from "../../../lib/sharedChecks";

export interface BepBody {
  alanlar: Alan[];
  gucluYonler?: string;
  guclukAlanlari: string;
  ekNotlar?: string;
  mebHedefKod?: string;
  mebDavranisKodlari?: string[];
}

/** Alt bölüm kalıpları (normalleştirilmiş başlıkta; `i` bayrağı YOK, başlık zaten küçük harf). */
export const ALT_KALIPLAR = [/uzun (dönem|vadeli)/, /kısa (dönem|vadeli)/, /yöntem|teknik|strateji/, /ölçme|değerlendirme/];
/** Kısa dönem hedefler toplanırken durulacak kardeş bölümler (`bulletsUnder`ın `kardes` parametresi). */
const KARDES_KALIPLAR = [...ALT_KALIPLAR, /iş ?birliği/];
/** `bulletsUnder`ın BEP kardeş listesiyle bağlanmış hâli (bepChecks ve BEP öz-testleri aynı yolu kullanır). */
export const bepBulletsUnder = (text: string, re: RegExp) => bulletsUnder(text, re, KARDES_KALIPLAR);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Alan başlığında aranacak anahtar: parantez atılmış etiketin ilk kelimesi; kısaysa (ör. "öz") ilk iki kelime. */
function alanAnahtari(a: Alan): string {
  const w = basligiNormalle(ALAN[a].replace(/\(.*?\)/g, "")).split(" ").filter(Boolean);
  return (w[0]?.length ?? 0) >= 4 ? w[0]! : w.slice(0, 2).join(" ");
}

/** BEP'e özgü kontroller (fabrikanın `checks` imzası). Çıktı varlığı, taslak notu (varlık + sonda), tanı cümlesi,
    bölüm yapısı (`yapi`), dil kuralı, rumuz ve yasak kalıp `atolyeAdapter`da ortaktır. `scores` talimata girer. */
export function bepChecks(args: { body: BepBody; text: string }): ToolCheckOut {
  const { body, text } = args;
  const alanSayisi = Math.max(1, body.alanlar.length);
  const secs = sections(text);
  // Alan başlığı: `##` ya da hiçbir `##` başlığının altında olmayan (üst düzey) kalın sözde başlık.
  const ilkIki = secs.findIndex((s) => s.level === 2);
  const alanBasliklari = secs
    .filter((s, i) => s.level === 2 || (s.level === "bold" && (ilkIki < 0 || i < ilkIki)))
    .map((s) => s.heading);
  const alanFrac = frac(body.alanlar, (a) => alanBasliklari.some((h) => h.includes(alanAnahtari(a))));
  const altFrac = mean(ALT_KALIPLAR.map((re) => Math.min(1, secs.filter((s) => re.test(s.heading)).length / alanSayisi)));

  const hedefler = bepBulletsUnder(text, ALT_KALIPLAR[1]!).map(lower);
  const olcutluHedef = hedefler.length ? frac(hedefler, (h) => OLCUT.test(h)) : 0;
  const hedefSayisiOk = hedefler.length >= 3 * alanSayisi && hedefler.length <= 6 * alanSayisi ? 1 : 0;

  const kodRe = body.mebHedefKod ? new RegExp(`(?<![\\d.])${esc(body.mebHedefKod.trim())}(?!\\d)`, "u") : null;
  // Kod verildiyse: kodu (ya da alt kodunu, ör. 3.2.5 → 3.2.5.1) taşıyan kısa dönem hedeflerin oranı.
  const mebKod = kodRe ? frac(hedefler, (h) => kodRe.test(h)) : null;
  const isbirligi = /iş\s?birliği/u.test(lower(text)) ? 1 : 0;

  return {
    scores: {
      alan_basliklari: alanFrac,
      alt_bolumler: altFrac,
      olcutlu_hedef: olcutluHedef,
      hedef_sayisi_ok: hedefSayisiOk,
      // Kod istenmediyse boşta 1 (1A ile aynı); ayrıntıda "—" kalır.
      meb_kod: mebKod ?? 1,
    },
    details: {
      alan_basliklari: alanFrac,
      alt_bolumler: altFrac,
      hedef_sayisi: hedefler.length,
      hedef_sayisi_ok: hedefSayisiOk,
      olcutlu_hedef: olcutluHedef,
      meb_kod: mebKod ?? "—",
      isbirligi,
    },
    hard: [],
  };
}
