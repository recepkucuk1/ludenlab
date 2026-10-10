// apps/hub/evals/tools/atolye/matematik/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { baslikMi } from "../../../lib/markdown";
import { lower } from "../../../lib/sharedChecks";
import { bolumAgaci, derinlik } from "../ortak";

export interface MatematikBody {
  alanProfili: "sayi_hissi" | "sayi_buyukluk" | "islem_akiciligi" | "problem_cozme";
  kazanimKonu: string;
  somutlukDuzeyi: "somut" | "yari_somut" | "soyut";
  mebHedefKod?: string;
  mebDavranisKodlari?: string[];
}

/* ── Aritmetik ──────────────────────────────────────────────────────────────────────────────────────
   Prompt: "Matematiksel olarak DOĞRU içerik üret; emin olmadığın sayısal örneği üretme (sayı/işlem uydurma)".
   Metindeki "ifade = sonuç" eşitlikleri küçük bir ayrıştırıcıyla doğrulanır. Amaç yanlış pozitif üretmemek: doğrulanamayan
   her şey (yüzde, birimli/değişkenli yazım, "kalan", kod/tarih, karma sayı) SAYILMAZ; yalnız açıkça aritmetik olanlar sayılır. */

type Jeton =
  | { k: "s"; v: number; dec: number; a: number; b: number }
  | { k: "o"; v: "+" | "-" | "*" | "/"; a: number; b: number }
  | { k: "(" | ")" | "=" | "d"; a: number; b: number };

/** 5.1.14 (MEB kodu), 12.05.2026 (tarih): üç ya da daha çok noktalı gruplar. Tam olarak binlik biçimiyse (1.000.000) sayıdır. */
const KOD = /\d+(?:\.\d+){2,}/y;
/** Türkçe binlik ayracı (1.500) ve ondalık virgülü (12.500,75). */
const BINLIK = /\d{1,3}(?:\.\d{3})+(?:,\d+)?(?![\d]|\.\d)/y;
const ONDALIK = /\d+[.,]\d+/y;
const TAMSAYI = /\d+/y;

const esles = (re: RegExp, s: string, i: number): string | null => {
  re.lastIndex = i;
  return re.exec(s)?.[0] ?? null;
};
const harf = (c: string | undefined) => c !== undefined && /\p{L}/u.test(c);
const rakam = (c: string | undefined) => c !== undefined && /\d/.test(c);

function jetonla(s: string): Jeton[] {
  const out: Jeton[] = [];
  for (let i = 0; i < s.length; ) {
    const c = s[i]!;
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (rakam(c)) {
      const kod = esles(KOD, s, i);
      const binlik = esles(BINLIK, s, i);
      if (binlik && (!kod || binlik.length >= kod.length)) {
        const [tam, ond] = binlik.replace(/\./g, "").split(",");
        out.push({ k: "s", v: Number(`${tam}${ond ? `.${ond}` : ""}`), dec: ond?.length ?? 0, a: i, b: i + binlik.length });
        i += binlik.length;
        continue;
      }
      if (kod) {
        out.push({ k: "d", a: i, b: i + kod.length }); // kod/tarih: aritmetik değil
        i += kod.length;
        continue;
      }
      const ond = esles(ONDALIK, s, i);
      if (ond) {
        out.push({ k: "s", v: Number(ond.replace(",", ".")), dec: ond.length - ond.search(/[.,]/) - 1, a: i, b: i + ond.length });
        i += ond.length;
        continue;
      }
      const tam = esles(TAMSAYI, s, i)!;
      out.push({ k: "s", v: Number(tam), dec: 0, a: i, b: i + tam.length });
      i += tam.length;
      continue;
    }
    const kapsa = (k: "+" | "-" | "*" | "/") => out.push({ k: "o", v: k, a: i, b: i + 1 });
    if (c === "+") kapsa("+");
    else if ("−–—-".includes(c)) kapsa("-");
    else if ("×·⋅".includes(c)) kapsa("*");
    else if (c === "÷" || c === "/") kapsa("/");
    // x/X çarpma yalnız harflerle çevrili değilse ("Max", "box", "2x + 3" değişkenleri ayrıştırmada elenir); ":" yalnız rakamlar arasında bitişikse (12:3).
    else if ((c === "x" || c === "X") && !harf(s[i - 1]) && !harf(s[i + 1])) kapsa("*");
    else if (c === ":" && rakam(s[i - 1]) && rakam(s[i + 1])) kapsa("/");
    else if (c === "(" || c === ")") out.push({ k: c, a: i, b: i + 1 });
    else if (c === "=") out.push({ k: "=", a: i, b: i + 1 }); // "<=", ">=", "!=", "==", "=>": komşu işaret/"=" jetonu bitişik aritmetik koşuyu keser, eşitlik doğrulanmaz
    else out.push({ k: "d", a: i, b: i + 1 });
    i++;
  }
  return out;
}

