// apps/hub/evals/tools/studio/matching-game/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { alanlarDolu, countSentences, frac, kayitlar, lower, mean, nesneVeyaNull, str, turkceMi } from "../../../lib/sharedChecks";

export interface MatchingGameBody {
  matchType: "definition" | "image_desc" | "synonym" | "antonym" | "category" | "sentence";
  pairCount: "6" | "8" | "10" | "12";
  difficulty: "easy" | "medium" | "hard";
  theme?: string;
  goalTitle?: string;
}
type Rec = Record<string, unknown>;

/** Kart karşılaştırması: büyük/küçük harf, noktalama ve boşluk farkı yok sayılır. */
const norm = (v: unknown) => lower(str(v)).replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
const sozcukSayisi = (s: string) => (s.trim() ? s.trim().split(/\s+/u).length : 0);
const dolu = (v: unknown) => str(v).trim().length > 0;

/** Kelime kartında sözcük sınırı: normalde üç (birleşik ifade payı); zor düzeyde beş (prompt: "zor: … deyimler",
    "iki ayağını bir pabuca sokmak"). */
const kartSiniri = (zor: boolean) => (zor ? 5 : 3);
/** "Kelime kartı" (prompt: eş/zıt anlamlı ve kategori kartları kelime): dolu, en çok `sinir` sözcük (`null`: sınırsız), cümle noktalaması yok.
    Sondaki TEK nokta kabul ("iri."): model kelimeyi noktayla kapatabilir, anlam ve eşleşme bozulmaz; ortadaki nokta, "..", "...", "…", "!" ve
    "?" kusurdur (cümle/boşluk işareti). */
const kelimeKarti = (v: unknown, sinir: number | null) => {
  const s = str(v).trim().replace(/(?<!\.)\.$/u, "").trimEnd();
  return s !== "" && (sinir === null || sozcukSayisi(s) <= sinir) && !/[.!?…]/u.test(s);
};
/** Cümle tamamlamada boşluk işareti: iki ya da daha çok alt çizgi (bitişik ya da boşlukla ayrık: "___", "_ _ _"), üç nokta/…,
    boş parantez/köşeli parantez, üç çizgi. Tek alt çizgi boşluk sayılmaz. */
const BOSLUK = /_(?:\s*_)+|…|\.{3,}|\(\s*\)|\[\s*\]|[-–—]{3,}/u;

/** Kart biçimi, route prompt'unun tür kurallarına göre (cardA sol kart, cardB sağ kart):
    - synonym/antonym ("gerçek eş/zıt anlamlı kelime çiftleri"): iki kart da kelime kartı;
    - category ("kelime + ait olduğu kategori"): A kelime kartı; B kategori adıdır ("Okulda kullanılan araç gereçler"): sözcük sınırından muaf,
      yalnız dolu ve cümle noktalaması yok;
    - definition ("kısa ve net tanımlar (1 cümle)"): A kelime kartı, B dolu ve en çok BİR cümle (tek sayısal kural prompt'ta bu);
    - image_desc ("görsel olarak tarif eden kısa açıklama"): A kelime kartı, B dolu ve en çok İKİ cümle (prompt cümle sayısı vermez, "kısa" der);
    - sentence ("boşluklu cümle + doğru kelime"): A boşluk işaretli, en az üç sözcüklü cümle; B kelime kartı.
    Kelime kartı sınırı `kartSiniri(zor)`. */
function kartBicimiDogru(tur: MatchingGameBody["matchType"], p: Rec, zor: boolean): boolean {
  const sinir = kartSiniri(zor);
  switch (tur) {
    case "synonym":
    case "antonym":
      return kelimeKarti(p.cardA, sinir) && kelimeKarti(p.cardB, sinir);
    case "category":
      return kelimeKarti(p.cardA, sinir) && kelimeKarti(p.cardB, null);
    case "definition":
      return kelimeKarti(p.cardA, sinir) && dolu(p.cardB) && countSentences(str(p.cardB)) <= 1;
    case "image_desc":
      return kelimeKarti(p.cardA, sinir) && dolu(p.cardB) && countSentences(str(p.cardB)) <= 2;
    case "sentence":
      return BOSLUK.test(str(p.cardA)) && sozcukSayisi(str(p.cardA)) >= 3 && kelimeKarti(p.cardB, sinir);
  }
}

/** Görsel beklentisi (prompt): resim açıklamasında HER çiftte; kelime–tanım ve somut kategoride cardA somut nesneyse görsel verilir
    ("bir oyunda ya TÜM çiftlerde ya HİÇBİRİNDE"); eş/zıt anlamlı ve cümle tamamlamada (soyut) HİÇBİRİNDE. Prompt tanımı hem soyut
    türlerin listesine ("tanım") hem de somut cardA kuralına sokar: çelişkili olduğundan tanımda iki sonuç da kabul. */
