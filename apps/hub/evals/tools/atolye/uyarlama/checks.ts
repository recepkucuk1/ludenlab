// apps/hub/evals/tools/atolye/uyarlama/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { AYRAC, MADDE, TABLO, baslikMi, sections, type Section } from "../../../lib/markdown";
import { lower } from "../../../lib/sharedChecks";
import { derinlik, etiketNormalle, maddeler } from "../ortak";

export interface UyarlamaBody {
  ders?: string;
  ortam: "kaynastirma" | "ozel_egitim_sinifi" | "destek_egitim_odasi" | "ev";
  mebHedefKod?: string;
  mebDavranisKodlari?: string[];
}

/* ── Bölüm regex'leri: TEK KAYNAK (adapter `sections` ve gerekçe kapsamı bunları kullanır) ──
   Başlıklar küçük harfe indirilir ve `-`/`_` boşluğa çevrilir. `ortam`: başlıkta "bağlam" geçmiyorsa "ortam"/"zaman" — "Bağlam özeti (güçlük profili × ders × ortam)"
   başlığı ortam bölümünü karşılamaz (adapter'in yapı ölçümü ile gerekçe kapsamı AYNI kalıpla çalışır). */

/** Prompt: "1. Bağlam özeti 2. Sunum uyarlamaları 3. Yanıt/çıktı uyarlamaları 4. Ortam/zaman uyarlamaları 5. Değerlendirme/sınav uyarlamaları". */
export const UYARLAMA_BOLUMLERI = {
  baglam: /bağlam/,
  sunum: /sunum/,
  yanit: /yanıt|çıktı/,
  ortam: /^(?!.*bağlam).*(?:ortam|zaman)/,
  degerlendirme: /değerlendirme|sınav/,
} as const;
export const UYARLAMA_BOLUM_LISTESI: RegExp[] = Object.values(UYARLAMA_BOLUMLERI);

/* ── Gerekçe ────────────────────────────────────────────────────────────────────────────────────────
   Prompt: "6. Her madde için **kısa gerekçe** (hangi güçlüğe nasıl yardımcı)".
   Gerekçe yazılabilecek biçimler: "Gerekçe:" / "Neden:" / "Sebep:" etiketi, "çünkü …", parantez içi açıklama (≥ 8 karakter ve açıklama sözcüğü: "(okuma yükünü azaltır)"),
   tire/ok/iki nokta/noktalı virgül/son cümle KUYRUĞU ("— yükü azaltır", "**Renkli kodlama:** b/d karışıklığını önler.", "… yapılır. Bu, yükü hafifletir."; kuyrukta YÜKLEM BİÇİMİ kuralı: son sözcük etken çekimli fiil, uygulayıcı özne yok),
   tablonun "Gerekçe" sütunu, ayrı bir "Gerekçeler" bölümü.
   Puan = gerekçe sayısı / öneri maddesi sayısı (en çok 1): her madde için bir gerekçe. Yerleşim (madde içi, alt madde, kardeş madde, ardından gelen
   paragraf) önemsizdir; sayım satır/madde başınadır. */

/** Kesin gerekçe işaretleri (tr-TR küçük harfe indirilmiş metinde). */
const GEREKCE = new RegExp(
  [
    String.raw`gerekçe`,
    String.raw`(?<!\p{L})(?:neden|nedeni|sebep|sebebi)(?:\s*[:：–—]|\s+-\s)`,
    String.raw`çünkü|olduğu için|olduğundan`,
    String.raw`(?<!\p{L})(?:böylece|bu sayede|sayesinde|nedeniyle|dolayısıyla)(?!\p{L})`,
    String.raw`(?<!\p{L})bu (?:da|nedenle|yüzden)(?!\p{L})`, // ", bu da dikkat dağılmasını azaltır", "bu nedenle …", "bu yüzden …"
    String.raw`(?:[.!?…]\s+|\s[—–]\s+)bu,`, // ikinci cümle (cümle BAŞINDAKİ ilk "Bu," değil): "Bu, yükü hafifletir."
    String.raw`hangi güçlüğe`, // prompt: "hangi güçlüğe nasıl yardımcı"
    String.raw`(?:yardım ettiği|yardımcı olduğu) güçlü[kğ]`, // "→ Yardım ettiği güçlük: dikkat"
    String.raw`(?<!\p{L})(?:amaç|etki|fayda|yarar)\s*[:：]`,
  ].join("|"),
  "u",
);
/** Gerekçe cümlesinin tipik içeriği: güçlüğe nasıl yardım ettiği ya da hangi güçlükten kaynaklandığı (etki fiilleri, güçlük adları). Yalın "için"
    bilerek yok ("5. sınıf için" parametredir); parametre parantezleri ("günde 10 dakika", "renkli ve plastik") bu sözcükleri taşımaz. */
