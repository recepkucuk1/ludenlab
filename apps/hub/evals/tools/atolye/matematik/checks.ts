// apps/hub/evals/tools/atolye/matematik/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { baslikMi, TABLO } from "../../../lib/markdown";
import { bolumAgaci, etiketNormalle } from "../ortak";
import { aritmetikAyrinti } from "./aritmetik";

export { aritmetik } from "./aritmetik";

export interface MatematikBody {
  alanProfili: "sayi_hissi" | "sayi_buyukluk" | "islem_akiciligi" | "problem_cozme";
  kazanimKonu: string;
  somutlukDuzeyi: "somut" | "yari_somut" | "soyut";
  mebHedefKod?: string;
  mebDavranisKodlari?: string[];
}

/* ── Bölüm regex'leri: TEK KAYNAK (adapter `sections` bunları kullanır) ──
   Başlıklar küçük harfe indirilir ve `-`/`_` boşluğa çevrilir ("ön-koşul" → "ön koşul"); `cra` yalnız sözcük olarak ("ücra" değil). */

/** Prompt: "1. Kazanım + ön-koşul beceri kontrolü 2. CRA dizisi 3. Manipülatif/materyal yönergesi 4. Yaygın hata desenleri + müdahale ipucu 5. Kademeli alıştırma seti". */
export const MATEMATIK_BOLUMLERI = {
  kazanim: /kazanım|ön[ -]?koşul/,
  cra: /(?<!\p{L})cra(?!\p{L})|somut/u,
  manipulatif: /manipülatif|materyal/,
  hata: /hata(?!sız)|yanılgı/,
  alistirma: /alıştırma/,
} as const;
export const MATEMATIK_BOLUM_LISTESI: RegExp[] = Object.values(MATEMATIK_BOLUMLERI);

/* ── CRA dizisi ─────────────────────────────────────────────────────────────────────────────────────
   Prompt: "CRA dizisi — Somut etkinlik → Yarı-somut (görsel temsil) → Soyut, kademeli" + "Başlangıç somutluk düzeyi: X".
   Aşamalar başlık, kalın etiket, madde ya da tablo hücresi olarak yazılabilir; sıra CRA bölümünde (alt başlıklarıyla) aranır.
   Gereken dizi başlangıç düzeyinden başlar: somut → [somut, yarı, soyut]; yarı-somut → [yarı, soyut]; soyut → [soyut]. */

type Asama = "somut" | "yari" | "soyut";
const GEREKEN: Record<MatematikBody["somutlukDuzeyi"], Asama[]> = {
  somut: ["somut", "yari", "soyut"],
  yari_somut: ["yari", "soyut"],
  soyut: ["soyut"],
};

const CRA_KOKU = /(?<!\p{L})cra(?!\p{L})/u;
/** Kalın sözde başlık kökünde CRA bölümünün nerede bittiği: şablonun sonraki bölümleri. */
const CRA_DURAK = /^(?:manipülatif|materyal|yaygın|hata|kademeli|alıştırma)/;
const ASAMA_ADI = String.raw`(yar[ıi][\s\-‐‑–—]*somut|somut|soyut)`;
/** Başlıkta herhangi bir yerde ("Aşama 2: Görsel Temsil (Yarı-Somut)"). */
const ASAMA_SOZU = new RegExp(String.raw`(?<!\p{L})${ASAMA_ADI}(?!\p{L})`, "u");
/** Satırın BAŞINDA etiket: "Somut:", "Aşama 1: Somut", "Adım 2 (Yarı-somut)", "(1) Somut" (baştaki "1." / "2)" numarası `etiketNormalle`da atılır). */
const ASAMA_BASI = new RegExp(String.raw`^(?:(?:aşama|adım|basamak|evre|düzey|seviye|kademe|etkinlik)\s*\d*\s*[:.)\-–—]*\s*|\(\d+\)\s*)?\(?${ASAMA_ADI}(?!\p{L})`, "u");
/** Kısa ad + parantezli etiket + ayraç: "Görsel temsil (yarı-somut):", "Etkinlik 1 (Somut):". */
const ASAMA_PARANTEZ = new RegExp(String.raw`^[\p{L}\d][\p{L}\d\s/,'’-]{0,40}\(\s*${ASAMA_ADI}\s*\)\s*(?:[:.\-–—]|$)`, "u");

const asamaAdi = (s: string): Asama => (/^yar/u.test(s) ? "yari" : s === "somut" ? "somut" : "soyut");
const asamaBasligi = (heading: string): Asama | null => {
  const m = ASAMA_SOZU.exec(heading);
  return m ? asamaAdi(m[1]!) : null;
};
/** İçerik satırındaki aşama etiketleri. Tablo satırında her hücre ayrı taranır (sıra korunur: "| Aşama 1 | Somut | …", sütun başlıkları "| Somut | Yarı-somut | Soyut |");
    diğer satırlarda etiket satırın BAŞINDA olmalı (cümle ortasındaki "önce somut materyal…" aşama değildir). */
function asamaSatiri(satir: string): Asama[] {
  const parcalar = TABLO.test(satir) ? satir.split("|") : [satir];
  const out: Asama[] = [];
  for (const p of parcalar) {
    const g = etiketNormalle(p);
    const m = ASAMA_BASI.exec(g) ?? ASAMA_PARANTEZ.exec(g);
    if (m) out.push(asamaAdi(m[1]!));
  }
  return out;
}

function asamaSirasi(text: string): Asama[] {
  const sira: Asama[] = [];
  const agac = bolumAgaci(text, CRA_KOKU, CRA_DURAK);
  if (agac.length) {
    // Kök başlık ("CRA dizisi: Somut → Yarı-somut → Soyut") aşama değildir; yalnız altındaki satırlar ve alt başlıklar.
    const [kok, ...alt] = agac;
    for (const l of kok!.lines) sira.push(...asamaSatiri(l));
    for (const s of alt) {
      const b = asamaBasligi(s.heading);
      if (b) sira.push(b);
      for (const l of s.lines) sira.push(...asamaSatiri(l));
    }
  } else {
    // CRA başlığı yok (ad sapması): metnin tamamı; başlıklar başlık kuralıyla, diğer satırlar satır-başı kuralıyla.
    for (const l of text.split("\n")) {
      const b = baslikMi(l);
      if (!b) sira.push(...asamaSatiri(l));
      else {
        const a = asamaBasligi(b.heading);
        if (a) sira.push(a);
      }
    }
  }
  return sira;
}

export function matematikChecks(args: { body: MatematikBody; text: string }): ToolCheckOut {
  const { body, text } = args;
  const { toplam, dogru, yanlis } = aritmetikAyrinti(text);
  const sira = asamaSirasi(text);
  const gereken = GEREKEN[body.somutlukDuzeyi] ?? GEREKEN.somut;
  let k = 0;
  for (const a of sira) if (a === gereken[k]) k++;
  const scores = { aritmetik_dogru: toplam ? dogru / toplam : 1, cra: k === gereken.length ? 1 : 0 };
  return {
    scores,
    details: { ifade: toplam, dogru, yanlis_ifade: yanlis.slice(0, 5).join(" | "), cra_asamalar: sira.join(">"), ...scores },
    hard: [],
  };
}
