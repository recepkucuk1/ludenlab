// apps/hub/evals/tools/atolye/seans-plani/checks.ts
import type { Alan } from "@atolye/lib/bep";
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { AYRAC, TABLO } from "../../../lib/markdown";
import { frac, lower } from "../../../lib/sharedChecks";
import { bolumAgaci, bolumSatirlari, derinlik, maddeler } from "../ortak";

export interface SeansBody {
  alan: Alan;
  seansHedefi: string;
  sureDk: number;
  sonSeansNotu?: string;
  materyalKisiti?: string;
  mebHedefKod?: string;
  mebDavranisKodlari?: string[];
}
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ── Bölüm regex'leri: TEK KAYNAK (adapter `sections` bunları kullanır; akış bölümünün sınırı da buradan) ── */

/** Prompt: "1. Seans Künyesi … 2. Etkinlik Akışı … 3. Materyaller … 4. Ölçme … 5. Ev Görevi … 6. Sonraki Adım". Ev görevi/ödevi/çalışması ve
    "(Bir) Sonraki Seans" adları da kabul (model başlığı yumuşatabilir). Başlıklar küçük harfe indirilmiş, `-` boşluk olur. */
export const SEANS_BOLUMLERI = {
  kunye: /künye/,
  akis: /akış/,
  materyal: /materyal/,
  olcme: /ölçme/,
  ev: /ev (?:görevi|ödevi|çalışması)/,
  sonraki: /sonraki (?:adım|seans)/,
} as const;
export const SEANS_BOLUM_LISTESI: RegExp[] = Object.values(SEANS_BOLUMLERI);
const AKIS = SEANS_BOLUMLERI.akis;
/** Akışın sonraki bölümleri (kalın sözde başlık kökünde akışın nerede bittiğini belirler). */
const DIGER_BOLUMLER = new RegExp(
  [SEANS_BOLUMLERI.kunye, SEANS_BOLUMLERI.materyal, SEANS_BOLUMLERI.olcme, SEANS_BOLUMLERI.ev, SEANS_BOLUMLERI.sonraki].map((r) => r.source).join("|"),
);

/* ── Süre ayrıştırma ── */

interface SureKaydi {
  a: number;
  b: number;
  /** Yazıldığı gibi aralık mı ("5-10 dk")? Tek sayıda a = b. */
  aralik: boolean;
  /** Dakikaya çarpan: sn 1/60, saat 60. */
  k: number;
}
/**
 * Sayı + BİRİM: "25 dk", "5-10 dakika", "5 dak.", "30 sn", "1 saat", "10 dakikalık", "5'", "5′" (tırnak/asal = dakika).
 * Sayı numaranın ortasından başlamaz (`3.2.5 dk` MEB kodu + "dk" sözcüğüdür: 2.5 dk değil). Asal/kesme dakika sayılır ama YALNIZ rakama
 * bitişikse ve ardından harf/rakam/başka tırnak gelmiyorsa: "5'e" (kod + ek) ve "5 '" süre değildir; tırnak içindeki sayı (`'5'`, `"5'`)
 * da süre değildir (`sureKayitlari` önündeki tırnağa bakar). Küçük harfe indirilmiş metinde çalışır.
 * BİLİNEN SINIRLAR (testlerde belgeli): yazıyla sayılar ("beş dakika"), sıralı "1.–5. dakika", saat-dakika ("10.00–10.05").
 */
const BIRIMLI = /(?<![\d.,])(\d+(?:[.,]\d+)?)(?:(?:\s*(?:dakika|dak|dk)?\s*[-–—]\s*(\d+(?:[.,]\d+)?))?\s*(dakika|dak|dk|saniye|sn|saat)(?:l[ıiuü]k)?(?!\p{L})|(['′])(?![\p{L}\d'’′]))/gu;
const sayi = (s: string) => Number(s.replace(",", "."));

