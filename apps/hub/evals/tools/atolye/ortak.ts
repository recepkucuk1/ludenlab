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
 * -mıyor/-miyor, -mamış/-memiş(tir), ve çift olumsuzluklu biçimler (-mamalı, -mamak, -maması: "mama"/"meme" içerenler).
 * Yalın `-ma/-me` (isim: "uygulama") ve "-ması/-mesi" (isim: "uygulaması") olumsuz DEĞİLDİR.
 */
const OLUMSUZ_FIIL = new RegExp(
  String.raw`^\p{L}{2,}?(?:(?:mama|meme)\p{L}*|m[ae]m[ıiuü]ş\p{L}*|m[ae]z\p{L}*|m[ae]y[ıi]n(?:[ıi]z)?|m[ae]y[ae]c[ae]k\p{L}*|m[ae]y[ae]n|m[ae]d[ae]n|m[ae]d[ıi]\p{L}*|m[ae]s[ıi]n|m[ıiuü]yor\p{L}*)$`,
  "u",
);
/** "-madan/-meden" iki anlamlıdır: "uygulamadan önce" = "uygulamadan ÖNCE" (olumsuz değil), "utandırmadan verin" = "utandırMAdan" (olumsuz). */
const MADAN = /m[ae]d[ae]n$/u;
const olumsuzFiil = (w: string, sonraki: string | undefined): boolean => OLUMSUZ_FIIL.test(w) && !(MADAN.test(w) && sonraki === "önce");

/** Kaçınma FİİLİ ("kaçının", "kaçınılır", "kaçınılacak", "kaçınılmalı", "kaçınmak", "kaçınarak"); isim "kaçınma" (promptun işlev adı) DEĞİL. */
const KACIN_FIIL = /^kaçın(?:ın(?:ız)?|ıl\p{L}*|ır\p{L}*|mak|mal[ıi]\p{L}*|acak\p{L}*|an|arak)$/u;
const BAGLAC = new Set(["ve", "veya", "ile", "ya", "da", "de", "ki"]);
/** Pencere sözcüğü tek başına olumsuzlamadır: değil(dir)/yok(tur)/yasak/asla/hiçbir. "değilse" (koşul) değildir. */
const DEGIL = /^(?:değil(?:dir)?|yok(?:tur)?|yasak\p{L}*|asla|hiçbir\p{L}*)$/u;

/**
 * Terimden SONRAKİ sözcükler (en çok 5; fiil/yerine/kaçınma penceresi ilk 3, değil/yok/yasak penceresi 5): aynı cümle ve aynı yan cümle (virgül/noktalı virgül);
 * ama terim kendi yan cümlesini BİTİRİYORSA ("Ceza, tehdit veya utandırma kullanılmaz": "ceza," sonrası boş) liste sayılır,
 * pencere sonraki yan cümleye geçer. Başka terimler (`r`) ve bağlaçlar ("ve", "veya") sayılmaz. İki nokta üst üste yan
 * cümle ayırmaz ("Time-out: uygulanmaz").
 */
function pencere(sonrasi: string, r: RegExp): string[] {
  const out: string[] = [];
  let kalan = sonrasi;
  while (out.length < 5) {
    const m = /^([^,;]*)([,;]?)/u.exec(kalan)!;
    const sozcukler = kelimeler(m[1]!.replace(r, " ")).filter((w) => !BAGLAC.has(w));
    out.push(...sozcukler);
    if (sozcukler.length > 0 || m[2] !== ",") break;
    kalan = kalan.slice(m[0].length);
  }
  return out.slice(0, 5);
}