const ACIKLAMA = new RegExp(
  [
    "azalt|yardım|destek|kolaylaş|önle|artır|sağla|güçlendir|telafi|hafiflet|dengele|engel|odaklan|geliştir|pekiştir|rahatla|etkile",
    "kıl(?:ar|ıcı)|olur|olabilir|öngörülebilir|yük(?:ü|ün|le)?(?!\\p{L})",
    "dikkat|zorlan|zorlu[kğ]|güçlü[kğ]|sorun|ihtiyaç|kaygı|panik|stres|gerginlik|yorgun|yavaş|bellek|çözümleme|akıcı|güven|motivasyon|odak",
  ].join("|"),
  "u",
);
/** KUYRUK biçimlerinde İKİNCİ yol: bilinen etki fiilleri (etken biçimler: azaltır/önler/kolaylaştırır/hafifletir/destekler/telafi eder/yardımcı olur/…; EDİLGEN -ıl-/-en-:
    sağlanır, desteklenir, artırılır, azaltılır ve yalın ad sayılmaz). Birinci yol `aktifYuklem` (yüklem biçimi) bu listede olmayan etken fiilleri de yakalar ("kaygıyı düşürür",
    "yorgunluğu giderir"). Parantez ("(yük azalır)"), etiket, "çünkü" ve tablo/bölüm biçimleri `ACIKLAMA`yı kullanır. */
const ETKI_FIILI = new RegExp(
  `(?<!\\p{L})(?:${[
    String.raw`azalt(?:ır|abilir|ıyor|mak|arak)`, String.raw`azal(?:ır|abilir|ıyor)`,
    String.raw`hafiflet(?:ir|ebilir|iyor|erek|mek)`, String.raw`hafifl(?:er|eyebilir|iyor)`,
    String.raw`önle(?:r|yebilir|yerek|yici|mek)`, String.raw`engelle(?:r|yebilir|yerek|mek)`,
    String.raw`kolaylaştır(?:ır|abilir|ıyor|arak|mak|ıcı)`, String.raw`kolaylaş(?:ır|abilir)`,
    String.raw`yardımcı ol(?:ur|abilir|uyor|maktadır)`, String.raw`yardım ed(?:er|ebilir|iyor)`, String.raw`destek ol(?:ur|abilir|uyor|maktadır)`,
    String.raw`destekle(?:r|yebilir|yerek|yici|mek)`, String.raw`telafi ed(?:er|ebilir|iyor)`,
    String.raw`sağla(?:r|yabilir|yarak|yıcı|mak)`, String.raw`güçlendir(?:ir|ebilir|erek|mek)`, String.raw`pekiştir(?:ir|ebilir|erek|mek)`,
    String.raw`geliştir(?:ir|ebilir|erek|mek)`, String.raw`artır(?:ır|abilir|ıyor|arak|mak)`, String.raw`dengele(?:r|yebilir|yerek|mek)`,
    String.raw`rahatlat(?:ır|abilir|arak|mak)`, String.raw`kıl(?:ar|abilir|arak|ıcı)`,
    String.raw`korur|hızlandırır|sakinleştirir|iyileştirir|odaklan(?:ır|abilir|masını|ması)`,
  ].join("|")})`,
  "u",
);
/** Parantez içi örnek/kısaltma gerekçe değildir: "(ör. ekran okuyucu)". */
const ORNEK = /^\s*(?:ör|örn|vb|bkz|gibi)(?!\p{L})/u;
const PARANTEZ = /\(([^()]{8,})\)/gu;
const KISALTMA = /(?<!\p{L})(ör|örn|vb|vs|vd|bkz|dk|sn)\./gu;
/** Açıklama kuyrukları (ilk ayraçtan sonrası): tire/ok ("— yükü azaltır"), iki nokta ("**Renkli kodlama:** b/d karışıklığını önler.") ve SON cümle ("… yapılır. Yükü azaltır."). */
const KUYRUKLAR = [/(?:\s[—–]\s|\s-\s|\s?(?:→|⇒|->)\s?)(.{8,})$/u, /:\s+(.{8,})$/u, /;\s+(.{8,})$/u, /[.!?…]\s+([^.!?…]{8,}[.!?…]?)$/u];

