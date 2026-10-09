// apps/hub/evals/tools/studio/comm-board/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { frac, kayitlar, lower, mean, str } from "../../../lib/sharedChecks";

export interface CommBoardBody {
  boardType: "basic_needs" | "emotions" | "daily_routines" | "school" | "social" | "requests" | "custom";
  customCategory?: string;
  symbolCount: 4 | 6 | 9 | 12;
  layout: "grid" | "strip";
  textMode: "word_only" | "word_sentence";
  colorCoding: boolean;
}
type Rec = Record<string, unknown>;
/** Fitzgerald anahtarı (prompt sözleşmesi): kategori → İngilizce renk (arayüz `FITZGERALD_BG` yalnız bu anahtarları tanır). */
const FITZGERALD: Record<string, string> = { noun: "yellow", verb: "green", adjective: "blue", social: "pink", question: "orange", other: "white" };
const renkOf = (kategori: string): string | undefined => (Object.hasOwn(FITZGERALD, kategori) ? FITZGERALD[kategori] : undefined);
/** İngilizce görsel komutunda (prompt: visualPrompt İNGİLİZCE) Türkçe izi: Türkçeye özgü harf ya da İngilizcede
    bulunmayan sık işlev sözcüğü. Sezgiseldir: aksansız ve işlev sözcüğü taşımayan Türkçe komut ("su bardagi") kaçar. */
const TURKCE_HARF = /[çğıöşüÇĞİÖŞÜ]/u;
const TURKCE_SOZCUK = /(?<!\p{L})(?:bir|ve|ile|için|gibi|olan|dolu|ama|veya|bu)(?!\p{L})/u;
/** Kelime karşılaştırması: büyük/küçük harf, noktalama ve boşluk farkı yok sayılır. */
const sozcuk = (v: unknown) => lower(str(v)).replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();

export function commBoardChecks(args: { body: CommBoardBody; output: unknown; raw?: Rec | null; text?: string; alias?: string | null }): ToolCheckOut {
  const { body } = args;
  const output = args.output && typeof args.output === "object" && !Array.isArray(args.output) ? (args.output as Rec) : null;
  const cells = kayitlar(output?.cells);
  const hard: string[] = [];
  if (output && cells.length === 0) hard.push("hucre_yok");

  const hucreSayisi = cells.length === body.symbolCount ? 1 : 0;
  // Arayüz hücreleri `rows × cols` ızgarasına böler: bu çarpım sembol sayısını tutmazsa hücreler kesilir ya da boş satır kalır.
  const izgara = Number(output?.rows) * Number(output?.cols) === body.symbolCount ? 1 : 0;
  const pozisyon = cells.length ? cells.filter((c, i) => Number(c.position) === i + 1).length / cells.length : 0;
  // Görsel: Türkçe tanım (görsel üretilene kadar arayüzde görünen) + İngilizce üretim komutu (prompt: MUTLAKA).
  const gorselDolu = frac(cells, (c) => str(c.visualPrompt).trim().length > 0 && str(c.visualDescription).trim().length > 0);
  // Dil yalnız dolu komutlarda ölçülür (boşluk `gorsel_dolu`da cezalanır, iki puanda sayılmaz); hiç komut yoksa kanıtlanamaz: 0.
  const komutlar = cells.map((c) => str(c.visualPrompt).trim()).filter(Boolean);
  const gorselIngilizce = frac(komutlar, (p) => !TURKCE_HARF.test(p) && !TURKCE_SOZCUK.test(lower(p)));
  // Arayüz kategori ve rengi TAM anahtarla arar (`FITZGERALD_BG[color] ?? beyaz`): "Yellow" ya da "noun " panoda beyaz görünür;
  // bu yüzden büyük/küçük harf ve boşluk farkı kusurdur.
  const renkTutarli = !body.colorCoding ? 1 : frac(cells, (c) => {
    const beklenen = renkOf(str(c.category));
    return beklenen !== undefined && beklenen === str(c.fitzgeraldColor);
  });
  // Kelime + cümle: her hücrede kelimeden farklı bir cümle. Yalnız kelime: cümle alanı BOŞ (arayüz cümle varsa panoya basar).
  const cumleModu =
    body.textMode === "word_only"
      ? frac(cells, (c) => str(c.sentence).trim().length === 0)
      : frac(cells, (c) => str(c.sentence).trim().length > 0 && sozcuk(c.sentence) !== sozcuk(c.word));
  // Tekrarsızlık: her hücre ayrı bir sözcük taşımalı; boş sözcük kimseyi saymaz.
  const sozcukler = cells.map((c) => sozcuk(c.word)).filter(Boolean);
  const tekrarYok = cells.length ? new Set(sozcukler).size / cells.length : 0;
  const alanlar = mean(["title", "instructions", "expertNotes", "homeGuidance", "adaptations"].map((k) => (str(output?.[k]).trim() ? 1 : 0)));
  const scores = {
    hucre_sayisi: hucreSayisi,
    izgara,
    pozisyon,
    gorsel_dolu: gorselDolu,
    gorsel_ingilizce: gorselIngilizce,
    renk_tutarli: renkTutarli,
    cumle_modu: cumleModu,
    tekrar_yok: tekrarYok,
    alanlar,
  };
  return { scores: { ...scores, talimat: output ? mean(Object.values(scores)) : 0 }, details: { hucre: cells.length, ...scores }, hard };
}
