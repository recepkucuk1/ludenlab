// apps/hub/evals/tools/atolye/seans-plani/checks.ts
import type { Alan } from "@atolye/lib/bep";
import type { ToolCheckOut } from "../../../lib/adapterFactory";
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

/* ── Süre ayrıştırma ── */

interface SureKaydi {
  a: number;
  b: number;
  /** Yazıldığı gibi aralık mı ("5-10 dk")? Tek sayıda a = b. */
  aralik: boolean;
  /** Dakikaya çarpan: sn 1/60, saat 60. */
  k: number;
}
/** Sayı + BİRİM ("25 dk", "5-10 dakika", "30 sn", "1 saat", "10 dakikalık"). Sayı numaranın ortasından başlamaz
    (`3.2.5 dk` MEB kodu + "dk" sözcüğüdür: 2.5 dk değil). Küçük harfe indirilmiş metinde çalışır. */
const BIRIMLI = /(?<![\d.,])(\d+(?:[.,]\d+)?)(?:\s*(?:dk|dakika)?\s*[-–—]\s*(\d+(?:[.,]\d+)?))?\s*(dk|dakika|sn|saniye|saat)(?:l[ıiuü]k)?(?!\p{L})/gu;
const sayi = (s: string) => Number(s.replace(",", "."));

function sureKayitlari(text: string): SureKaydi[] {
  return [...lower(text).matchAll(BIRIMLI)].map((m) => ({
    a: sayi(m[1]!),
    b: m[2] === undefined ? sayi(m[1]!) : sayi(m[2]),
    aralik: m[2] !== undefined,
    // `saat` ile `sn` ikisi de "s" ile başlar: önce saat denetlenir.
    k: m[3] === "saat" ? 60 : m[3] === "sn" || m[3] === "saniye" ? 1 / 60 : 1,
  }));
}
const ortalama = (r: SureKaydi) => ((r.a + r.b) / 2) * r.k;

/** Bir metindeki birimli sürelerin toplamı (dakika). Aralıkta ortalama; sn → /60, saat → ×60.
    Birimsiz sayılar (MEB kodu, adet, sıra numarası) sayılmaz. */
export function birimliSureDk(text: string): number {
  return sureKayitlari(text).reduce((t, r) => t + ortalama(r), 0);
}

/* ── Etkinlik akışı ── */

/** Etkinlik Akışı bölümü ve şablonun diğer bölümleri (kalın sözde başlık kökünde akışın nerede bittiği). */
const AKIS = /etkinlik akışı|akış/;
const DIGER_BOLUMLER = /künye|materyal|ölçme|ev görevi|sonraki adım/;
/** Akışın toplamını/özetini söyleyen satır ("Toplam: 40 dk", "Seans süresi: 40 dk") bir blok değildir. */
const TOPLAM_SATIRI = /^(?:toplam|seans süresi)(?!\p{L})/u;

/**
 * Akışın süre taşıyan blokları: kök bölümün maddeleri + alt başlıklar. Süreli alt başlıkta süre BAŞLIKTADIR
 * (altındaki maddeler ve daha derin başlıklar ayrıntıdır, sayılmaz); süresiz alt başlıkta maddeleri blok olur.
 * "Toplam"/"Seans süresi" satırları (madde, tablo satırı, başlık) blok değildir.
 */
function akisBloklari(text: string): string[] {
  const [kok, ...alt] = bolumAgaci(text, AKIS, DIGER_BOLUMLER);
  if (!kok) return [];
  const bloklar = maddeler(kok.lines);
  let atla: number | null = null; // süreli başlığın derinliği: ondan derin bölümler ayrıntıdır
  for (const s of alt) {
    if (atla !== null && derinlik(s) > atla) continue;
    atla = null;
    if (sureKayitlari(s.heading).length) {
      bloklar.push(s.heading);
      atla = derinlik(s);
    } else bloklar.push(...maddeler(s.lines));
  }
  return bloklar.filter((b) => !TOPLAM_SATIRI.test(lower(b)));
}