/* ── Yüklem biçimi kuralı (kuyruk biçimleri) ──
   Kuyruk, son sözcüğü ETKEN çekimli fiil olduğunda gerekçedir: geniş zaman (ünlü + r: düşürür, giderir, kaldırır, tanır, getirir, verir, kalkar, artar, eder, olur, indirir,
   netleştirir, yapılandırır) ya da ek-fiil (-dır/-tır: "okuma hızı yavaştır"). Değil: EDİLGEN (-ıl-/-ın- hemen önünde: sağlanır, desteklenir, okunur, tutulur; etken istisnalar tanır,
   kazanır, güçlenir…), ÇOĞUL AD (-lar/-ler: kartlar), gereklilik (-malıdır; ek-fiil -dır/-tır yalnız güçlük/etki sözcüğüyle), tek sözcük ve UYGULAYICI öznesiyle başlayan betimleme ("Öğretmen ek süre sağlar.",
   "Akran okuma desteği sağlar."). Heuristiktir; BİLİNEN SINIR: etken geniş zamanla biten betimleme ("sınav süresi %50 uzar.", "yönerge tek adım içerir.") gerekçe sayılır. */
/** Özne olarak çıplak ad (ya da çoğulu): "Öğretmen ek süre sağlar."; yönelme/belirtme ekli ("öğrenciye yeterli süre tanır") nesnedir, özne değildir. */
const AJAN = /^(?:öğretmen|akran|öğrenci|veli|aile|uzman|ebeveyn)(?:ler|lar)?(?!\p{L})/u;
/** Öğrenci özneli kuyruk yalnız öğrencinin KENDİ sonucuyla gerekçedir ("Öğrenci rahatlar"); "Öğrenci tahtaya yakın oturur" betimlemedir. */
const OGRENCI_SONUC = new Set(["rahatlar", "sakinleşir", "güçlenir", "gelişir", "toparlanır", "kazanır", "kurtulur", "ilerler", "odaklanır", "başarır"]);
/** "-ıl-/-ın-" edilgeni gibi görünen ama ETKEN olan fiiller. */
const PASIF_ISTISNA = new Set(["tanır", "kazanır", "güçlenir", "dinlenir", "yenilenir", "inanır", "uyanır", "sanır", "bulur", "bilir", "gülür", "silir"]);
const ABILIR_ISTISNA = new Set(["bul", "bil"]);
/** "-ar/-er/-lar/-ler" ile biten ama çoğul ad OLMAYAN etken fiiller. */
const AKTIF_LER = new Set(["rahatlar", "toparlar", "toplar", "bağlar", "yeniler", "hatırlar", "algılar"]); // önler/dengeler/hafifler/engeller ikinci yolda (ETKI_FIILI) yakalanır
/** Ünlü + r ile biten (ya da -tur/-dır görünümlü) ama gerekçe yüklemi olmayan sık sözcükler: ad, sıfat, edat, varlık sözcükleri ("her 15 dakikada bir", "formül kartı var", "yönerge tekrar"). */
const FIIL_DEGIL = new Set(["yer", "kadar", "hazır", "ağır", "zor", "ayar", "ortar", "bir", "var", "vardır", "yoktur", "tekrar", "her"]);
/** Ek-fiil (-dır/-dir/-dur/-dür; sert ünsüzden sonra -tır/-tir/-tur/-tür: "yavaştır", "nettir"). Nedensel geniş zaman "-t-ır" (azaltır, uzatır, kısaltır: ünlü/l öncesi) ek-fiil DEĞİLDİR. */
const EK_FIIL = /(?:d[ıiuü]r|(?<=[çfhkpsşt])t[ıiuü]r)$/u;
/** Ek-fiilli kuyruk ("okuma hızı yavaştır") yalnız güçlüğü/etkiyi söyleyen bir sözcük taşıyorsa gerekçe; "ek süre 20 dakikadır", "sınıf sessizdir" betimlemedir. */
const ZORLUK = /yavaş|zor|güçlü[kğ]|dikkat|yorgun|kaygı|stres|panik|sorun|eksik|yetersiz|düşük|sınırlı|karmaşık|yük/u; // "zor" zorluk/zorlu'yu da kapsar
/** Belirtme (+ iyelik) ekli nesne ("dikkatini", "bilgisini", "konuyu", "kartları"): ardından gelen -lar/-ler ÇOĞUL değil fiildir ("dikkatini toplar"). "aynı", "yeni" eşleşmez. */
const BELIRTME_EKLI = /(?:[ıiuü]n[ıiuü]|y[ıiuü]|l[ae]r[ıi])$/u; // + çoğul belirtme: "kartları düzenler"
const EDILGEN = /(?:[ıiuü]l|[aeıioöuü]n)$/u;

