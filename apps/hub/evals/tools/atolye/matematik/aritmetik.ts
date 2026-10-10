// apps/hub/evals/tools/atolye/matematik/aritmetik.ts
import { baslikMi, derinlik } from "../../../lib/markdown";
import { lower } from "../../../lib/sharedChecks";

/* ── Aritmetik doğrulayıcı ──────────────────────────────────────────────────────────────────────────
   Prompt: "Matematiksel olarak DOĞRU içerik üret; emin olmadığın sayısal örneği üretme (sayı/işlem uydurma)".
   Metindeki "ifade = sonuç" eşitlikleri küçük bir ayrıştırıcıyla doğrulanır. Amaç yanlış pozitif üretmemek: doğrulanamayan her şey
   (yüzde, birimli/değişkenli yazım, "kalan", kod/tarih/saat, karma sayı) ve ÖĞRENCİ HATASI olarak sunulan örnekler SAYILMAZ;
   yalnız açıkça aritmetik olanlar sayılır. */

type Jeton =
  | { k: "s"; v: number; dec: number; a: number; b: number }
  | { k: "o"; v: "+" | "-" | "*" | "/"; ch: string; a: number; b: number }
  | { k: "(" | ")" | "=" | "d"; a: number; b: number };

/** Saat (12:30): işlem değil, kod gibi opaktır. "3:4" (oran) saat değildir: dakika iki basamaklıdır. */
const SAAT = /\d{1,2}:\d{2}(?!\d)/y;
/** 5.1.14 (MEB kodu), 12.05.2026 (tarih): üç ya da daha çok noktalı gruplar. Tam olarak binlik biçimiyse (1.000.000) sayıdır. */
const KOD = /\d+(?:\.\d+){2,}/y;
/** Türkçe binlik ayracı (1.500) ve ondalık virgülü (12.500,75). İlk grup 0 ile BAŞLAMAZ: "0.125" ondalıktır, binlik değil. */
const BINLIK = /[1-9]\d{0,2}(?:\.\d{3})+(?:,\d+)?(?![\d]|\.\d)/y;
const ONDALIK = /\d+[.,]\d+/y;
const TAMSAYI = /\d+/y;

const esles = (re: RegExp, s: string, i: number): string | null => {
  re.lastIndex = i;
  return re.exec(s)?.[0] ?? null;
};
const harf = (c: string | undefined) => c !== undefined && /\p{L}/u.test(c);
const rakam = (c: string | undefined) => c !== undefined && /\d/.test(c);

/** ":" bölme mi: rakamlar arasında bitişik ("12:3") ya da iki yanı boşluklu ve komşu sözcükler rakam ("15 : 3 = 5"). "Örnek 2: 12 + 7" (sonrası boşluk, öncesi bitişik) bölme DEĞİLDİR. */
function ikiNoktaBolme(s: string, i: number): boolean {
  if (rakam(s[i - 1]) && rakam(s[i + 1])) return true;
  return s[i - 1] === " " && s[i + 1] === " " && rakam(s.slice(0, i).trimEnd().at(-1)) && rakam(s.slice(i + 1).trimStart()[0]);
}

