// apps/hub/evals/tools/atolye/ilerleme-cizelgesi/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { AYRAC, TABLO } from "../../../lib/markdown";
import { lower } from "../../../lib/sharedChecks";

export interface IlerlemeBody {
  hedefMetni: string;
  mebHedefKod?: string;
  mebDavranisKodlari?: string[];
}

/* ── Bölüm regex'leri: TEK KAYNAK (adapter `sections` bunları kullanır) ──
   Prompt: "1. Hedefin gözlenebilir bileşenleri 2. Veri toplama çizelgesi 3. Ölçüm sıklığı ve yöntemi 4. İlerleme yorumlama notu". Başlıklar küçük harfe indirilir. */
export const ILERLEME_BOLUMLERI = {
  bilesen: /bileşen/,
  cizelge: /veri toplama|çizelge/,
  olcum: /ölçüm sıklığı|yöntem/,
  yorum: /yorumlama/,
} as const;
export const ILERLEME_BOLUM_LISTESI: RegExp[] = Object.values(ILERLEME_BOLUMLERI);

/* ── Tablo ayrıştırma ── */

const KACIS = "\u0000";
/** Hücreler: dış borular atılır; kaçışlı boru ("a \| b") hücreyi bölmez (yalnız bölünmeden korunur, hücre metni yer tutucu işaretiyle kalır: yalnız doluluk ölçülür). */
const hucreler = (satir: string): string[] =>
  satir
    .trim()
    .replace(/^\||\|$/g, "")
    .replace(/\\\|/g, KACIS)
    .split("|")
    .map((c) => c.trim());

interface Tablo {
  baslik: string[];
  govde: string[][];
}
/** Satırlardaki GFM tabloları: boru ile başlayan başlık satırı + (en az bir boru içeren) ayraç satırı + ardışık boru satırları (gövde). */
function tablolar(satirlar: string[]): Tablo[] {
  const out: Tablo[] = [];
  for (let i = 0; i + 1 < satirlar.length; i++) {
    if (!TABLO.test(satirlar[i]!) || AYRAC.test(satirlar[i]!) || !AYRAC.test(satirlar[i + 1]!) || !satirlar[i + 1]!.includes("|")) continue;
    const govde: string[][] = [];
    let k = i + 2;
    for (; k < satirlar.length && TABLO.test(satirlar[k]!); k++) govde.push(hucreler(satirlar[k]!));
    out.push({ baslik: hucreler(satirlar[i]!), govde });
    i = k - 1;
  }
  return out;
}

/* ── Sütunlar ──
   Prompt: "sütunlar: Tarih · Ölçüt/Gösterge · Sonuç (% veya sıklık) · Not". "not" yalnız sözcük olarak ("Not", "Notlar", "Notları", "Gözlem notu"; "Pozisyon", "Notasyon" değil). */
const ISTENEN = [/tarih/, /ölçüt|gösterge/, /sonuç/, /(?<!\p{L})not(?:lar[ıi]?|u)?(?!\p{L})/u];
const baslikAdi = (h: string) => lower(h);
const sutunSayisi = (t: Tablo) => ISTENEN.filter((re) => t.baslik.some((h) => re.test(baslikAdi(h)))).length;

/* ── Boş sonuç hücresi ──
   Prompt: "Birkaç örnek satır başlığı ekle ama SONUÇ hücrelerini BOŞ bırak" + "SONUÇ/veri ASLA uydurma". İki yoldan boştur:
   1) BOŞLUK İZİ taşıyor ve "/N" paydası dışında rakam taşımıyor: ardışık alt çizgi (`__`), "…"/"...", onay kutusu, boş parantez ya da doldurma talimatı ("doldurun" kökü "doldurunuz"u da kapsar). Hücredeki etiket sözcükleri
      önemsizdir ("__/10 sözcük", "___ kez / 5 fırsat", "Doğru: __ / Yanlış: __", "(doldurunuz)" boştur); bir rakam (payda dışı) varsa hücre doludur ("%80 …", "2/5 ___").
   2) İz yok ama yalnız yer tutucu işaretleri ve birim sözcükleri kalıyor: "—", "%", "( )", "[ ]", "% / sıklık", "% veya sıklık", "(boş)", "—/10".
   Diğer her şey doludur ("8/10", "%80", "yapıldı", "(ör. 8/10)", "yok": boş bırakılmamıştır). */
const BOSLUK_IZI = /_{2,}|…|\.{3}|☐|□|\(\s*\)|(?<!\p{L})(?:doldurun|yazınız|işaretleyin)/u;
const YER_TUTUCU = /[\s_.…\-–—*%/()[\]☐□▢○◯⬜?]/gu;
/** Hücrede ne kaydedileceğini söyleyen birim/etiket sözcükleri ("% / sıklık", "% veya sıklık", "___ kez") ve boşluk bildiren yer tutucu sözcükler ("(boş)", "(kaydedilecek)"): veri değil. */
const BIRIM = new Set(["sıklık", "kez", "defa", "yüzde", "oran", "sayı", "adet", "dk", "sn", "dakika", "saniye", "ve", "veya", "boş", "doldurulacak", "yazılacak", "kaydedilecek", "girilecek", "buraya"]);
function bosHucre(hucre: string): boolean {
  const t = lower(hucre).replace(/`/g, "");
  if (BOSLUK_IZI.test(t) && !/\d/.test(t.replace(/\/\s*\d+/g, " "))) return true; // "/N" paydası veri değildir
  const kalan = t.replace(/[_.…\-–—]+\s*\/\s*\d+/gu, "").replace(YER_TUTUCU, " ").trim(); // "—/10": pay yer tutucu, payda veri değil
  return kalan.split(/\s+/).filter(Boolean).every((k) => BIRIM.has(k));
}

/** Prompt: "Veri toplama çizelgesi — boş bir **Markdown tablo** (sütunlar: Tarih · Ölçüt/Gösterge · Sonuç (% veya sıklık) · Not). Birkaç örnek satır başlığı ekle ama SONUÇ hücrelerini BOŞ bırak".
    `tablo_var`: Markdown tablo var mı; `sutunlar`: istenen dört sütunun oranı; `sonuc_bos`: Sonuç hücresi boş satırların oranı. */
export function ilerlemeChecks(args: { body: IlerlemeBody; text: string }): ToolCheckOut {
  const adaylar = tablolar(args.text.split("\n"));
  if (!adaylar.length) return { scores: { tablo_var: 0, sutunlar: 0, sonuc_bos: 0 }, details: { tablo_var: 0 }, hard: [] };
  // Birden çok tablo olabilir (bileşenler, veri toplama, yöntem): istenen sütunların en çoğunu taşıyan (eşitlikte ilk) veri toplama çizelgesidir.
  const t = adaylar.reduce((en, a) => (sutunSayisi(a) > sutunSayisi(en) ? a : en));
  const sonucIdx = t.baslik.findIndex((h) => baslikAdi(h).includes("sonuç"));
  const sutunlar = sutunSayisi(t) / ISTENEN.length;
  const sonucBos = sonucIdx < 0 || !t.govde.length ? 0 : t.govde.filter((r) => bosHucre(r[sonucIdx] ?? "")).length / t.govde.length;
  const scores = { tablo_var: 1, sutunlar, sonuc_bos: sonucBos };
  return { scores, details: { satir: t.govde.length, ...scores }, hard: [] };
}
