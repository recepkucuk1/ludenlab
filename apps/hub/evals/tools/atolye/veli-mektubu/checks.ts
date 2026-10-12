// apps/hub/evals/tools/atolye/veli-mektubu/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { MADDE, TABLO, TANI, baslikMi, sections, type Section } from "../../../lib/markdown";
import { lower } from "../../../lib/sharedChecks";
import { derinlik, maddeler } from "../ortak";

export interface VeliMektubuBody {
  amac: "bilgilendirme" | "ev_etkinligi" | "gorusme_ozeti";
  notlar?: string;
  mebHedefKod?: string;
  mebDavranisKodlari?: string[];
}
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ── Etiket dayatma ──
   Prompt: "KURALLAR: Tıbbi tanı/iddia KURMA; veliye \"çocuğunuz ...dır\" gibi etiket dayatma." Etiket, BU çocuğa yöneliktir:
   - özne "çocuğunuz/oğlunuz/kızınız/evladınız" (ekli biçimler dahil: -un, -da): ardından en çok ÜÇ sözcük arayla etiket aranır;
   - özne büyük harfle başlayan bir ad ("Efe haylazdır", "Mina'nın diskalkulisi var"): etiket en çok BİR sözcük arayla aranır (cümle başı sözcükler ad değildir:
     `ETIKET_OZNE_DISI` — "Her", "Bazı", "Unutmayın", "Sınıfta" …; çoğul + hâl ekli sözcükler de değildir: "Çocuklarda", `COGUL_HAL_EKLI`); genel cümlelerde ("Bazı çocuklar dikkat eksikliği yaşar") özne bir ad değildir.
   Etiket = tanı sözcüğü + yüklem (-dır / var / SONLU fiil: yaşıyor, çekmektedir …) ya da değer yargısı sözcüğü + -dır. Ortaçlar yüklem değildir ("öğrenme güçlüğü
   YAŞAYAN çocuklar", "yaşadığı"), kip eki de ("yaşayabilir"). Genel ifadeler ("Disleksi tanılı çocuklar farklı öğrenir"), olumsuzlamalar ("disleksik değildir"), güçlü yön
   betimlemeleri ve tanı kararının uzmana ait olduğunu söyleyen cümleler etiket değildir.
   PUAN: tanı cümlesi ("disleksiktir", "DEHB'dir") fabrikanın `tani_cumlesi` puanındadır (`TANI`): `etiket_yok` YALNIZ `TANI`nın yakalamadığı etiketleri puanlar, böylece aynı
   cümle `talimat`ta iki kez sayılmaz. Bulunan her etiket `details.etiket`te, TANI'nın da yakaladıkları ayrıca `details.etiket_tani`de görünür. */
const TANI_SOZCUGU = String.raw`(?:disleksi|dehb|diskalkuli|disgrafi|ööb|otizm|öğrenme\s+güçlüğü|öğrenme\s+bozukluğu|dikkat\s+eksikliği|hiperaktivite)`;
const DEGER_SOZCUGU = String.raw`(?:hiperaktif|dikkatsiz|tembel|yaramaz|haylaz|başarısız|yetersiz|problemli|sorunlu|özürlü)`;
/** "disleksiktir", "DEHB'dir", "disleksilidir", "yaramazdır" (ek zinciri + -dır/-tir/-dur/-tür). */
const KOPULA = String.raw`\p{L}*['’]?\p{L}*(?:d[iıuü]r|t[iıuü]r)(?!\p{L})`;
/** "disleksisi var", "DEHB'si var", "disleksi tanısı bulunmaktadır" (araya en çok bir sözcük); "var mı" bir soru, etiket değil. */
const VAR_YUKLEMI = String.raw`\p{L}*['’]?\p{L}*\s+(?:\p{L}+\s+)?(?:var(?:dır)?|bulunmaktadır|bulunuyor|mevcuttur)(?!\p{L})(?!\s+m[ıiuü])`;
/** SONLU fiil: "yaşıyor", "yaşar", "yaşamaktadır", "çekmektedir", "gösteriyor", "sahiptir", cümle sonunda "sahip". "yaşayan/yaşadığı/yaşayabilir" (ortaç, kip) değildir. */
const FIIL_YUKLEMI = String.raw`\p{L}*['’]?\p{L}*\s+(?:yaşıyor\p{L}*|yaşar(?!\p{L})|yaşamaktadır|çekiyor\p{L}*|çeker(?!\p{L})|çekmektedir|gösteriyor\p{L}*|gösterir(?!\p{L})|göstermektedir|sahiptir|sahip(?=[ \t]*(?:[.,;:!?)]|\n|$)))`;
/** Öznenin ARDINDAN gelen kuyruk (tr-TR küçük harf): en çok `aralik` sözcük + etiket. */
const kuyruk = (aralik: number) =>
  new RegExp(
    `^[\\s,]+(?:\\p{L}+\\s+){0,${aralik}}?(?:(?:${TANI_SOZCUGU}|${DEGER_SOZCUGU})${KOPULA}|${TANI_SOZCUGU}(?:${VAR_YUKLEMI}|${FIIL_YUKLEMI}))`,
    "u",
  );
const KUYRUK_AILE = kuyruk(3);
const KUYRUK_AD = kuyruk(1);
const OZNE = /^(?:çocuğunuz|oğlunuz|kızınız|evladınız)\p{L}*$/u;
/** Büyük harfle başlayan ama ad OLMAYAN cümle başı sözcükler (tr-TR küçük harf): belirteçler, belirsizlik sıfatları, hitap/uyarı sözcükleri, yer/zaman ("Sınıfta", "Dönemde"). */
export const ETIKET_OZNE_DISI: ReadonlySet<string> = new Set([
  "her", "pek", "birçok", "bazı", "bazen", "bu", "şu", "o", "bunlar", "tüm", "bütün", "çoğu", "çok", "çoğunlukla", "genellikle", "kimi", "hiçbir", "diğer", "aynı",
  "unutmayın", "lütfen", "özellikle", "ayrıca", "ancak", "fakat", "çünkü", "ama", "yani", "örneğin", "aslında", "elbette", "belki", "bence", "sanırım",
  "sınıfta", "okulda", "evde", "dönemde", "sayın", "sevgili", "merhaba", "ve", "ile",
]);
/** Çoğul + hâl ekli sözcük ("Çocuklarda", "Öğrencilerin", "Çocuklara", "Çocukları") bir ad olamaz: ad çoğullanmaz — "Çocuklarda disleksi vardır" genel bir cümledir.
    Gövde en az 3 harf: "Dilara" ("di" + "lar" + "a") bir addır, çoğul değil. */
const COGUL_HAL_EKLI = /\p{L}{3,}l[ae]r(?:d[ae]|[ıi]n|[ae]|[ıi])$/u;
const ADAY_OZNE = /\p{L}+(?:['’]\p{L}+)?/gu;

function etiketler(text: string): string[] {
  const bulunan: string[] = [];
  for (const m of text.matchAll(ADAY_OZNE)) {
    const kelime = lower(m[0]);
    const aile = OZNE.test(kelime);
    if (!aile && (!/^\p{Lu}/u.test(m[0]) || ETIKET_OZNE_DISI.has(kelime) || COGUL_HAL_EKLI.test(kelime.replace(/['’]/g, "")))) continue;
    const e = (aile ? KUYRUK_AILE : KUYRUK_AD).exec(lower(text.slice(m.index + m[0].length)));
    if (e) bulunan.push(`${kelime}${e[0]}`.replace(/\s+/g, " ").trim());
  }
  return bulunan;
}

/* ── MEB kodu ── */

/** Kod: nokta/tire/en tire/eğik çizgi ayraçlı biçimler ("5.1.14", "5-1-14", "5/1/14"); alt kod ("5.1.14.12") de kod sayılır ("5.1.14" ile başlar);
    başka sayının parçası ("15.1.14", "5.1.140") sayılmaz. */
const kodDeseni = (kod: string) => new RegExp(`(?<![\\d.])${kod.split(".").map(esc).join("[.\\-–—/]")}(?!\\d)`, "u");

/* ── Ev etkinliği sayısı ── */

/** Etkinlik listesinin başlığı (küçük harfe indirilmiş, numarasız). DAR: "Evde yapabileceğimiz etkinlikler", "Etkinlik önerileri"; GENİŞ (DAR hiçbir şey saymazsa):
    "Evde küçük adımlar", "Önerilerimiz", "Günlük rutinler", "Oyunlar". */
const ETKINLIK_DAR = /etkinlik/;
const ETKINLIK_GENIS = /etkinlik|öneri|rutin|evde|yapabilece|oyun/;
/** Başlığı bir etkinliğin KENDİ adı olan alt başlık: "Etkinlik 1", "Etkinlik: Hece avı" (numara başlıktan atılmıştır: "1. Etkinlik" → "etkinlik"); "Okuma etkinlikleri" bir gruptur. */
const ETKINLIK_ADI = /^etkinlik(?!\p{L})/u;
/** Kalın başlıklı paragraf satırı ("**Hece avı:** …"). Başlık satırı (yalnız kalın metin) etkinlik değildir: çağıranlar başlık satırlarını önceden ayırır (`sections`, `enBuyukBlok`). */
const KALIN_ONCUL = /^\s*\*\*[^*]+\*\*/;
const kalinOnculler = (satirlar: string[]) => satirlar.filter((l) => KALIN_ONCUL.test(l)).length;
/** Maddeler (tablo satırları dahil); madde yoksa kalın öncüllü paragraflar. */
const ogeSayisi = (satirlar: string[]): number => maddeler(satirlar).length || kalinOnculler(satirlar);

/** `secs[i]` bölümünün alt ağacının (daha derin başlıklar) bitiş dizini (hariç). */
function agacSonu(secs: Section[], i: number): number {
  let j = i + 1;
  while (j < secs.length && derinlik(secs[j]!) > derinlik(secs[i]!)) j++;
  return j;
}
const agacSatirlari = (secs: Section[], i: number): string[] => secs.slice(i, agacSonu(secs, i)).flatMap((s) => s.lines);

/**
 * Bölümün (alt başlıklarıyla) etkinlik sayısı. Alt bölümlerden `re`ye uyanlar varsa (en dıştakiler) SAYIM onlarındır:
 *  - hepsi bir etkinliğin adıysa ("Etkinlik 1/2/3": maddeler "Nasıl", "Süre" ayrıntıdır) alt bölüm sayısı;
 *  - değilse (grup başlıkları: "Etkinlik önerileri", "Okuma etkinlikleri") alt bölümlerin MADDELERİ — alt bölümlerin sayısı değil.
 * `re`ye uyan alt bölüm yoksa: üç ve fazla alt başlık (etkinlik adları: "Hece avı", "Kart oyunu") alt başlık sayısı; yoksa bölümün maddeleri.
 */
function bolumEtkinlik(secs: Section[], i: number, re: RegExp): number {
  const son = agacSonu(secs, i);
  const eslesen: number[] = [];
  for (let j = i + 1; j < son; ) {
    if (re.test(secs[j]!.heading)) {
      eslesen.push(j);
      j = agacSonu(secs, j);
    } else j++;
  }
  if (eslesen.length) {
    if (eslesen.every((j) => ETKINLIK_ADI.test(secs[j]!.heading))) return eslesen.length;
    return eslesen.reduce((t, j) => t + ogeSayisi(agacSatirlari(secs, j)), 0);
  }
  const alt = son - i - 1;
  if (alt >= 3) return alt;
  return ogeSayisi(agacSatirlari(secs, i)) || alt;
}

/** Başlıksız mektup: ardışık liste/tablo/kalın öncüllü satırların (arada boş satır olabilir) en büyük bloğu. */
function enBuyukBlok(text: string): number {
  const bloklar: string[][] = [[]];
  for (const l of text.split("\n")) {
    if (!l.trim()) continue;
    const uye = MADDE.test(l) || TABLO.test(l) || (KALIN_ONCUL.test(l) && !baslikMi(l)) || (/^\s+\S/.test(l) && bloklar.at(-1)!.length > 0);
    if (uye) bloklar.at(-1)!.push(l);
    else if (bloklar.at(-1)!.length) bloklar.push([]);
  }
  return Math.max(0, ...bloklar.map(ogeSayisi));
}

/** Önce başlığı "etkinlik" geçen bölümler, hiçbiri etkinlik saymazsa geniş başlıklar, o da yoksa en büyük liste bloğu. */
function etkinlikSayisi(text: string): number {
  const secs = sections(text);
  const say = (re: RegExp) => Math.max(0, ...secs.flatMap((s, i) => (re.test(s.heading) ? [bolumEtkinlik(secs, i, re)] : [])));
  return say(ETKINLIK_DAR) || say(ETKINLIK_GENIS) || enBuyukBlok(text);
}

export function veliMektubuChecks(args: { body: VeliMektubuBody; text: string }): ToolCheckOut {
  const { body } = args;
  const text = args.text.replace(/\r\n?/g, "\n"); // CRLF: ortak `MADDE` kalıbı satır sonundaki "\r"da eşleşmez
  const etiket = etiketler(text);
  const tanisiz = etiket.filter((e) => !TANI.test(e)); // TANI'nın yakaladığı tanı cümleleri `tani_cumlesi` puanındadır (fabrika): burada çift sayılmaz
  const scores: Record<string, number> = { etiket_yok: tanisiz.length ? 0 : 1 };
  // Prompt: "mektupta resmî kod/jargon YAZMA" + "resmî kodları mektuba yazma". Yalnız MEB kodu verilmişse puanlanır (verilmemişse istemde bu kural yoktur).
  const kod = body.mebHedefKod?.trim();
  if (kod) scores.meb_kod_yok = kodDeseni(kod).test(text) ? 0 : 1;
  // Prompt: "ev etkinliği → 3–5 somut, kısa evde uygulanabilir etkinlik/rutin". Yalnız bu amaçta.
  let etkinlik: number | undefined;
  if (body.amac === "ev_etkinligi") {
    etkinlik = etkinlikSayisi(text);
    scores.etkinlik_sayisi = etkinlik >= 3 && etkinlik <= 5 ? 1 : 0;
  }
  const tanili = etiket.filter((e) => TANI.test(e));
  return { scores, details: { ...scores, etiket: etiket.join("|"), etiket_tani: tanili.join("|"), ...(etkinlik === undefined ? {} : { etkinlik }) }, hard: [] };
}