/** `w` (küçük harf, tek sözcük) EDİLGEN geniş zaman mı? "-abilir/-ebilir" önce soyulur: "azaltabilir" etken, "kullanılabilir" edilgen. */
function edilgenMi(w: string): boolean {
  if (PASIF_ISTISNA.has(w)) return false;
  if (/[ae]bilir$/u.test(w)) {
    const kok = w.slice(0, -6);
    return !ABILIR_ISTISNA.has(kok) && EDILGEN.test(kok);
  }
  return /(?:[ıiuü]l|[aeıioöuü]n)[ıiuü]r$/u.test(w);
}

function aktifYuklem(sozler: string[], metin: string): boolean {
  const w = sozler.at(-1) ?? "";
  if (sozler.length < 2 || FIIL_DEGIL.has(w)) return false;
  if (!/[aeıioöuü]r$/u.test(w)) return false; // geniş zaman ve -dır/-tır (ünlü + r)
  if (/m[ae]l[ıi]d[ıi]r$/u.test(w)) return false; // -malıdır/-melidir (gereklilik): "Dikkatli uygulanmalıdır."
  if (EK_FIIL.test(w)) return ZORLUK.test(metin); // ek-fiil ("yavaştır"): yalnız güçlük/etki sözcüğüyle
  if (edilgenMi(w)) return false;
  if (/l[ae]r$/u.test(w) && !AKTIF_LER.has(w) && !BELIRTME_EKLI.test(sozler.at(-2) ?? "")) return false; // çoğul ad (nesneden sonra gelen -lar/-ler fiildir)
  return true;
}

/** Kuyruğun SON cümlesi/yan cümlesi (". ! ? … ;" sonrası): uygulayıcı ve yüklem denetimi buna yapılır — ilk cümle betimleme, son cümle "Öğretmen … eder" olabilir. */
const sonCumle = (t: string): string => t.split(/[.!?…;]\s+/u).map((x) => x.trim()).filter(Boolean).at(-1) ?? t;

/** Tek bir kuyruk gerekçe mi: ÖRNEK değil; SON cümle uygulayıcı özneyle başlamıyor (öğrenci yalnız kendi sonucuyla); yüklem biçimi ya da bilinen etki fiili. */
function kuyrukGerekce(kuyruk: string): boolean {
  const tum = kuyruk.trim();
  const t = sonCumle(tum);
  if (ORNEK.test(t)) return false;
  const sozler = t.match(/\p{L}+/gu) ?? []; // noktalama ve işaretler sözcük sayılmaz
  const ajan = AJAN.exec(t)?.[0];
  if (ajan) return /^öğrenci/u.test(ajan) && OGRENCI_SONUC.has(sozler.at(-1) ?? "");
  return aktifYuklem(sozler, t) || ETKI_FIILI.test(t);
}