const ARITMETIK_JETON = new Set(["s", "o", "(", ")"]);
const islecMi = (j: Jeton) => j.k === "o";

/** Jeton dizisinin TAMAMI geçerli bir ifadeyse değeri, değilse null. Öncelik: × ÷ sonra + −; parantez; bitişik ("-5") tekli eksi. */
function ayristir(t: Jeton[]): number | null {
  let i = 0;
  const carpan = (): number | null => {
    const j = t[i];
    if (!j) return null;
    if (j.k === "o" && j.v === "-") {
      const n = t[i + 1];
      if (!n || (n.k !== "s" && n.k !== "(") || n.a !== j.b) return null; // yalnız "-5" (bitişik) tekli eksi
      i++;
      const v = carpan();
      return v === null ? null : -v;
    }
    if (j.k === "s") {
      i++;
      return j.v;
    }
    if (j.k === "(") {
      i++;
      const v = ifade();
      if (v === null || t[i]?.k !== ")") return null;
      i++;
      return v;
    }
    return null;
  };
  const terim = (): number | null => {
    let v = carpan();
    if (v === null) return null;
    for (let j = t[i]; j && j.k === "o" && (j.v === "*" || j.v === "/"); j = t[i]) {
      i++;
      const r = carpan();
      if (r === null) return null;
      v = j.v === "*" ? v * r : v / r; // 0'a bölme Infinity/NaN: sayısal sonuç yok → yanlış sayılır
    }
    return v;
  };
  const ifade = (): number | null => {
    let v = terim();
    if (v === null) return null;
    for (let j = t[i]; j && j.k === "o" && (j.v === "+" || j.v === "-"); j = t[i]) {
      i++;
      const r = terim();
      if (r === null) return null;
      v = j.v === "+" ? v + r : v - r;
    }
    return v;
  };
  const v = ifade();
  return v !== null && i === t.length ? v : null;
}

/** Yazılan sonuç ile hesaplanan eşit mi? Ondalıklı sonuçta ("10 ÷ 3 = 3,33") yazılan basamağa yuvarlama ya da kırpma kabul edilir. */
function esit(hesap: number, yazilan: number, ondalik: number): boolean {
  if (!Number.isFinite(hesap)) return false;
  const tol = 1e-9 * Math.max(1, Math.abs(yazilan));
  if (Math.abs(hesap - yazilan) <= tol) return true;
  if (ondalik === 0) return false;
  const k = 10 ** ondalik;
  return Math.abs(Math.round(hesap * k) / k - yazilan) <= tol || Math.abs(Math.trunc(hesap * k) / k - yazilan) <= tol;
}

interface Esitlik {
  metin: string;
  dogru: boolean;
}