/** Terim olumsuzlanmış mı? Yalnız terimin YANINA bakılır (cümlenin başka yerindeki olumsuz fiil terimi korumaz). */
function olumsuzTerim(cumle: string, bas: number, son: number, r: RegExp, karsit?: RegExp): boolean {
  const sonrasi = cumle.slice(son);
  const sonraki = kelimeler(sonrasi);
  const terim = kelimeler(cumle.slice(bas, son));
  const sonKelime = terim.at(-1) ?? "";
  // (1) Terimin kendi eki: "utandırmadan", "cezalandırmamalı", "mahrum etmeden", "cezasız".
  if (olumsuzFiil(sonKelime, sonraki[0]) || /(?:sız|siz)$/u.test(sonKelime)) return true;
  // (2) Hemen önünde "asla"/"hiçbir".
  const onceki = kelimeler(cumle.slice(0, bas)).at(-1);
  if (onceki === "asla" || (onceki?.startsWith("hiçbir") ?? false)) return true;
  // (3) Sonraki ≤3 sözcükte: olumsuz fiil, "yerine" (hemen), kaçınma fiili, değil/yok/yasak, "uzak dur".
  const w = pencere(sonrasi, r);
  for (let i = 0; i < w.length; i++) {
    const x = w[i]!;
    // "değil/yok/yasak/asla": cümle sonu yüklemi uzayabilir ("Sight words Türkçe için uygun değildir") → 5 sözcük
    if (DEGIL.test(x)) return true;
    if (i >= 3) continue;
    if (i === 0 && x === "yerine" && w[1] !== "koyma") return true;
    if (olumsuzFiil(x, w[i + 1]) || KACIN_FIIL.test(x)) return true;
    if (x === "uzak" && /^(?:dur|kal)/u.test(w[i + 1] ?? "")) return true;
  }
  // (4) Aracın karşıtlık işaretleri ("farklı olarak", "aksine"): terim olumlu önerilmiyor, kıyaslanıyor.
  return karsit !== undefined && karsit.test([sonKelime, ...w].join(" ")); // terim eki dahil: "sight words'ten farklı"
}

/** Başlık/etiket satırı bir "kaçınılacaklar" listesi mi ("Kaçınılacak stratejiler:", "Kullanılmayacak yöntemler")? Pasif olumsuz
    ortaç/gelecek ("-ılmayacak", "-nmayan", "-ılmaması gereken"), kaçınma fiili, yasak, uzak dur. Etkin "(utandırmayan, olumlu)" liste açmaz. */
const ETIKET_OLUMSUZ = new RegExp(
  [
    String.raw`(?<!\p{L})kaçın(?:ın(?:ız)?|ıl\p{L}*|ır\p{L}*|mak|mal[ıi]\p{L}*|acak\p{L}*|an|arak)(?!\p{L})`,
    String.raw`(?:ıl|il|ul|ül|n)(?:ma|me)(?:yacak|yecek|yan|yen|mas[ıi]|mes[ıi]|mal[ıi]|mel[ıi]|z)\p{L}*`,
    String.raw`(?:ma|me)(?:y[ıi]n(?:[ıi]z)?|mal[ıi]|mel[ıi])(?!\p{L})`,
    String.raw`yasak|uzak dur|istenmeyen`,
  ].join("|"),
  "u",
);
const etiketMi = (satir: string) => /^\s*#{1,6}\s/u.test(satir) || baslikMi(satir) !== null || /:\s*(?:\*\*|__)?\s*$/u.test(satir);

/**
 * `re`nin (tr-TR küçük harfe indirilmiş metinde, `u` bayraklı; `g` eklenir) OLUMSUZLAMASIZ geçişleri (eşleşen metinler).
 * Bir geçiş sayılmaz, eğer terimin YANINDA olumsuzlama varsa (bkz. `olumsuzTerim`) ya da bir madde/tablo satırıysa ve ait
 * olduğu başlık/etiket satırı kaçınılacaklar listesi açıyorsa. Etiket MİRASI yalnız başlıktan ya da ":" ile biten satırdan gelir,
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
    if (madde && ETIKET_OLUMSUZ.test(etiket)) continue;
    for (const cumle of satir.split(/(?<=[.!?…])\s+/)) {
      for (const m of cumle.matchAll(r)) {
        const son = m.index + m[0].length + /^['’]?\p{L}*/u.exec(cumle.slice(m.index + m[0].length))![0].length;
        if (!olumsuzTerim(cumle, m.index, son, r, karsit)) bulunan.push(m[0]);
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