function sureKayitlari(text: string): SureKaydi[] {
  const t = lower(text);
  return [...t.matchAll(BIRIMLI)]
    .filter((m) => !(m[4] !== undefined && /['’′"“‘]/.test(t[m.index - 1] ?? ""))) // '5' → tırnak içindeki sayı
    .map((m) => ({
      a: sayi(m[1]!),
      b: m[2] === undefined ? sayi(m[1]!) : sayi(m[2]),
      aralik: m[2] !== undefined,
      // `saat` ile `sn` ikisi de "s" ile başlar: önce saat denetlenir.
      k: m[3] === "saat" ? 60 : m[3] === "sn" || m[3] === "saniye" ? 1 / 60 : 1,
    }));
}
const ortalama = (r: SureKaydi) => ((r.a + r.b) / 2) * r.k;
const topla = (xs: number[]) => xs.reduce((t, x) => t + x, 0);

/** Bir metindeki birimli sürelerin toplamı (dakika). Aralıkta ortalama; sn → /60, saat → ×60.
    Birimsiz sayılar (MEB kodu, adet, sıra numarası) sayılmaz. */
export function birimliSureDk(text: string): number {
  return topla(sureKayitlari(text).map(ortalama));
}

/* ── GFM tablolarda süre sütunu ── */

const SURE_BASLIGI = /süre|dk|dakika/;
const SADE_SAYI = /^\*{0,2}\s*(\d+(?:[.,]\d+)?(?:\s*[-–—]\s*\d+(?:[.,]\d+)?)?)\s*\*{0,2}$/;
const hucreleri = (satir: string) => satir.trim().replace(/^\||\|$/g, "").split("|").map((h) => h.trim());

/**
 * Birimi SÜTUN BAŞLIĞINDA olan GFM tablo: `| Aşama | Süre (dk) | Etkinlik |` + gövdede `| Isınma | 5 | … |`. Başlığı
 * süre/dk/dakika olan sütundaki sade sayı (ya da aralık) o birimle yazılır ("5 dk"; başlıkta sn/saniye/saat varsa o). Birim hücrede
 * zaten varsa ("5 dk") dokunulmaz. Dönen satırlar `maddeler`e verilir.
 */
export function tabloSureleriniBirimle(satirlar: string[]): string[] {
  const out = [...satirlar];
  for (let i = 0; i + 1 < satirlar.length; i++) {
    if (!TABLO.test(satirlar[i]!) || !AYRAC.test(satirlar[i + 1]!) || !satirlar[i + 1]!.includes("|")) continue;
    const baslik = hucreleri(satirlar[i]!).map((h) => lower(h.replace(/\*\*|__/g, "")));
    const idx = baslik.findIndex((h) => SURE_BASLIGI.test(h));
    if (idx < 0) continue;
    const birim = /sn|saniye/.test(baslik[idx]!) ? "sn" : /saat/.test(baslik[idx]!) ? "saat" : "dk";
    for (let j = i + 2; j < satirlar.length && TABLO.test(satirlar[j]!); j++) {
      const h = hucreleri(satirlar[j]!);
      const m = SADE_SAYI.exec(h[idx] ?? "");
      if (!m) continue;
      h[idx] = `${m[1]} ${birim}`;
      out[j] = `| ${h.join(" | ")} |`;
    }
  }
  return out;
}

/* ── Etkinlik akışı ── */

/** Akışın toplamını/özetini söyleyen satır ("Toplam: 40 dk", "Seans süresi: 40 dk", tablo satırı "| — | Toplam | 40 dk |") bir blok değildir. */
const TOPLAM_SATIRI = /^(?:genel )?(?:toplam|seans süresi)(?!\p{L})| · (?:genel )?(?:toplam(?: süre)?|seans süresi)(?: · |$)/u;
const bloklariCoz = (satirlar: string[]) => maddeler(tabloSureleriniBirimle(satirlar));

/**
 * Akışın süre taşıyan blokları: kök bölümün maddeleri + alt başlıklar. Süreli alt başlıkta süre BAŞLIKTADIR
 * (altındaki maddeler ve daha derin başlıklar ayrıntıdır, sayılmaz); süresiz alt başlıkta maddeleri blok olur.
 * "Toplam"/"Seans süresi" satırları (madde, tablo satırı, başlık) blok değildir.
 */
function akisBloklari(text: string): string[] {
  const [kok, ...alt] = bolumAgaci(text, AKIS, DIGER_BOLUMLER);
  if (!kok) return [];
  const bloklar = bloklariCoz(kok.lines);
  let atla: number | null = null; // süreli başlığın derinliği: ondan derin bölümler ayrıntıdır
  for (const s of alt) {
    if (atla !== null && derinlik(s) > atla) continue;
    atla = null;
    if (sureKayitlari(s.heading).length) {
      bloklar.push(s.heading);
      atla = derinlik(s);
    } else bloklar.push(...bloklariCoz(s.lines));
  }
  return bloklar.filter((b) => !TOPLAM_SATIRI.test(lower(b)));
}

/** Bloğun başlığı: ilk ":" öncesi; iki nokta yoksa tablo satırında ilk iki hücre ("Isınma · 5 dk"), yoksa ilk " — " öncesi; hiçbiri yoksa boş. */
function blokBasligi(blok: string): string {
  const i = blok.indexOf(":");
  if (i >= 0) return blok.slice(0, i);
  const hucre = blok.split(" · ");
  if (hucre.length > 1) return hucre.slice(0, 2).join(" · ");
  const j = blok.search(/\s[—–]\s/);
  return j < 0 ? "" : blok.slice(0, j);
}

/**
 * Bir bloğun süresi — BELİRLEYİCİ okuma (hakem kararı her yazımda aynı), sırayla:
 *  1) tek süre → o;
 *  2) blok BAŞLIĞINDA (ilk ":" öncesi; ":" yoksa " — " öncesi / tablo satırında ilk iki hücre) süre varsa o
 *     ("Ana Etkinlik (15 dk): 10 dk kart, 5 dk oyun" = 15; "Ana Etkinlik — 25 dk: 10 dk kart, 10 dk oyun" = 25);
 *  3) ≥3 süre ve ilki ≈ (±1) kalanların toplamı → ilk (başlıksız, iç içe döküm: "Ana (30 dk) 10 dk kart 20 dk oyun" = 30);
 *  4) yoksa toplam ("Isınma: 5 dk nefes, 5 dk hece kartı" = 10; "Ana: 10 dk kart ve 10 dk saha oyunu" = 20).
 * İki süre, ilki ikincisine eşit olsa bile BİRİNCİ sayılmaz: "5 dk nefes, 5 dk hece" iki ayrı adımdır (eski "ilk ≈ kalan" kuralı 5 verirdi).
 */
function blokSuresi(blok: string): number {
  const d = sureKayitlari(blok).map(ortalama);
  if (d.length === 0) return 0;
  if (d.length === 1) return d[0]!;
  const baslik = sureKayitlari(blokBasligi(blok))[0];
  if (baslik) return ortalama(baslik);
  if (d.length >= 3 && Math.abs(d[0]! - topla(d.slice(1))) <= 1) return d[0]!;
  return topla(d);
}

/** Zaman çizelgesi: blokların ilk süreleri ardışık ofset aralıklarıysa ("0–5", "5–30", "30–40 dk") toplam = son uç − ilk uç; değilse null. */
function zamanCizelgesi(ilkler: SureKaydi[]): number | null {
  const ardisik = ilkler.length >= 2 && ilkler.every((r, i) => r.aralik && (i === 0 || r.a * r.k === ilkler[i - 1]!.b * ilkler[i - 1]!.k));
  return ardisik ? ilkler.at(-1)!.b * ilkler.at(-1)!.k - ilkler[0]!.a * ilkler[0]!.k : null;
}

/**
 * Akışın toplam süresi. `sure` = BELİRLEYİCİ okuma (zaman çizelgesi varsa o, yoksa blok başına `blokSuresi` toplamı). İstenen süreye
 * en yakın okumayı SEÇMEZ (böyle bir seçim her yazımı geçirirdi). Teşhis için üç ham okuma da döner: a = tüm birimli sürelerin toplamı,
 * b = blok başına ilk süre toplamı, c = zaman çizelgesi (yoksa null).
 */
function akisSuresi(bloklar: string[]): { sure: number; a: number; b: number; c: number | null } {
  const kayitlar = bloklar.map(sureKayitlari);
  const ilkler = kayitlar.flatMap((k) => (k[0] ? [k[0]] : []));
  const c = zamanCizelgesi(ilkler);
  return {
    sure: c ?? topla(bloklar.map(blokSuresi)),
    a: topla(kayitlar.flat().map(ortalama)),
    b: topla(ilkler.map(ortalama)),
    c,
  };
}

/** Prompt: "*Isınma* · *Ana Etkinlik(ler)* · *Tekrar/Oyun* · *Kapanış*". */
const ASAMALAR = [/ısınma/, /ana etkinlik/, /tekrar|oyun/, /kapanış/];

export function seansChecks(args: { body: SeansBody; text: string }): ToolCheckOut {
  const { body, text } = args;
  // Prompt: "Etkinlik Akışı — süre dağılımıyla … toplam süre = ${sureDk} dk". Akış bloklarının BİRİMLİ süre toplamı ≈ istenen süre.
  // Tolerans min(5, max(2, %15)): model yuvarlar; kısa seansta ±5 dk seansın üçte biridir. Serbest metinde `sureDk` KULLANILMAZ
  // (ilk sayıyı alır: "MEB 3.2.5 … (25 dk)" → 3.2); birim zorunlu ("25 dk", "5-10 dakika", "5 dak.", "30 sn", "1 saat", "5'") ya da tablo
  // sütun başlığında ("Süre (dk)").
  const bloklar = akisBloklari(text);
  const { sure, a, b, c } = akisSuresi(bloklar);
  const tolerans = Math.min(5, Math.max(2, 0.15 * body.sureDk));
  const sureToplami = Math.abs(sure - body.sureDk) <= tolerans ? 1 : 0;
  // Prompt: "Isınma · Ana Etkinlik(ler) · Tekrar/Oyun · Kapanış" — dört aşama akış bölümünde aranır.
  const akisMetni = lower((bolumSatirlari(text, AKIS, DIGER_BOLUMLER) ?? []).join("\n"));
  const asamalar = frac(ASAMALAR, (re) => re.test(akisMetni));
  const scores: Record<string, number> = { sure_toplami: sureToplami, akis_asamalari: asamalar };
  // Prompt: "Ana etkinlik(ler), seçilen MEB hedef davranışlarını hedeflesin" + "MEB HEDEF HİZALAMASI … demirle": hedef kodu
  // çıktıda geçmeli (alt kod 3.2.5.1 de sayılır; 13.2.5 / 3.2.50 / v.3.2.5 sayılmaz). Kod verilmemişse puan yok.
  const kod = body.mebHedefKod?.trim();
  if (kod) scores.meb_kod = new RegExp(`(?<![\\d.])${esc(kod)}(?!\\d)`, "u").test(text) ? 1 : 0;
  return { scores, details: { sure, sure_a: a, sure_b: b, sure_c: c ?? "—", tolerans, blok_sayisi: bloklar.length, ...scores }, hard: [] };
}
