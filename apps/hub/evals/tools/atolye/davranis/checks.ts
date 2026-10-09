// apps/hub/evals/tools/atolye/davranis/checks.ts
import { ORTAM_KEYS } from "@atolye/lib/davranis";
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { AYRAC, TABLO, baslikMi } from "../../../lib/markdown";
import { bolumSatirlari, derinlik, olumluGecisler } from "../ortak";

export interface DavranisBody {
  hedefDavranis: string;
  ortam: (typeof ORTAM_KEYS)[number];
  siklikSure?: string;
  mebHedefKod?: string;
  mebDavranisKodlari?: string[];
}

/* ── Bölüm regex'leri: TEK KAYNAK (adapter `sections` bunları kullanır) ──
   Başlıklar küçük harfe indirilir ve `-`/`_` boşluğa çevrilir: "Öz-izleme" → "öz izleme". */

/** Prompt: "1. Hedef davranışın gözlenebilir/ölçülebilir tanımı … 8. Aile–okul–seans tutarlılık notu". */
export const DAVRANIS_BOLUMLERI = {
  tanim: /tanım/,
  /** "ABC analizi (Öncül → Davranış → Sonuç) — tablo" */
  abc: /abc|öncül/,
  /** Bare `işlev` DEĞİL: "Yerine koyma davranışı (aynı işlevi gören…)" başlığını da yakalardı. "İşlevsel Değerlendirme" = aynı bölüm. */
  islev: /işlev hipotez|işlevsel değerlendirme/,
  onleyici: /önleyici|antecedent|çevresel/,
  yerineKoyma: /yerine koyma/,
  pekistirme: /pekiştirme/,
  veri: /veri toplama|öz ?izleme/,
  tutarlilik: /tutarlılık|iş birliği/,
} as const;
export const DAVRANIS_BOLUM_LISTESI: RegExp[] = Object.values(DAVRANIS_BOLUMLERI);

/** GFM tablosu: başlık satırı + ayraç satırı (`|---|---|`) + en az bir gövde satırı. */
function tabloVar(satirlar: string[]): boolean {
  const satir = satirlar.filter((l) => TABLO.test(l));
  return satir.some((l) => AYRAC.test(l)) && satir.filter((l) => !AYRAC.test(l)).length >= 2;
}

/**
 * Cezalandırıcı/utandırıcı stratejiler (tr-TR küçük harfe indirilmiş metinde; eşleşme kelime sonuna uzatılır).
 * "cezasız" (ceza yok) ve "Cezayir" ceza sayılmaz; "TIME-OUT" tr-TR küçük harfte "tıme-out" olur (`[iı]`); tire/en tire/boşluk/bitişik yazım.
 */
const CEZA = new RegExp(
  [
    String.raw`(?<!\p{L})ceza(?!sız|yir)\p{L}*`,
    String.raw`(?<!\p{L})mola odası`,
    String.raw`(?<!\p{L})t[iı]me[\s\-–—]?out`,
    String.raw`teneffüsten (?:mahrum|yoksun)`,
    String.raw`(?:yoksun|mahrum) (?:bırak|et|ed)\p{L}*`,
    String.raw`utandır\p{L}*`,
    String.raw`sınıftan çıkar\p{L}*`,
    String.raw`tepki bedeli`,
  ].join("|"),
  "u",
);

/**
 * Mevcut durumu ANLATAN bölümler: tanım, ABC analizi, işlev hipotezi ("Sonuç: öğretmen sınıftan çıkarıyor" gözlemdir, öneri değil).
 * Dar: yalnız bu başlıklar. Strateji bölümleri (önleyici, yerine koyma, pekiştirme, veri, tutarlılık, çevresel) HİÇBİR ZAMAN atlanmaz;
 * başlıkta hem gözlem hem strateji sözcüğü varsa ("Veri toplama: ABC kayıt tablosu") taranır.
 */
const GOZLEM = /^.*(?<!\p{L})tanım|abc|öncül.*sonuç|işlev hipotez|işlevsel değerlendirme/u;
const STRATEJI = /önleyici|yerine koyma|pekiştirme|veri|tutarlılık|iş birliği|çevresel/;
const gozlemBasligi = (h: string) => GOZLEM.test(h) && !STRATEJI.test(h);

/** Gözlem bölümleri (alt başlıklarıyla) çıkarılmış metin: ceza taraması yalnız ÖNERİLEN stratejilere bakar. */
function oneriMetni(text: string): string {
  const out: string[] = [];
  let atla: number | null = null; // atlanan bölümün derinliği
  for (const satir of text.split("\n")) {
    const b = baslikMi(satir);
    if (b) {
      if (atla !== null && derinlik(b) > atla) continue;
      atla = gozlemBasligi(b.heading) ? derinlik(b) : null;
      if (atla !== null) continue;
    } else if (atla !== null) continue;
    out.push(satir);
  }
  return out.join("\n");
}

export function davranisChecks(args: { body: DavranisBody; text: string }): ToolCheckOut {
  // Prompt: "ABC analizi (Öncül → Davranış → Sonuç) — tablo": tablo ABC bölümünde (alt başlıkları dahil) aranır.
  const abc = bolumSatirlari(args.text, DAVRANIS_BOLUMLERI.abc);
  const abcTablo = abc && tabloVar(abc) ? 1 : 0;
  // Prompt: "Cezalandırıcı/utandırıcı strateji önerme". Yalnız önerilen stratejiler taranır (gözlem bölümleri hariç) ve olumsuzlama
  // terimin YANINDA aranır ("Time-out kullanılmaz", "cezasız pekiştirme", "utandırmadan verin" ihlal değil; "uymazsa mola odasına
  // gönderin", "Time-out uygulamadan önce uyarı verin" ihlal).
  const ceza = olumluGecisler(oneriMetni(args.text), CEZA);
  const scores = { abc_tablo: abcTablo, ceza_yok: ceza.length ? 0 : 1 };
  return { scores, details: { ...scores, ceza: ceza.join("|") }, hard: [] };
}
