// apps/hub/evals/tools/atolye/veli-mektubu/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { MADDE, TABLO, baslikMi, sections, type Section } from "../../../lib/markdown";
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
   Prompt: "KURALLAR: Tıbbi tanı/iddia KURMA; veliye \"çocuğunuz ...dır\" gibi etiket dayatma." Etiket, BU çocuğa yöneliktir: özne "çocuğunuz/oğlunuz/kızınız/
   evladınız" (ekli biçimler dahil: -un, -da) ya da büyük harfle başlayan bir ad ("Efe disleksiktir", "Mina'nın diskalkulisi var"); ardından en çok üç sözcük
   arayla (noktalama araya girmez) tanı sözcüğü + yüklem (-dır / var / yaşıyor) ya da değer yargısı sözcüğü + -dır. Genel ifadeler ("Disleksi tanılı çocuklar
   farklı öğrenir"), olumsuzlamalar ("disleksik değildir"), güçlü yön betimlemeleri ("çok yaratıcıdır") ve tanı kararının uzmana ait olduğunu söyleyen cümleler
   etiket değildir. "Tanı koyma" cümlesinin kendisi ("disleksi tanısı konmuştur") fabrikanın `tani_cumlesi` puanındadır. */
const TANI_SOZCUGU = String.raw`(?:disleksi|dehb|diskalkuli|disgrafi|ööb|otizm|öğrenme\s+güçlüğü|öğrenme\s+bozukluğu|dikkat\s+eksikliği|hiperaktivite)`;
const DEGER_SOZCUGU = String.raw`(?:hiperaktif|dikkatsiz|tembel|yaramaz|haylaz|başarısız|yetersiz|problemli|sorunlu|özürlü)`;
/** "disleksiktir", "DEHB'dir", "disleksilidir", "yaramazdır" (ek zinciri + -dır/-tir/-dur/-tür). */
const KOPULA = String.raw`\p{L}*['’]?\p{L}*(?:d[iıuü]r|t[iıuü]r)(?!\p{L})`;
/** "disleksisi var", "DEHB'si var", "disleksi tanısı bulunmaktadır" (araya en çok bir sözcük); "var mı" bir soru, etiket değil. */
const VAR_YUKLEMI = String.raw`\p{L}*['’]?\p{L}*\s+(?:\p{L}+\s+)?(?:var(?:dır)?|bulunmaktadır|bulunuyor|mevcuttur)(?!\p{L})(?!\s+m[ıiuü])`;
/** "dikkat eksikliği yaşıyor", "öğrenme güçlüğü çekmektedir". */
const FIIL_YUKLEMI = String.raw`\p{L}*['’]?\p{L}*\s+(?:yaşı|yaşa|çeki|çekm|göster|sahip)\p{L}*`;
/** Öznenin ARDINDAN gelen kuyruk (tr-TR küçük harf): en çok üç sözcük + etiket. */
const ETIKET_KUYRUGU = new RegExp(
  `^[\\s,]+(?:\\p{L}+\\s+){0,3}?(?:(?:${TANI_SOZCUGU}|${DEGER_SOZCUGU})${KOPULA}|${TANI_SOZCUGU}(?:${VAR_YUKLEMI}|${FIIL_YUKLEMI}))`,
  "u",
);
const OZNE = /^(?:çocuğunuz|oğlunuz|kızınız|evladınız)\p{L}*$/u;
const ADAY_OZNE = /\p{L}+(?:['’]\p{L}+)?/gu;

function etiketler(text: string): string[] {
  const bulunan: string[] = [];
  for (const m of text.matchAll(ADAY_OZNE)) {
    const kelime = lower(m[0]);
    if (!OZNE.test(kelime) && !/^\p{Lu}/u.test(m[0])) continue;
    const e = ETIKET_KUYRUGU.exec(lower(text.slice(m.index + m[0].length)));
    if (e) bulunan.push(`${kelime}${e[0]}`.replace(/\s+/g, " ").trim());
  }
  return bulunan;
}

/* ── MEB kodu ── */

/** Kod: nokta/tire/en tire/eğik çizgi ayraçlı biçimler ("5.1.14", "5-1-14", "5/1/14"); alt kod ("5.1.14.12") de kod sayılır ("5.1.14" ile başlar);
    başka sayının parçası ("15.1.14", "5.1.140") sayılmaz. */
const kodDeseni = (kod: string) => new RegExp(`(?<![\\d.])${kod.split(".").map(esc).join("[.\\-–—/]")}(?!\\d)`, "u");

/* ── Ev etkinliği sayısı ── */

/** Etkinlik/öneri listesinin başlığı (küçük harfe indirilmiş, numarasız): "Evde yapabileceğimiz etkinlikler", "Evde küçük adımlar", "Önerilerimiz", "Günlük rutinler". */
const ETKINLIK_BASLIGI = /etkinlik|öneri|rutin|evde|yapabilece|oyun/;
/** Kalın başlıklı paragraf satırı ("**Hece avı:** …"). Başlık satırı (yalnız kalın metin) etkinlik değildir: çağıranlar başlık satırlarını önceden ayırır (`sections`, `enBuyukBlok`). */
const KALIN_ONCUL = /^\s*\*\*[^*]+\*\*/;
const kalinOnculler = (satirlar: string[]) => satirlar.filter((l) => KALIN_ONCUL.test(l)).length;
/** Maddeler (tablo satırları dahil); madde yoksa kalın öncüllü paragraflar. */
const ogeSayisi = (satirlar: string[]): number => maddeler(satirlar).length || kalinOnculler(satirlar);

/** Bölümün (ve daha derin bölümlerinin) etkinlik sayısı. Üç ve fazla alt başlık varsa her biri bir etkinliktir (maddeler ayrıntıdır: "Nasıl", "Süre"). */
function bolumEtkinlik(secs: Section[], i: number): number {
  const kok = secs[i]!;
  const alt: Section[] = [];
  for (const t of secs.slice(i + 1)) {
    if (derinlik(t) <= derinlik(kok)) break;
    alt.push(t);
  }
  if (alt.length >= 3) return alt.length;
  return ogeSayisi([...kok.lines, ...alt.flatMap((s) => s.lines)]) || alt.length;
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

function etkinlikSayisi(text: string): number {
  const secs = sections(text);
  const bolumlu = Math.max(0, ...secs.flatMap((s, i) => (ETKINLIK_BASLIGI.test(s.heading) ? [bolumEtkinlik(secs, i)] : [])));
  return bolumlu > 0 ? bolumlu : enBuyukBlok(text);
}

export function veliMektubuChecks(args: { body: VeliMektubuBody; text: string }): ToolCheckOut {
  const { body } = args;
  const text = args.text.replace(/\r\n?/g, "\n"); // CRLF: ortak `MADDE` kalıbı satır sonundaki "\r"da eşleşmez
  const etiket = etiketler(text);
  const scores: Record<string, number> = { etiket_yok: etiket.length ? 0 : 1 };
  // Prompt: "mektupta resmî kod/jargon YAZMA" + "resmî kodları mektuba yazma". Yalnız MEB kodu verilmişse puanlanır (verilmemişse istemde bu kural yoktur).
  const kod = body.mebHedefKod?.trim();
  if (kod) scores.meb_kod_yok = kodDeseni(kod).test(text) ? 0 : 1;
  // Prompt: "ev etkinliği → 3–5 somut, kısa evde uygulanabilir etkinlik/rutin". Yalnız bu amaçta.
  let etkinlik: number | undefined;
  if (body.amac === "ev_etkinligi") {
    etkinlik = etkinlikSayisi(text);
    scores.etkinlik_sayisi = etkinlik >= 3 && etkinlik <= 5 ? 1 : 0;
  }
  return { scores, details: { ...scores, etiket: etiket.join("|"), ...(etkinlik === undefined ? {} : { etkinlik }) }, hard: [] };
}