function jetonla(s: string): Jeton[] {
  const out: Jeton[] = [];
  for (let i = 0; i < s.length; ) {
    const c = s[i]!;
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (rakam(c)) {
      const saat = esles(SAAT, s, i);
      if (saat) {
        out.push({ k: "d", a: i, b: i + saat.length });
        i += saat.length;
        continue;
      }
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
    const isle = (k: "+" | "-" | "*" | "/") => out.push({ k: "o", v: k, ch: c, a: i, b: i + 1 });
    if (c === "+") isle("+");
    else if ("−–—-".includes(c)) isle("-");
    else if ("×·⋅".includes(c)) isle("*");
    else if (c === "÷" || c === "/") isle("/");
    // x/X çarpma yalnız harflerle çevrili değilse ("Max", "box"; "2x + 3" değişkeni ayrıştırmada elenir).
    else if ((c === "x" || c === "X") && !harf(s[i - 1]) && !harf(s[i + 1])) isle("*");
    else if (c === ":" && ikiNoktaBolme(s, i)) isle("/");
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

/** Yazılan sonuç ile hesaplanan eşit mi? Yazılan sonuç sonlu olmalı ("5 = 1 ÷ 0": tolerans Infinity olurdu). Ondalıklı sonuçta ("10 ÷ 3 = 3,33") yazılan basamağa yuvarlama ya da kırpma kabul edilir. */
function esit(hesap: number, yazilan: number, ondalik: number): boolean {
  if (!Number.isFinite(yazilan)) return false; // hesap Infinity/NaN ise aşağıdaki karşılaştırmalar zaten yanlış verir
  const tol = 1e-9 * Math.max(1, Math.abs(yazilan));
  if (Math.abs(hesap - yazilan) <= tol) return true;
  if (ondalik === 0) return false;
  const k = 10 ** ondalik;
  return Math.abs(Math.round(hesap * k) / k - yazilan) <= tol || Math.abs(Math.trunc(hesap * k) / k - yazilan) <= tol;
}

export interface Esitlik {
  metin: string;
  dogru: boolean;
}

const KALAN = /^\s*[,;(\-–—]?\s*kalan/u;
/** Sayının hemen önündeki liste etiketi sözcüğü: "Örnek 1 - 12 + 7 = 19". Tire bu durumda eksi değil ayraçtır. */
const ETIKET_SOZCUGU = /(?:^|[\s(])(?:örnek|soru|adım|alıştırma|problem|etkinlik|madde|görev|aşama|kart|no)\.?\s*$/u;
/** Sonuçtan hemen sonra gelen parantez yorum mu ("84 (1 elde)"): içinde en az iki harfli sözcük. "(3 + 2)" yorum değildir. */
const yorumParantezi = (kalan: string): boolean => {
  const m = /^\(([^()]*)\)/.exec(kalan);
  return m !== null && /\p{L}{2,}/u.test(m[1]!);
};

/** Bir satırdaki doğrulanabilir "ifade = ifade" eşitlikleri. `=`in solu ve sağı HEMEN bitişik aritmetik jetonlardır (araya sözcük girerse
    "1 saat = 60 dk", "5 elma + 3 elma = 8 elma" gibi birimli yazımlar doğrulanmaz). */
export function esitlikler(satir: string): Esitlik[] {
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
    const sonuSon = rhs[q - 1]!.b;
    const sonraki = t[e + 1 + q];
    if (sonraki?.k === "(") {
      if (!yorumParantezi(satir.slice(sonraki.a))) continue; // "5 (3 + 2)": sonuç sürüyor
    } else if (sonraki && (sonraki.k === "s" || sonraki.k === "o")) continue; // "= 3 1/2", "= 4x"
    if (sonraki?.k === "d" && satir[sonraki.a] === "%") continue; // "= 12%"
    if (KALAN.test(lower(satir.slice(sonuSon)))) continue; // "17 ÷ 5 = 3 kalan 2"
    if (!lhs.some(islecMi) && !rhs.some(islecMi)) continue; // "1 = 1", "60 = 60": ifade değil
    const ondalik = rhs.length === 1 && rhs[0]!.k === "s" ? rhs[0]!.dec : 0;
    let dogru = esit(sol, sagDeger, ondalik);
    // "Örnek 1 – 12 + 7 = 19": baştaki küçük tam sayı + ayraç tire liste etiketi olabilir; etiketsiz kalan ifade doğruysa doğru sayılır.
    // Ayraç yalnız en/em tire ("–", "—") ya da sayıdan önce etiket sözcüğü (Örnek/Soru/Adım…) varsa: "10 − 3 + 2 = 5" yanlıştır.
    const [n, ek] = [lhs[0]!, lhs[1]];
    if (!dogru && n.k === "s" && Number.isInteger(n.v) && n.v <= 30 && ek?.k === "o" && ek.v === "-" && lhs.slice(2).some(islecMi)) {
      const ayrac = ek.ch === "–" || ek.ch === "—" || ETIKET_SOZCUGU.test(lower(satir.slice(0, n.a)));
      const etiketsiz = ayrac ? ayristir(lhs.slice(2)) : null;
      dogru = etiketsiz !== null && esit(etiketsiz, sagDeger, ondalik);
    }
    out.push({ metin: satir.slice(lhs[0]!.a, sonuSon), dogru });
  }
  return out;
}

/* ── Hangi satırlar doğrulanır ──
   Prompt "Yaygın hata desenleri + müdahale ipucu" istiyor: öğrencinin YANLIŞ yanıtını örnek göstermek o bölümün işidir ("38 + 47 = 715 yazar").
   Öğrenci hatası olarak sunulan örnek, hangi bölümde olursa olsun, ürün hatası değildir. */

/** Hata bölümü başlığı: "Yaygın hata desenleri", "Yanılgılar", "Yanlış yanıtlar". `hatasız` hariç. */
const HATA_BOLUMU = /hata(?!sız)|yanılgı|yanlış/;
/** Şablonun hata dışı bölümleri: hata bölümü kendi alt başlıklarında (kalın etiket, alt başlık, kardeş `##` başlığı) bunlara kadar sürer. */
const SABLON_BOLUMU = /^(?:kazanım|ön koşul|cra|manipülatif|materyal|kademeli|alıştırma)/;
/** Satır düzeyinde öğrenci hatası işareti: hata/yanlış/yanılgı sözcüğü, ✗, "unutursa/karıştırırsa", "kontrol et" (verilen çözümü denetleme) ve öğrenciye atfeden fiiller
    ("Öğrenci 3 + 4 = 8 der.", "… 75 bulur", "yazar", "yazabilir"). Bunlar anlatılan öğrenci yanıtıdır, modelin doğru diye sunduğu içerik değil. */
const HATA_ISARETI = new RegExp(
  [
    "yanlış|yanılgı\\p{L}*|hata(?!sız)\\p{L}*|unut\\p{L}*|karıştır\\p{L}*|doğru değil|kontrol\\s+et|[✗✘✖❌]",
    "(?<!\\p{L})(?:yazar|bulur|der|yazabilir|bulabilir)(?!\\p{L})",
  ].join("|"),
  "u",
);

/** Doğrulanacak satırlar: hata bölümleri ve hata işaretli satırlar atılır; madde işaretleri ve vurgu işaretleri temizlenir. */
export function ifadeSatirlari(text: string): string[] {
  const out: string[] = [];
  let atla: number | null = null; // atlanan hata bölümünün derinliği
  for (const satir of text.split("\n")) {
    const b = baslikMi(satir);
    if (b) {
      if (HATA_BOLUMU.test(b.heading)) {
        atla = derinlik(b);
        continue;
      }
      if (atla !== null && !SABLON_BOLUMU.test(b.heading) && derinlik(b) >= atla) continue; // hata bölümünün parçası: alt başlık, kalın etiket ya da kardeş başlık
      atla = null;
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
