// apps/hub/evals/tools/studio/cards/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { OLCUT } from "../../../lib/markdown";
import { adGeciyorMu, alanlarDolu, countSentences, frac, kayitlar, lower, mean, nesneVeyaNull, str } from "../../../lib/sharedChecks";

export interface CardBody {
  category: "speech" | "language" | "hearing";
  difficulty: "easy" | "medium" | "hard";
  ageGroup: "3-6" | "7-12" | "13-18" | "adult";
  focusArea?: string;
  curriculumGoalIds?: string[];
}
type Rec = Record<string, unknown>;

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const between = (n: number, lo: number, hi: number) => (n >= lo && n <= hi ? 1 : 0);
const dolu = (v: unknown) => str(v).trim().length > 0;
/** Dizideki boş olmayan metin öğeleri (şema: `items: { type: "string" }`). */
const metinOgeler = (v: unknown) => arr(v).filter(dolu);
/** JSON Schema `maxLength` kod noktası sayar (UTF-16 birimi değil): emoji tek karakterdir. */
const uzunluk = (s: string) => [...s].length;

// Arayüzün adım metninden söktüğü önekle aynı (CardPreview: başa yaslı "Adım" + sayı + ":"): "Adım" büyük harfle, sayıdan hemen sonra ":".
const ADIM = /^Adım \d+:/;

/* Ölçülebilir ilerleme göstergesi (prompt kural 8 + şema: "gözlemlenebilir ve ölçülebilir, soyut ifade kullanma"):
   BEP kontrolünün `OLCUT` imzası (yüzde, oran, "5 denemeden 4'ünde", ardışık + sayı, sayı + birim) + `OLCUT_EK`:
   yazıyla sayılar ("yüzde seksen", "beş denemeden dördünde"), sayı + deneme/oturum/seans/cümle/hafta/gün, kesmesiz oran ("5 üzerinden 4"),
   eşik ("en az bir kez", "en az üç bağlaç"), yazıyla/kesmeli oran ("beş istek cümlesinin dördünü", "10'unun 8'i") ve sayı + ad + "doğru"
   ("4 olayı doğru sırayla"). Sezgiseldir: imzasız bir ölçüt ("sekiz denemenin çoğunda") soyut sayılabilir; bu yüzden kontrol yalnız
   göstergelere bakar ve oran verir. */
const SAYI_ADLARI = "iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on|yirmi|otuz|kırk|elli|altmış|yetmiş|seksen|doksan|yüz"; // "bir" yok: belirsizlik sıfatı
const SAYI_YAZI = `(?:${SAYI_ADLARI})`;
/** Çekimli sayı adı (oranın ikinci terimi: "dördünü", "dokuzunu", "altısını"); "on" bilerek yok ("onu/onun" zamirleri). */
const SAYI_CEKIMLI = String.raw`(?:dörd|dört|üçü|beşi|altıs|yedis|sekiz|dokuz|ikis|ikiy)\p{L}*`;
const OLCUT_EK = new RegExp(
  [
    String.raw`yüzde\s+${SAYI_YAZI}(?!\p{L})`,
    String.raw`(?<!\p{L})${SAYI_YAZI}\s+(?:deneme|oturum|seans|kez|kere|defa|kelime|sözcük|hece|cümle|soru|dakika|saniye)`,
    String.raw`\d+(?:[.,]\d+)?\s*(?:deneme|oturum|seans|cümle|hafta|gün)`,
    String.raw`\d+\s+\p{L}+\s+\d+`, // "5 üzerinden 4", "10 üretimden 8 tanesi": iki sayı arası tek sözcük = oran
    String.raw`(?<!\p{L})en az\s+(?:\d+|bir|${SAYI_ADLARI})(?!\p{L})`, // "en az bir kez", "en az iki durumda", "en az üç bağlaç"
    String.raw`(?<!\p{L})${SAYI_YAZI}\s+(?:\p{L}+\s+){0,3}${SAYI_CEKIMLI}`, // "beş istek cümlesinin dördünü"
    String.raw`\d+['’]\p{L}+\s+(?:\p{L}+\s+){0,2}\d+['’]\p{L}+`, // "10'unun 8'i", "5'inden 4'ü"
    String.raw`(?:\d+(?:[.,]\d+)?|${SAYI_YAZI})\s+\p{L}+\s+doğru(?!\p{L})`, // "4 olayı doğru sırayla", "dört olayı doğru sıralar"
  ].join("|"),
  "u",
);
const olculebilir = (s: unknown) => typeof s === "string" && (OLCUT.test(lower(s)) || OLCUT_EK.test(lower(s)));