/**
 * Akışın toplam süresi (dakika): üç okumadan istenene EN YAKIN olan —
 *  A) blok içindeki tüm birimli sürelerin toplamı ("Isınma: 5 dk hece + 10 dk oyun"),
 *  B) blok başına İLK süre (blok süresi başta yazılı, ayrıntı süreleri sonra: "Ana (25 dk): 10 dk kart, 15 dk oyun"),
 *  C) zaman çizelgesi: bloklar ardışık ofset aralıklarıysa ("0–5 dk", "5–30 dk", "30–40 dk") son uç − ilk uç.
 * Hangisinin doğru olduğu yazım biçimine bağlıdır ve metinden ayırt edilemez; üçünden biri tutuyorsa akış toplamı doğrudur.
 */
function akisSuresi(bloklar: string[], hedef: number): { sure: number; blok: number } {
  const kayitlar = bloklar.map(sureKayitlari);
  const a = kayitlar.flat().reduce((t, r) => t + ortalama(r), 0);
  const ilkler = kayitlar.flatMap((k) => (k[0] ? [k[0]] : []));
  const b = ilkler.reduce((t, r) => t + ortalama(r), 0);
  const adaylar = [a, b];
  const ardisik = ilkler.length >= 2 && ilkler.every((r, i) => r.aralik && (i === 0 || r.a * r.k === ilkler[i - 1]!.b * ilkler[i - 1]!.k));
  if (ardisik) adaylar.push(ilkler.at(-1)!.b * ilkler.at(-1)!.k - ilkler[0]!.a * ilkler[0]!.k);
  const sure = adaylar.reduce((en, x) => (Math.abs(x - hedef) < Math.abs(en - hedef) ? x : en));
  return { sure, blok: bloklar.length };
}

/** Prompt: "*Isınma* · *Ana Etkinlik(ler)* · *Tekrar/Oyun* · *Kapanış*". */
const ASAMALAR = [/ısınma/, /ana etkinlik/, /tekrar|oyun/, /kapanış/];

export function seansChecks(args: { body: SeansBody; text: string }): ToolCheckOut {
  const { body, text } = args;
  // Prompt: "Etkinlik Akışı — süre dağılımıyla … toplam süre = ${sureDk} dk". Akış bloklarının BİRİMLİ süre toplamı ≈ istenen
  // süre (±5 dk: model yuvarlar). Serbest metinde `sureDk` KULLANILMAZ (ilk sayıyı alır: "MEB 3.2.5 … (25 dk)" → 3.2);
  // birim zorunlu: "25 dk", "5-10 dakika", "30 sn", "1 saat".
  const { sure, blok } = akisSuresi(akisBloklari(text), body.sureDk);
  const sureToplami = Math.abs(sure - body.sureDk) <= 5 ? 1 : 0;
  // Prompt: "Isınma · Ana Etkinlik(ler) · Tekrar/Oyun · Kapanış" — dört aşama akış bölümünde aranır.
  const akisMetni = lower((bolumSatirlari(text, AKIS, DIGER_BOLUMLER) ?? []).join("\n"));
  const asamalar = frac(ASAMALAR, (re) => re.test(akisMetni));
  const scores: Record<string, number> = { sure_toplami: sureToplami, akis_asamalari: asamalar };
  // Prompt: "Ana etkinlik(ler), seçilen MEB hedef davranışlarını hedeflesin" + "MEB HEDEF HİZALAMASI … demirle": hedef kodu
  // çıktıda geçmeli (alt kod 3.2.5.1 de sayılır; 13.2.5 / 3.2.50 / v.3.2.5 sayılmaz). Kod verilmemişse puan yok.
  const kod = body.mebHedefKod?.trim();
  if (kod) scores.meb_kod = new RegExp(`(?<![\\d.])${esc(kod)}(?!\\d)`, "u").test(text) ? 1 : 0;
  return { scores, details: { sure, blok_sayisi: blok, ...scores }, hard: [] };
}
