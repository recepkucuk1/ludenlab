// apps/hub/evals/tools/atolye/ortak.ts
import { mebToPrompt } from "@atolye/lib/meb-program";
import { MADDE, TABLO, baslikMi } from "../../lib/markdown";
import { lower } from "../../lib/sharedChecks";

/* Atölye araçlarının (seans planı, davranış, okuma…) kontrollerinde ortak yardımcılar:
   bölüm ağacı ve madde çözümü (`lib/markdown`dan yeniden dışa aktarılır), "yasaklı şey ÖNERİLİYOR mu" taraması
   (bitişik olumsuzlama korumalı) ve hakemin göreceği MEB satırları. */

export { bolumAgaci, bolumSatirlari, derinlik, maddeler } from "../../lib/markdown";

/* ── Olumsuzlama: "ceza KULLANILMAZ" bir ihlal değildir; "uymazsa ceza verin" ihlaldir ── */

const KELIME = /\p{L}+(?:['’\-–]\p{L}+)*/gu;
const kelimeler = (s: string): string[] => s.match(KELIME) ?? [];

/**
 * Olumsuz fiil KELİMESİ (tr-TR küçük harf): kök + olumsuzluk eki `-ma/-me` + zaman/kip eki —
 * -maz/-mez(lar), -mayın/-meyin(iz), -mayacak/-meyecek, -mayan/-meyen, -madan/-meden, -madı/-medi(k), -masın/-mesin,
 * -mıyor/-miyor, -mayız/-meyiz, -mam/-mem, -maksızın/-meksizin, -mamış/-memiş(tir), ve çift olumsuzluklu biçimler (-mamalı, -mamak,
 * -maması: "mama"/"meme" içerenler).
 * Yalın `-ma/-me` (isim: "uygulama") ve "-ması/-mesi" (isim: "uygulaması") olumsuz DEĞİLDİR.
 */
const OLUMSUZ_FIIL = new RegExp(
  String.raw`^\p{L}{2,}?(?:(?:mama|meme)\p{L}*|m[ae]m[ıiuü]ş\p{L}*|m[ae]z\p{L}*|m[ae]y[ıi]n(?:[ıi]z)?|m[ae]y[ıi]z|m[ae]ks[ıi]z[ıi]n|m[ae]m|m[ae]y[ae]c[ae]k\p{L}*|m[ae]y[ae]n|m[ae]d[ae]n|m[ae]d[ıi]\p{L}*|m[ae]s[ıi]n|m[ıiuü]yor\p{L}*)$`,
  "u",
);
/** "-madan/-meden" iki anlamlıdır: "uygulamadan önce" = "uygulamadan ÖNCE" (olumsuz değil), "utandırmadan verin" = "utandırMAdan" (olumsuz). */
const MADAN = /m[ae]d[ae]n$/u;
/** "tamam" "-mam" gibi görünür ama olumsuz fiil değildir. */
const olumsuzFiil = (w: string, sonraki: string | undefined): boolean => w !== "tamam" && OLUMSUZ_FIIL.test(w) && !(MADAN.test(w) && sonraki === "önce");

/** Kaçınma FİİLİ ("kaçının", "kaçınılır", "kaçınılacak", "kaçınılmalı", "kaçınmak", "kaçınarak"); isim "kaçınma" (promptun işlev adı) DEĞİL. */
const KACIN_FIIL = /^kaçın(?:ın(?:ız)?|ıl\p{L}*|ır\p{L}*|mak|mal[ıi]\p{L}*|acak\p{L}*|an|arak)$/u;
const BAGLAC = new Set(["ve", "veya", "ile", "ya", "da", "de", "ki"]);
/** Pencere sözcüğü tek başına olumsuzlamadır: değil(dir)/yok(tur)/yasak/asla/hiçbir. "değilse" (koşul) değildir. */
const DEGIL = /^(?:değil(?:dir)?|yok(?:tur)?|yasak\p{L}*|asla|hiçbir\p{L}*)$/u;

/**
 * Çekimli fiil (yan cümlenin yüklemi; "ve"den hemen önce): pasif geniş zaman (uygulanır, verilir), şimdiki zaman (-iyor), emir (uygulayın, verin,
 * yapın), ek-fiil (-dır), sık etken geniş zaman (uygular, yapar, verir). Heuristik ve KISA: isimler ("oyun", "çocuğun") ve fiilimsiler ("vermek")
 * çekimli sayılmaz; listede olmayan çekimli fiil "ve"yi bölmez (bilinen sınır, ortak.selftest'te).
 */
const SONLU = new RegExp(
  [
    String.raw`\p{L}{2,}?(?:(?:ıl|il|ul|ül|n)[ıiuü]r(?:lar|ler)?|[ıiuü]yor(?:lar|um|sun|uz)?|y[ıi]n(?:[ıi]z)?|[dt][ıiuü]r(?:lar|ler)?)`,
    String.raw`(?:ver|yap|ed|gönder|bırak|çıkar|al|koy|göster|sun|kullan|öğret|anlat|tut)(?:in|ın|un|ün)(?:iz|ız)?`,
    String.raw`(?:uygula|yap|ver|gönder|bırak|çıkar|kullan|uyar|iste)(?:r|ır|ir|ar|er)(?:lar|ler)?`,
  ]
    .map((x) => `^(?:${x})$`)
    .join("|"),
  "u",
);
/** Terimi TARİF eden sözcükler: "Time-out süresince çocuk oynayamaz" = time-out UYGULANIYOR (olumsuz yüklem çocuğundur, terimin değil). */
const TARIF = new Set(["süresince", "sırasında", "boyunca", "sonrasında", "alan", "verilen", "uygulanan"]);
/** İyelik/belirtme ekli ad ("yaklaşımı", "listesi"): "phonics yaklaşımı yerine" = phonics yaklaşımının yerine. */
const IYELIK = /[ıiuü]$/u;

/** Fiilimsi ("vermek", "uygulama", "göndermeyi", "yapılması"): `yerine`den hemen önce gelirse "X-mek yerine" = X'in YERİNE (X reddedilir). */
const FIILIMSI = /m[ae]k$|m[ae](?:y[ıi]|s[ıi])?$/u;

/**
 * Terimden SONRAKİ sözcükler ve yüklem. Terimin YAN CÜMLESİ virgül/noktalı virgül/dikey çizgi (tablo hücresi) ve karşıt bağlaçla
 * ("ama", "fakat", "ancak"…) biter; iki nokta üst üste ayırmaz ("Time-out: uygulanmaz"). Başka terimler (`r`) ve bağlaçlar ("ve",
 * "veya") sayılmaz. Türkçe'de yüklem sondadır: `son` = yan cümlenin SON sözcüğü (uzaklığa bakılmaz: "Time-out bu yaş grubunda önerilmez").
 * Terim kendi yan cümlesini BİTİRİYORSA:
 *  - virgülle ise liste sayılır ("Ceza, tehdit, utandırma kullanılmaz"): pencere ve yüklem virgüllü listenin SON yan cümlesine taşınır
 *    ("Time-out, ters etki yaptığı için önerilmez");
 *  - hücre/noktalı virgülle ise yalnız bir sonraki parçaya geçilir ("| Time-out | uygulanmaz |").
 */
function kloz(sonrasi: string, r: RegExp): { w: string[]; son: string | undefined } {
  const parca = sonrasi.replace(/\s(?:ama|fakat|ancak|lakin|oysa)(?=\s)/gu, ",").split(/([,;|])/u);
  const sozcuk = (p: string | undefined) => {
    const tum = kelimeler((p ?? "").replace(r, " "));
    // "… time-out uygulanır VE o gün yıldız verilmez": çekimli fiilden sonraki "ve" yeni bir yan cümle başlatır (yüklem terimin değildir).
    const kes = tum.findIndex((x, i) => x === "ve" && i > 0 && SONLU.test(tum[i - 1]!));
    return (kes < 0 ? tum : tum.slice(0, kes)).filter((x) => !BAGLAC.has(x));
  };
  const ilk = sozcuk(parca[0]);
  if (ilk.length > 0) return { w: ilk.slice(0, 5), son: ilk.at(-1) };
  const ayirac = parca[1];
  if (ayirac === "|" || ayirac === ";") {
    const t = sozcuk(parca[2]);
    return { w: t.slice(0, 5), son: t.at(-1) };
  }
  if (ayirac !== ",") return { w: [], son: undefined };
  const kuyruk: string[][] = [];
  for (let k = 2; k < parca.length; k += 2) {
    kuyruk.push(sozcuk(parca[k]));
    if (parca[k + 1] !== ",") break;
  }
  return { w: kuyruk.flat().slice(0, 5), son: kuyruk.at(-1)?.at(-1) };
}

/** Terim olumsuzlanmış mı? Yalnız terimin YANINA bakılır (cümlenin başka yerindeki olumsuz fiil terimi korumaz). */
function olumsuzTerim(cumle: string, bas: number, son: number, r: RegExp, karsit?: RegExp): boolean {
  const sonrasi = cumle.slice(son);
  const sonraki = kelimeler(sonrasi);
  const terim = kelimeler(cumle.slice(bas, son));
  const sonKelime = terim.at(-1) ?? "";
  // (1) Terimin kendi eki: "utandırmadan", "cezalandırmamalı", "mahrum etmeden", "cezasız".
  if (olumsuzFiil(sonKelime, sonraki[0]) || /(?:sız|siz)$/u.test(sonKelime)) return true;
  // (2) Hemen önünde "asla"/"hiçbir"/"ne" ("Ne ceza ne de time-out": ikincisinde "ne de").
  const once = kelimeler(cumle.slice(0, bas));
  const onceki = once.at(-1);
  if (onceki === "asla" || onceki === "ne" || (onceki === "de" && once.at(-2) === "ne") || (onceki?.startsWith("hiçbir") ?? false)) return true;
  // Terim tarif ediliyor ("Time-out süresince … oynayamaz"): sonraki olumsuz yüklem terimin değil; karşıtlık işaretleri de aranmaz.
  if (TARIF.has(sonraki[0] ?? "")) return false;
  // (3) Yan cümlenin SON sözcüğü olumsuz yüklem ("…önerilmez", "…yer almaz", "…görülmez"): uzaklığa bakılmaz.
  const { w, son: yuklem } = kloz(sonrasi, r);
  if (yuklem !== undefined && (olumsuzFiil(yuklem, undefined) || KACIN_FIIL.test(yuklem) || DEGIL.test(yuklem))) return true;
  // (4) Pencere: ilk 3 sözcükte olumsuz fiil / kaçınma fiili / "uzak dur"; 5 sözcükte değil/yok/yasak; "yerine".
  for (let i = 0; i < w.length; i++) {
    const x = w[i]!;
    // "değil/yok/yasak/asla": cümle sonu yüklemi uzayabilir ("Sight words Türkçe için uygun değildir") → 5 sözcük
    if (DEGIL.test(x)) return true;
    if (i >= 3) continue;
    if (olumsuzFiil(x, w[i + 1]) || KACIN_FIIL.test(x)) return true;
    if (x === "uzak" && /^(?:dur|kal)/u.test(w[i + 1] ?? "")) return true;
  }
  // "yerine": hemen sonra ("Mola odası yerine…"); araya TEK sözcük girerse yalnız o fiilimsi ("Ceza vermek yerine…") ya da iyelik ekli ad
  // ("phonics yaklaşımı yerine…") ise; daha uzaksa yerine'den hemen önceki sözcük fiilimsiyse ("Phonics kurallarını aktarmak yerine…").
  // "Mola odasını ödül yerine kullanın", "Mola odası sakin köşe yerine uygulanır" = olumlu öneri (ödülün/sakin köşenin YERİNE mola odası).
  const y = w.slice(0, 4).indexOf("yerine");
  if (y >= 0 && w[y + 1] !== "koyma" && (y === 0 || FIILIMSI.test(w[y - 1]!) || (y === 1 && IYELIK.test(w[0]!)))) return true;
  // (5) Aracın karşıtlık işaretleri ("farklı olarak", "aksine"): terim olumlu önerilmiyor, kıyaslanıyor.
  return karsit !== undefined && karsit.test([sonKelime, ...w].join(" ")); // terim eki dahil: "sight words'ten farklı"
}

/**
 * Başlık/etiket (iki nokta öncesi) bir "kaçınılacaklar" LİSTESİ mi? Yalnız şu üç durumda:
 *  - kaçınma fiili / "uzak dur": "Kaçınılacak yöntemler:", "Kaçınılacak durum:";
 *  - olumsuz fiil + bir YÖNTEM adı (nesne): "Kullanılmayacak yöntemler:", "Önerilmeyen yaklaşımlar:", "Yapılmaması gereken davranışlar:";
 *    ya da gösterme zamiri nesne ("Şunları kullanmayın:");
 *  - olumsuz fiilin TEK başına etiket olması: "Kullanmayın:", "Yasak:".
 * "Taviz vermeyin:", "Pazarlık etmeyin:", "Bağırma kabul edilmez:", "Kural ihlali tolere edilmez:" bir liste AÇMAZ (nesnesi yöntem değil:
 * iki noktadan sonrası ÖNERİLEN şeydir); "Unutmayın:" ve "İstenmeyen davranış olduğunda:" da açmaz.
 */
const KACIN_ETIKET = /(?<!\p{L})(?:kaçın(?:ın(?:ız)?|ıl\p{L}*|ır\p{L}*|mak|mal[ıi]\p{L}*|acak\p{L}*|an|arak)|uzak dur\p{L}*)(?!\p{L})/u;
const NEG_ETIKET = new RegExp(
  [
    // pasif olumsuz ortaç/gelecek, yalnız "yöntem" fiilleriyle: "kullanılmayacak", "uygulanmayan"
    String.raw`(?:kullanıl|uygulan|yapıl|öneril|veril|başvurul|edil)(?:ma|me)(?:yacak|yecek|yan|yen|mas[ıi]|mes[ıi]|mal[ıi]|mel[ıi]|z)\p{L}*`,
    // etken olumsuz emir/gereklilik: yalnız bu fiillerle ("Unutmayın" açmaz)
    String.raw`(?:kullan|uygula|yap|öner|ver|başvur|tercih et|et)(?:ma|me)(?:y[ıi]n(?:[ıi]z)?|mal[ıi]|mel[ıi])(?!\p{L})`,
    String.raw`yasak|istenmeyen (?:yöntem|strateji|uygulama|yaklaşım|teknik)`,
  ].join("|"),
  "u",
);
const YONTEM_ADI = /(?<!\p{L})(?:(?:yöntem|strateji|teknik|yaklaşım|davranış|araç|müdahale|tutum)\p{L}*|uygulama(?:lar\p{L}*)?(?!\p{L}))/u;
const GOSTERME = /(?<!\p{L})(?:şunları|bunları|şunlar|bunlar|aşağıdakileri|aşağıdakiler)(?!\p{L})/u;
function etiketOlumsuz(etiket: string): boolean {
  const e = lower(etiket); // işaretler (`#`, `**`, `-`, `:`) sözcük sayımını ve eşleşmeyi etkilemez (`kelimeler` yalnız harf alır)
  if (KACIN_ETIKET.test(e)) return true;
  return NEG_ETIKET.test(e) && (kelimeler(e).length === 1 || YONTEM_ADI.test(e) || GOSTERME.test(e));
}
const etiketMi = (satir: string) => /^\s*#{1,6}\s/u.test(satir) || baslikMi(satir) !== null || /:\s*(?:\*\*|__)?\s*$/u.test(satir);

/**
 * `re`nin (tr-TR küçük harfe indirilmiş metinde, `u` bayraklı; `g` eklenir) OLUMSUZLAMASIZ geçişleri (eşleşen metinler).
 * Bir geçiş sayılmaz, eğer terimin YANINDA olumsuzlama varsa (bkz. `olumsuzTerim`), ya da aynı CÜMLEDE iki noktadan ÖNCE kaçınılacaklar etiketi
 * varsa (`etiketOlumsuz`), ya da bir madde/tablo satırıysa ve ait olduğu başlık/etiket satırı kaçınılacaklar listesi açıyorsa. Etiket MİRASI yalnız başlıktan ya da ":" ile biten satırdan gelir,
 * önceki paragraftan gelmez. Eşleşme kelime sonuna uzatılır ("mola odasına" → ek de terimin parçasıdır).
 * `karsit`: terimin ≤5 sözcük sonrasında geçtiğinde eşleşmeyi iptal eden karşıtlık kalıbı ("aksine", "farklı olarak").
 * Cümleler satır sonunda ve ". ! ? …" + boşlukta bölünür ("3.2.5" bölünmez); tablo hücreleri (`|`) aynı satırda sürer.
 */
export function olumluGecisler(text: string, re: RegExp, karsit?: RegExp): string[] {
  const r = new RegExp(re.source, "gu");
  const bulunan: string[] = [];
  let etiket = ""; // en yakın madde-dışı satır, yalnız başlık/":" satırıysa
  for (const satir of lower(text).split("\n")) {
    if (!satir.trim()) continue;
    const madde = MADDE.test(satir) || TABLO.test(satir);
    if (!madde) etiket = etiketMi(satir) ? satir : "";
    if (madde && etiketOlumsuz(etiket)) continue;
    for (const cumle of satir.split(/(?<=[.!?…])\s+/)) {
      // Aynı cümlede olumsuz etiket ("**Kaçınılacak yöntemler:** time-out, ceza"): iki noktadan sonrası O CÜMLENİN kaçınılan şeyleridir;
      // sonraki cümleler taranır ("Kaçınılacak durum: gecikme. Gecikirse time-out uygulayın." → ihlal).
      const iki = cumle.indexOf(":");
      const tara = iki >= 0 && etiketOlumsuz(cumle.slice(0, iki)) ? cumle.slice(0, iki) : cumle;
      for (const m of tara.matchAll(r)) {
        const son = m.index + m[0].length + /^['’]?\p{L}*/u.exec(tara.slice(m.index + m[0].length))![0].length;
        if (!olumsuzTerim(tara, m.index, son, r, karsit)) bulunan.push(m[0]);
      }
    }
  }
  return bulunan;
}

/** Kaba, terimsiz yardımcı: cümlede olumsuz fiil / kaçınma fiili / değil-yok-yasak var mı. `olumluGecisler` bunu KULLANMAZ
    (koruma terime bitişik aranır); yalnız başka araçların hızlı yoklaması için durur. */
export function olumsuzMu(cumle: string): boolean {
  const w = kelimeler(lower(cumle));
  return w.some((x, i) => olumsuzFiil(x, w[i + 1]) || KACIN_FIIL.test(x) || DEGIL.test(x) || (x === "uzak" && /^(?:dur|kal)/u.test(w[i + 1] ?? ""))) || /(?<!\p{L})yerine(?!\s+koy)/u.test(lower(cumle));
}

/** Hakem görevi için MEB satırları: kod + aracın modele verdiği hedef bloğu (`mebToPrompt`; hedef davranış metinleri
    hakemin "MEB hedef davranışlarına hizmet ediyor mu" ölçütünü yargılayabilmesi için gerekir). Kod yoksa boş. */
export function mebSatirlari(kod: string | undefined, davranisKodlari: string[] = []): string[] {
  if (!kod) return [];
  const blok = mebToPrompt({ hedefKod: kod, davranisKodlari });
  return [`- MEB hedef kodu: ${kod}`, ...(blok ? blok.split("\n") : [])];
}