function gorselBeklentisiTamam(tur: MatchingGameBody["matchType"], gorselli: number, n: number): boolean {
  if (tur === "image_desc") return gorselli === n;
  if (tur === "category" || tur === "definition") return gorselli === 0 || gorselli === n;
  return gorselli === 0;
}

/** Eşleştirmeye özgü kontroller. JSON geçerliliği, dil kuralı, rumuz ve yasak kalıp `studioAdapter`da ortaktır.
    Rota `theme` ve `pairCount`'u ezer: bu alanlar puanlanmaz. `matchType`/`difficulty` ise modelin yankısı olarak KALIR ve arayüz
    ile PDF başlığı bunları okur (`MATCH_TYPE_LABEL[game.matchType]`): `tur_yankisi` bunu ölçer. `hint` prompt'ta OPSİYONELDİR
    ("zor eşleşmeler için, kısa"; arayüzde yalnız ekran tablosunda cevabın yanında görünür): puanlanmaz, sayısı ayrıntıdadır.
    Kural: bir puan yalnız çıktı prompt'un söylediği ya da arayüzün okuduğu bir şeyi bozuyorsa düşer; gerisi ayrıntı/hakem işidir. */
export function matchingGameChecks(args: { body: MatchingGameBody; output: unknown; raw?: Rec | null; text?: string; alias?: string | null }): ToolCheckOut {
  const { body } = args;
  const output = nesneVeyaNull(args.output);
  const pairs = kayitlar(output?.pairs);
  const n = pairs.length;
  const tur = body.matchType;
  const hard: string[] = [];
  if (output && n === 0) hard.push("cift_yok");

  const ciftSayisi = n === Number(body.pairCount) ? 1 : 0;
  const ciftDolu = frac(pairs, (p) => dolu(p.cardA) && dolu(p.cardB));
  // Tekrar: kategoride yalnız kart A tekil olmalı (aynı kategori adı birkaç kelimede meşru). Diğer türlerde iki kartın TÜM
  // metinleri ortak havuzda tekil olmalı: aynı cevap iki çiftte, ters çift ya da zincir ("büyük–iri", "iri–kocaman") eşleşmeyi belirsiz yapar.
  const anahtarlar = tur === "category" ? pairs.map((p) => norm(p.cardA)) : pairs.flatMap((p) => [norm(p.cardA), norm(p.cardB)]);
  const tekrarYok = anahtarlar.length ? new Set(anahtarlar).size / anahtarlar.length : 0;
  const komutlar = pairs.map((p) => str(p.visualPrompt).trim()).filter(Boolean);
  const gorselli = komutlar.length;
  const gorselTutarli = n && gorselBeklentisiTamam(tur, gorselli, n) ? 1 : 0;
  const farkli = frac(pairs, (p) => norm(p.cardA) !== norm(p.cardB));
  const idSirali = n ? pairs.filter((p, i) => p.id === i + 1).length / n : 0;
  const kartBicimi = frac(pairs, (p) => kartBicimiDogru(tur, p, body.difficulty === "hard"));
  const turYankisi = mean([output?.matchType === body.matchType ? 1 : 0, output?.difficulty === body.difficulty ? 1 : 0]);
  const alanlar = alanlarDolu(output, ["title", "instructions", "expertNotes", "adaptations"]);

  const scores: Record<string, number> = {
    cift_sayisi: ciftSayisi,
    cift_dolu: ciftDolu,
    tekrar_yok: tekrarYok,
    gorsel_tutarli: gorselTutarli,
    farkli,
    id_sirali: idSirali,
    kart_bicimi: kartBicimi,
    tur_yankisi: turYankisi,
    alanlar,
  };
  // İngilizce komut: yalnız görselin beklendiği türlerde ve yalnız dolu komutlar varken ölçülür. Komut yoksa dil kanıtlanamaz: puan
  // YAZILMAZ (eksiklik `gorsel_tutarli`da cezalanır; iki puanda sayılmaz, uydurma 1/0 da yok — comm-board ile aynı kural).
  if ((tur === "image_desc" || tur === "category" || tur === "definition") && komutlar.length) {
    scores.gorsel_ingilizce = frac(komutlar, (k) => !turkceMi(k));
  }
  return {
    scores: { ...scores, talimat: output ? mean(Object.values(scores)) : 0 },
    details: { cift: n, gorselli, ipuclu: pairs.filter((p) => dolu(p.hint)).length, ...scores },
    hard,
  };
}
