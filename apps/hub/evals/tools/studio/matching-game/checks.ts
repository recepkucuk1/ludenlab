// apps/hub/evals/tools/studio/matching-game/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { countSentences, frac, kayitlar, lower, mean, nesneVeyaNull, str } from "../../../lib/sharedChecks";
import { turkceMi } from "../comm-board/checks";

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

/** "Kelime kartı" (prompt: eş/zıt anlamlı ve kategori kartları kelime): dolu, en çok üç sözcük (deyim/birleşik ifade payı),
    cümle noktalaması yok. */
const kelimeKarti = (v: unknown) => {
  const s = str(v).trim();
  return s !== "" && sozcukSayisi(s) <= 3 && !/[.!?…]/u.test(s);
};
/** Cümle tamamlamada boşluk işareti: iki ya da daha çok alt çizgi, üç nokta/…, boş parantez/köşeli parantez, üç çizgi. */
const BOSLUK = /_{2,}|…|\.{3,}|\(\s*\)|\[\s*\]|[-–—]{3,}/u;

/** Kart biçimi, route prompt'unun tür kurallarına göre (cardA sol kart, cardB sağ kart):
    - synonym/antonym ("gerçek eş/zıt anlamlı kelime çiftleri") ve category ("kelime + ait olduğu kategori"): iki kart da kelime kartı;
    - definition ("kısa ve net tanımlar (1 cümle)") ve image_desc ("kısa açıklama"): A kelime kartı, B dolu ve en çok bir cümle;
    - sentence ("boşluklu cümle + doğru kelime"): A boşluk işaretli, en az üç sözcüklü cümle; B kelime kartı. */
function kartBicimiDogru(tur: MatchingGameBody["matchType"], p: Rec): boolean {
  switch (tur) {
    case "synonym":
    case "antonym":
    case "category":
      return kelimeKarti(p.cardA) && kelimeKarti(p.cardB);
    case "definition":
    case "image_desc":
      return kelimeKarti(p.cardA) && dolu(p.cardB) && countSentences(str(p.cardB)) <= 1;
    case "sentence":
      return BOSLUK.test(str(p.cardA)) && sozcukSayisi(str(p.cardA)) >= 3 && kelimeKarti(p.cardB);
  }
}

/** Eşleştirmeye özgü kontroller. JSON geçerliliği, dil kuralı, rumuz ve yasak kalıp `studioAdapter`da ortaktır.
    Rota `theme` ve `pairCount`'u ezer: bu alanlar puanlanmaz. `matchType`/`difficulty` ise modelin yankısı olarak KALIR ve arayüz
    ile PDF başlığı bunları okur (`MATCH_TYPE_LABEL[game.matchType]`): `tur_yankisi` bunu ölçer. `hint` prompt'ta OPSİYONELDİR
    ("zor eşleşmeler için, kısa"; arayüzde yalnız ekran tablosunda cevabın yanında görünür): puanlanmaz, sayısı ayrıntıdadır. */
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
  // Prompt: soyut türlerde (eş/zıt anlamlı, tanım, cümle tamamlama) HİÇBİR çiftte görsel yok; resim açıklamasında HER çiftte;
  // somut kategoride ya hepsinde ya hiçbirinde ("bir oyunda ya TÜM çiftlerde ya HİÇBİRİNDE").
  const gorselBeklentisi = tur === "image_desc" ? gorselli === n : tur === "category" ? gorselli === 0 || gorselli === n : gorselli === 0;
  const gorselTutarli = n && gorselBeklentisi ? 1 : 0;
  const farkli = frac(pairs, (p) => norm(p.cardA) !== norm(p.cardB));
  const idSirali = n ? pairs.filter((p, i) => p.id === i + 1).length / n : 0;
  const kartBicimi = frac(pairs, (p) => kartBicimiDogru(tur, p));
  const turYankisi = mean([output?.matchType === body.matchType ? 1 : 0, output?.difficulty === body.difficulty ? 1 : 0]);
  const alanlar = mean(["title", "instructions", "expertNotes", "adaptations"].map((k) => (dolu(output?.[k]) ? 1 : 0)));

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
  // İngilizce komut: yalnız görselin beklendiği türlerde ve yalnız dolu komutlarda ölçülür (eksiklik `gorsel_tutarli`da
  // cezalanır, iki puanda sayılmaz; komut yoksa kusur kanıtlanmamıştır: 1).
  if (tur === "image_desc" || tur === "category") scores.gorsel_ingilizce = komutlar.length ? frac(komutlar, (k) => !turkceMi(k)) : 1;
  return {
    scores: { ...scores, talimat: output ? mean(Object.values(scores)) : 0 },
    details: { cift: n, gorselli, ipuclu: pairs.filter((p) => dolu(p.hint)).length, ...scores },
    hard,
  };
}