/** Gerekçe etiketiyle BAŞLAYAN madde/satır: önceki maddenin gerekçesidir, ayrı bir öneri değildir. */
const GEREKCE_ETIKETI = /^(?:gerekçe\p{L}*|neden\p{L}*|sebe[pb]\p{L}*|hangi güçlüğe|(?:yardım ettiği|yardımcı olduğu) güçlü[kğ]|amaç|etki|fayda|yarar)(?:\s*[:：–—]|\s+-\s)/u;
const sadeGerekce = (madde: string) => GEREKCE_ETIKETI.test(etiketNormalle(madde));

function gerekceVar(madde: string): boolean {
  const t = lower(madde);
  if (GEREKCE.test(t)) return true;
  for (const m of t.matchAll(PARANTEZ)) if (!ORNEK.test(m[1]!) && ACIKLAMA.test(m[1]!)) return true;
  const kisaltmasiz = t.replace(KISALTMA, "$1"); // "vb. destekleyici araçlar…": kısaltma noktası cümle sonu değildir
  return KUYRUKLAR.some((re) => {
    const k = re.exec(kisaltmasiz)?.[1];
    return Boolean(k && kuyrukGerekce(k));
  });
}

const hucreler = (satir: string) => satir.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
const GEREKCE_SUTUNU = /gerekçe|neden|sebep|yardımcı|açıklama|güçlü[kğ]|etki|fayda|amaç/u;

/** Başlığında "Gerekçe/Neden…" sütunu olan tabloların dolu gerekçe hücreli gövde satırlarına " gerekçe" işareti ekler
    (sütun başlığı satıra girmediği için satır metni gerekçeyi taşımaz). */