/** Odak alanından anlamlı kök sözcükler: ≥ 4 harfli sözcüklerin ilk 5 harfi (küçük harf; ek almış biçimler yine eşleşir). */
const odakKokleri = (focus: string) =>
  lower(focus)
    .split(/[\s,;:.()/]+/)
    .filter((w) => w.length >= 4)
    .map((w) => w.slice(0, 5));

/**
 * Öğrenme kartına özgü kontroller (tool_use çıktısı; JSON geçerliliği, dil kuralı, rumuz ve yasak kalıp `studioAdapter`da ortaktır).
 * Kural: bir puan YALNIZ çıktı `emit_card` şemasının/sistem prompt'unun söylediği ya da arayüzün (`CardPreview`) okuduğu bir şeyi
 * bozuyorsa düşer; gerisi ayrıntı ya da hakem işidir:
 *   - şema: başlık ≤ 80, malzeme 1–6, adım 3–8 (Adım N: biçimi arayüzde sökülür), egzersiz 1–4 (ad/açıklama/tekrar dolu; arayüz `ex.description`ı
 *     metin sanır), ilerleme göstergesi 2–5, amaç/uzman notu/ev egzersizi dolu;
 *   - prompt: göstergeler ölçülebilir (kural 8), uzman notunda öğrencinin adı (kural 2d; yalnız öğrenci seçiliyse).
 * AYRINTI (talimata girmez): `odak` (odak alanının kök sözcükleri başlık/amaç/egzersizde — sözcüksel bir yaklaşıklıktır, uyum hakemin
 * `hedef_hizasi`ndadır) ve `amac_cumle` (şema açıklaması "1-2 cümle" der, cümle sayacı sezgiseldir).
 * Rumuz: model çıktısı (`raw`) rumuzludur, route gerçek adı geri koyar (`output`); isim kullanımı bu yüzden HAM çıktıda aranır. */
export function cardChecks(args: { body: CardBody; output: unknown; raw?: Rec | null; text?: string; alias?: string | null }): ToolCheckOut {
  const { body } = args;
  const output = nesneVeyaNull(args.output);
  const ins = arr(output?.instructions);
  const ex = kayitlar(output?.exercises);
  const gostergeler = arr(output?.progressIndicators);
  const hard: string[] = [];
  if (output && ins.length === 0) hard.push("yonerge_yok");

  const baslik = str(output?.title).trim();
  const scores: Record<string, number> = {
    baslik_80: baslik.length > 0 && uzunluk(baslik) <= 80 ? 1 : 0,
    adim_bicimi: frac(ins, (s) => typeof s === "string" && ADIM.test(s)),
    adim_sayisi: between(ins.length, 3, 8),
    materyal: between(metinOgeler(output?.materials).length, 1, 6),
    egzersiz: ex.length ? between(ex.length, 1, 4) * frac(ex, (e) => dolu(e.name) && dolu(e.description) && dolu(e.repetitions)) : 0,
    gosterge: between(metinOgeler(gostergeler).length, 2, 5),
    gosterge_olculebilir: frac(gostergeler, olculebilir),
    alanlar: alanlarDolu(output, ["objective", "therapistNotes", "homeExercise"]),
  };
  // Öğrenci seçiliyse (rumuz var) uzman notunda ad bir kez geçmeli. Rumuz yoksa ölçülecek şey yok: puan yazılmaz.
  // Ham çıktı çözülemediyse ya da uzman notu metin değilse kanıtlanamaz: 0.
  if (args.alias) scores.isim_kullanimi = adGeciyorMu(str(args.raw?.therapistNotes), args.alias) ? 1 : 0;

  const kokler = odakKokleri(body.focusArea ?? "");
  const kartMetni = lower([str(output?.title), str(output?.objective), ...ex.flatMap((e) => [str(e.name), str(e.description)])].join(" "));
  const odak = kokler.length ? (kokler.some((k) => kartMetni.includes(k)) ? 1 : 0) : 1;

  return {
    scores: { ...scores, talimat: output ? mean(Object.values(scores)) : 0 },
    details: {
      adim: ins.length,
      egzersiz: ex.length,
      materyal_sayisi: metinOgeler(output?.materials).length,
      gosterge_sayisi: metinOgeler(gostergeler).length,
      amac_cumle: countSentences(str(output?.objective)),
      odak,
      ...scores,
    },
    hard,
  };
}