const KALAN = /^\s*[,;(\-–—]?\s*kalan/u;

/** Bir satırdaki doğrulanabilir "ifade = ifade" eşitlikleri. `=`in solu ve sağı HEMEN bitişik aritmetik jetonlardır (araya sözcük girerse
    "1 saat = 60 dk", "5 elma + 3 elma = 8 elma" gibi birimli yazımlar doğrulanmaz). */
function esitlikler(satir: string): Esitlik[] {
  const t = jetonla(satir);
  const out: Esitlik[] = [];
  for (let e = 0; e < t.length; e++) {
    if (t[e]!.k !== "=") continue;
    // Sol: "=" öncesindeki bitişik aritmetik jetonların en uzun GEÇERLİ soneki.
    let j = e - 1;
    while (j >= 0 && ARITMETIK_JETON.has(t[j]!.k)) j--;
    const kos = t.slice(j + 1, e);
    let p = 0;
    let sol: number | null = null;
    for (; p < kos.length; p++) {
      sol = ayristir(kos.slice(p));
      if (sol !== null) break;
    }
    if (sol === null) continue;
    const lhs = kos.slice(p);
    // Geçerli sonekten önce atılan kısım sayı/işlemle bitiyorsa belirsiz ("1 1/2 + 2 = …" karma sayı); ")" ve "(" liste numarası/açılış parantezidir.
    const atilan = kos[p - 1];
    if (atilan && (atilan.k === "s" || atilan.k === "o")) continue;
    // Sol uç bir harfe/yüzdeye/ondalık ayracına bitişikse ("x12", "%20 × 5") değişken ya da yüzdedir.
    if (/[\p{L}\d%.,²³]/u.test(satir[lhs[0]!.a - 1] ?? " ")) continue;
    // Sağ: "=" sonrası bitişik aritmetik jetonların en uzun GEÇERLİ öneki.
    let r = e + 1;
    while (r < t.length && ARITMETIK_JETON.has(t[r]!.k)) r++;
    const sag = t.slice(e + 1, r);
    let q = sag.length;
    let sagDeger: number | null = null;
    for (; q > 0; q--) {
      sagDeger = ayristir(sag.slice(0, q));
      if (sagDeger !== null) break;
    }
    if (sagDeger === null) continue;
    const rhs = sag.slice(0, q);
    const sonraki = t[e + 1 + q];
    if (sonraki && (sonraki.k === "s" || sonraki.k === "o" || sonraki.k === "(")) continue; // sonuç sürüyor ("= 3 1/2", "= 4x")
    if (sonraki?.k === "d" && satir[sonraki.a] === "%") continue; // "= 12%"
    if (KALAN.test(lower(satir.slice(rhs[q - 1]!.b)))) continue; // "17 ÷ 5 = 3 kalan 2"
    if (!lhs.some(islecMi) && !rhs.some(islecMi)) continue; // "1 = 1", "60 = 60": ifade değil
    const ondalik = rhs.length === 1 && rhs[0]!.k === "s" ? rhs[0]!.dec : 0;
    let dogru = esit(sol, sagDeger, ondalik);
    // "Örnek 1 – 12 + 7 = 19": baştaki küçük tam sayı + eksi liste etiketi olabilir; etiketsiz kalan ifade doğruysa doğru sayılır.
    const [n, ek] = [lhs[0]!, lhs[1]];
    if (!dogru && n.k === "s" && Number.isInteger(n.v) && n.v <= 30 && ek?.k === "o" && ek.v === "-" && lhs.slice(2).some(islecMi)) {
      const etiketsiz = ayristir(lhs.slice(2));
      dogru = etiketsiz !== null && esit(etiketsiz, sagDeger, ondalik);
    }
    out.push({ metin: satir.slice(lhs[0]!.a, rhs[q - 1]!.b), dogru });
  }
  return out;
}

/** Yaygın hata desenleri bölümü: öğrencinin YANLIŞ yanıtını örnek göstermek o bölümün işidir ("38 + 47 = 715 yazar"). `hatasız` hariç. */
const HATA_BOLUMU = /hata(?!sız)/;
/** Satır düzeyinde hata/yanlış işareti: öğrenci hatası ya da kasıtlı yanlış örnek anlatılıyor. */
const HATA_ISARETI = /yanlış|hata(?!sız)\p{L}*|[✗✘✖❌]|doğru değil/u;

/** Doğrulanacak satırlar: hata bölümleri ve hata/yanlış işaretli satırlar atılır; madde işaretleri ve vurgu işaretleri temizlenir. */
function ifadeSatirlari(text: string): string[] {
  const out: string[] = [];
  let atla: number | null = null; // atlanan bölümün derinliği
  for (const satir of text.split("\n")) {
    const b = baslikMi(satir);
    if (b) {
      if (atla !== null && derinlik(b) > atla) continue;
      atla = HATA_BOLUMU.test(b.heading) ? derinlik(b) : null;
      if (atla !== null) continue;
    } else if (atla !== null) continue;
    if (HATA_ISARETI.test(lower(satir))) continue;
    out.push(
      satir
        .replace(/^\s*[-*+•–—]\s+/, "") // "- 12 + 7 = 19": madde işareti eksi değildir
        .replace(/(?<=\d)\s*\*\s*(?=\d)/g, " × ") // "3*4": çarpma
        .replace(/\*+/g, ""), // **kalın**, *italik*
    );
  }
  return out;
}

export interface AritmetikAyrinti {
  toplam: number;
  dogru: number;
  yanlis: string[];
}

export function aritmetikAyrinti(text: string): AritmetikAyrinti {
  const hepsi = ifadeSatirlari(text).flatMap(esitlikler);
  return { toplam: hepsi.length, dogru: hepsi.filter((x) => x.dogru).length, yanlis: hepsi.filter((x) => !x.dogru).map((x) => x.metin) };
}

/** Metindeki doğrulanabilir "a op b = c" (zincir, parantez, ondalık, kesir dahil) eşitliklerinin sayısı ve doğru olanları. */
export function aritmetik(text: string): { toplam: number; dogru: number } {
  const { toplam, dogru } = aritmetikAyrinti(text);
  return { toplam, dogru };
}

/* ── CRA dizisi ─────────────────────────────────────────────────────────────────────────────────────
   Prompt: "CRA dizisi — Somut etkinlik → Yarı-somut (görsel temsil) → Soyut, kademeli" + "Başlangıç somutluk düzeyi: X".
   Aşamalar başlık, kalın etiket, madde ya da tablo satırı olarak yazılabilir; sıra CRA bölümünde (alt başlıklarıyla) aranır.
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
const ASAMA_SOZU = /(?<!\p{L})(yar[ıi][\s\-‐‑–—]*somut|somut|soyut)(?!\p{L})/u;
const ASAMA_BASI = /^(?:(?:aşama|adım|basamak|evre|düzey|seviye|kademe)\s*\d*\s*[:.)\-–—]*\s*|\(?\d+[.)]\s*)?\(?(yar[ıi][\s\-‐‑–—]*somut|somut|soyut)(?!\p{L})/u;

const asamaAdi = (s: string): Asama => (/^yar/u.test(s) ? "yari" : s === "somut" ? "somut" : "soyut");
const asamaBasligi = (heading: string): Asama | null => {
  const m = ASAMA_SOZU.exec(heading);
  return m ? asamaAdi(m[1]!) : null;
};
/** İçerik satırı bir aşama etiketiyle BAŞLIYORSA (madde/numara/kalın işaretleri atıldıktan sonra) o aşama. */
const asamaSatiri = (satir: string): Asama | null => {
  const m = ASAMA_BASI.exec(lower(satir.replace(/[*_`]/g, "")).replace(/^[\s|#>•+-]+/, ""));
  return m ? asamaAdi(m[1]!) : null;
};

function asamaSirasi(text: string): Asama[] {
  const sira: Asama[] = [];
  const ekle = (a: Asama | null) => a && sira.push(a);
  const agac = bolumAgaci(text, CRA_KOKU, CRA_DURAK);
  if (agac.length) {
    // Kök başlık ("CRA dizisi: Somut → Yarı-somut → Soyut") aşama değildir; yalnız altındaki satırlar ve alt başlıklar.
    const [kok, ...alt] = agac;
    for (const l of kok!.lines) ekle(asamaSatiri(l));
    for (const s of alt) {
      ekle(asamaBasligi(s.heading));
      for (const l of s.lines) ekle(asamaSatiri(l));
    }
  } else {
    // CRA başlığı yok (ad sapması): metnin tamamı; başlıklar başlık kuralıyla, diğer satırlar satır-başı kuralıyla.
    for (const l of text.split("\n")) {
      const b = baslikMi(l);
      ekle(b ? asamaBasligi(b.heading) : asamaSatiri(l));
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