function tabloGerekceleriniIsaretle(lines: string[]): string[] {
  const out = [...lines];
  for (let k = 0; k + 1 < lines.length; k++) {
    if (!TABLO.test(lines[k]!) || AYRAC.test(lines[k]!) || !AYRAC.test(lines[k + 1]!)) continue;
    const s = hucreler(lines[k]!).findIndex((c) => GEREKCE_SUTUNU.test(lower(c)));
    if (s < 0) continue;
    for (let m = k + 2; m < lines.length && TABLO.test(lines[m]!) && !AYRAC.test(lines[m]!); m++) {
      if ((hucreler(lines[m]!)[s] ?? "").replace(/[\s*_`]/g, "").length >= 4) out[m] = `${lines[m]!} gerekçe`;
    }
  }
  return out;
}

/* ── Bölüm kapsamı ── */

type Sinif = "oneri" | "gerekce" | "diger";
const BAGLAM = UYARLAMA_BOLUMLERI.baglam;
const ONERI_BOLUMLERI = [UYARLAMA_BOLUMLERI.sunum, UYARLAMA_BOLUMLERI.yanit, UYARLAMA_BOLUMLERI.ortam, UYARLAMA_BOLUMLERI.degerlendirme];
/** Başlık sınıfı: bağlam özeti öneri değildir (başlığında "ortam" geçse bile); dört öneri bölümünden biri → öneri; "Gerekçeler" → ayrı gerekçe bölümü. */
function sinifla(heading: string): Sinif {
  if (BAGLAM.test(heading)) return "diger";
  if (ONERI_BOLUMLERI.some((r) => r.test(heading))) return "oneri";
  return /gerekçe/.test(heading) ? "gerekce" : "diger";
}

/** Öneri bölümleri ve ayrı gerekçe bölümleri (alt başlıkları dahil). Kök kalın sözde başlıksa kalın kardeşler (şablon başlığı olmayanlar) alt bölümdür. */
function kapsam(text: string): { oneri: Section[]; gerekce: Section[] } {
  const oneri: Section[] = [];
  const gerekce: Section[] = [];
  let kok: { sinif: Sinif; d: number; kalin: boolean } | null = null;
  for (const s of sections(text)) {
    const d = derinlik(s);
    const kendi = sinifla(s.heading);
    const kalinKardes = kok?.kalin && s.level === "bold" && kendi === "diger" && !BAGLAM.test(s.heading);
    // Öneri bölümünün içindeki daha derin ("**Gerekçeler**" gibi) gerekçe başlığı kendi bölümünü başlatır.
    const gerekceBasladi = kendi === "gerekce" && kok?.sinif === "oneri";
    if (kok && kok.sinif !== "diger" && !gerekceBasladi && (d > kok.d || kalinKardes)) {
      (kok.sinif === "oneri" ? oneri : gerekce).push(s);
      continue;
    }
    kok = kendi === "diger" ? null : { sinif: kendi, d, kalin: s.level === "bold" };
    if (kendi === "oneri") oneri.push(s);
    else if (kendi === "gerekce") gerekce.push(s);
  }
  return { oneri, gerekce };
}

/** Maddeye girmeyen, girintisiz paragraf satırı ("*Gerekçe:* …" gibi maddelerin ardından gelen açıklama). */
const paragrafMi = (l: string) => l.trim() !== "" && !MADDE.test(l) && !TABLO.test(l) && !/^\s/.test(l) && !baslikMi(l);

/** Ayrı "Gerekçeler" bölümü: her madde, tablo satırı ve etiketli paragraf ("**Renkli kodlama:** b/d karışıklığını önler.") bir gerekçedir; kalın etiketin
    kendisi başlık sayılmışsa ("**Renkli kodlama**" + altında açıklama) o alt bölüm tek gerekçedir. Bölümün kendi başlığı ("Gerekçeler") sayılmaz. */
function ayriGerekceSayisi(s: Section): number {
  if (s.level === "bold" && !/gerekçe/.test(s.heading)) return s.lines.some((l) => l.trim()) ? 1 : 0;
  const etiketli = s.lines.filter((l) => paragrafMi(l) && (/^\s*\*\*/.test(l) || /^[^:]{2,60}:\s*\S/.test(l))).length;
  return maddeler(s.lines).length + etiketli;
}

export interface GerekceSayimi {
  /** Öneri maddesi sayısı (gerekçe-only maddeler hariç). */
  madde: number;
  /** Gerekçe sayısı. */
  gerekce: number;
}

export function gerekceSayimi(text: string): GerekceSayimi {
  const { oneri, gerekce } = kapsam(text);
  // Hiçbir öneri bölümü yoksa (başlık adı sapması ya da başlıksız metin) metnin tamamındaki maddeler.
  const kapsamLari = oneri.length ? oneri.map((s) => s.lines) : [text.split("\n").filter((l) => !baslikMi(l))];
  let madde = 0;
  let sayi = 0;
  for (const lines of kapsamLari) {
    const isli = tabloGerekceleriniIsaretle(lines);
    const maddeler_ = maddeler(isli);
    madde += maddeler_.filter((m) => !sadeGerekce(m)).length;
    sayi += maddeler_.filter(gerekceVar).length;
    sayi += isli.filter((l) => paragrafMi(l) && GEREKCE_ETIKETI.test(etiketNormalle(l))).length;
  }
  for (const s of gerekce) sayi += ayriGerekceSayisi(s);
  return { madde, gerekce: sayi };
}

export function uyarlamaChecks(args: { body: UyarlamaBody; text: string }): ToolCheckOut {
  const { madde, gerekce } = gerekceSayimi(args.text);
  // Madde yoksa (düzyazı) ölçülecek madde yok: metindeki gerekçe işaretleri en az 3 ise 1.
  const isaret = (lower(args.text).match(new RegExp(GEREKCE.source, "gu")) ?? []).length;
  const scores = { gerekce: madde > 0 ? Math.min(1, gerekce / madde) : Math.max(gerekce, isaret) >= 3 ? 1 : 0 };
  return { scores, details: { gerekce_madde: madde, gerekce_sayisi: gerekce, ...scores }, hard: [] };
}
