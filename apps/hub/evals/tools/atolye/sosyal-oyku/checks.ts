// apps/hub/evals/tools/atolye/sosyal-oyku/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import type { Section } from "../../../lib/markdown";
import { TABLO, TASLAK_NORM, derinlik, notNormalize, sections } from "../../../lib/markdown";
import { countSentences, lower } from "../../../lib/sharedChecks";
import { bolumAgaci, olumluGecisler } from "../ortak";

export interface SosyalOykuBody {
  durum: string;
  bakisAcisi: "birinci_kisi" | "ucuncu_kisi";
  hedefBeceri?: string;
  mebHedefKod?: string;
  mebDavranisKodlari?: string[];
}

/* ── Bölüm regex'leri: TEK KAYNAK (adapter `sections` bunları kullanır; öykü bölümünün sınırı da buradan) ──
   Prompt: "1. **Sosyal öykü metni** … 2. **Görsel / sahneleme önerisi** … 3. **Kullanım yönergesi** …". Model başlığı "Sosyal Hikâye" /
   "Yönerge" diye yumuşatabilir; kabul. Başlıklar küçük harfe indirilmiş gelir. */
export const SOSYAL_OYKU_BOLUMLERI = {
  oyku: /öykü|hikâye|hikaye/,
  gorsel: /görsel|sahneleme/,
  kullanim: /kullanım|yönerge/,
} as const;
export const SOSYAL_OYKU_BOLUM_LISTESI: RegExp[] = Object.values(SOSYAL_OYKU_BOLUMLERI);

/** Öykü olmayan şablon bölümleri (kalın sözde başlıkta öykü bölümünün nerede bittiğini de bu belirler). */
const DIGER_BOLUMLER = new RegExp(`${SOSYAL_OYKU_BOLUMLERI.gorsel.source}|${SOSYAL_OYKU_BOLUMLERI.kullanim.source}`, "u");
/** Öykü bölümü başlığı: "öykü/hikâye" geçer ve başlık görsel/sahneleme/kullanım/yönerge İLE BAŞLAMAZ ("Görsel öneri (öykü için)" öykü değildir). */
const OYKU_BASLIGI = new RegExp(`^(?!(?:${DIGER_BOLUMLER.source}))(?:.*)(?:${SOSYAL_OYKU_BOLUMLERI.oyku.source})`, "u");
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ── Öykü kökü ve alt bölümleri ──
   Model öykü kökünün altına öykü OLMAYAN alt bölümler koyar: `### Başlık: "…"` + künye tablosu, `### Öykü`, `### Metin Notları` (so-01); öykü satırları + `### Metne
   İlişkin Notlar` (so-02); `### Öykü (8 cümle)` + `### Uzman Notları (metni uyarlarken)` (so-04). Cümle sayımı ve bakış açısı yalnız öykü metnine bakmalıdır: notlar ve
   künye prompt'un "KISA" ölçütünü bozmaz. */

/** Meta alt bölüm başlığı (normalleştirilmiş, tr-TR küçük harf): notlar ("Metin Notları", "Metne İlişkin Notlar", "Uzman Notu"; `not` yalnız sözcük olarak, Türkçe
    ekleriyle — "noter", "notasyon" değil), künye, öğrenci bilgileri, açıklama, ipuçları, uyarılar. */
const META_ALT = /(?<!\p{L})not(?:u|lar|ları|un|a)?(?!\p{L})|künye|bilgi|açıklama|ipu[cç]|uyarı/u;
/** `### Başlık: "…"` alt bölümü başlık + künye taşır, öykü değildir. Kalın sözde başlıkta (`**Başlık: Sınavda Mola Zamanı**`) satır öykünün kendi başlığıdır ve
    altındaki satırlar öyküdür; dışlanmaz. */
const BASLIK_ALT = /başlık/u;
const metaMi = (s: Section) => META_ALT.test(s.heading) || (s.level !== "bold" && BASLIK_ALT.test(s.heading));
/** Kök altında öykü metnini taşıyan alt bölüm (`### Öykü`, `### Öykü (8 cümle)`, `### Öykü metni`, `### Metin`; meta değilse). Varsa yalnız o sayılır: kökün kendi
    satırları (giriş cümlesi, künye) ve diğer alt bölümler öykü değildir. */
const OYKU_ALT = new RegExp(`${SOSYAL_OYKU_BOLUMLERI.oyku.source}|metin`, "u");
/** Üst başlık ("## Sosyal Öykü ve Duygu Düzenleme Taslağı: …") künye/giriş taşır; öykü kardeş "## 1. Sosyal Öykü Metni" kökündedir → taslak başlıklı aday en sona. */
const TASLAK_BASLIK = /taslak|taslağ/u;
/** Tablo satırları (künye) ve `sections`ın ayrıştırmadığı başlık satırları (`#`, `#####`) öykü satırı değildir. */
const oykuSatiriDegil = (l: string) => TABLO.test(l) || /^\s*#{1,6}\s/.test(l);
const satirlari = (secs: Section[]) => secs.flatMap((s) => s.lines).filter((l) => !oykuSatiriDegil(l));
const dolu = (satirlar: string[]) => satirlar.some((l) => l.trim());

/** `alt[i]` öykü alt bölümünün alt ağacı (indeksler): kendisi + altındaki daha derin bölümler (`### Öykü` → `#### Giriş`, `**Çözüm**`); meta olanlar (`#### Not`) atılır. */
function oykuAltAgaci(alt: Section[], i: number): number[] {
  const out = [i];
  for (let j = i + 1; j < alt.length && derinlik(alt[j]!) > derinlik(alt[i]!); j++) if (!metaMi(alt[j]!)) out.push(j);
  return out;
}

/** Kök ağacını öykü metnine daraltır: öykü alt bölümü varsa yalnız o (alt ağacıyla; birden fazlası birlikte); yoksa kökün kendi satırları + meta olmayan alt bölümler. */
function daralt(agac: Section[]): string[] {
  const [kok, ...alt] = agac as [Section, ...Section[]];
  const secili = new Set<number>();
  alt.forEach((s, i) => {
    if (!secili.has(i) && !metaMi(s) && OYKU_ALT.test(s.heading)) for (const j of oykuAltAgaci(alt, i)) secili.add(j);
  });
  return satirlari(secili.size ? alt.filter((_, i) => secili.has(i)) : [kok, ...alt.filter((s) => !metaMi(s))]);
}

/** Üst başlık (## Sosyal Öykü Taslağı) altında şablon bölümleri alt başlık olarak dizilmişse görsel/kullanım bölümleri öykünün parçası değildir: ilk şablon bölümünde kesilir. */
function kes(agac: Section[]): Section[] {
  const kesim = agac.findIndex((s, i) => i > 0 && DIGER_BOLUMLER.test(s.heading));
  return kesim < 0 ? agac : agac.slice(0, kesim);
}

/** Öykü bölümünün satırları: yalnız öykü metni (künye tablosu, başlık/not alt bölümleri ve tablo satırları dışarıda).
    Kök adayları başlığında "öykü" geçen bölümlerdir, sırayla; taslak başlıklı üst başlık en sona (yalnız künye taşıyabilir, öykü kardeş kökte). Her aday şablon alt
    bölümünde kesilir ve öykü metnine daraltılır; dolu çıkan ilk aday alınır. Hiçbiri dolu değilse ilk adayın tüm satırları (öykü, meta sayılan bir `### Başlık: …` alt
    bölümünün altında kalmış olabilir). Başlığında "öykü" geçen bölüm yoksa şablon dışı ilk bölüm ("## Sıramı Beklemek"); hiç başlık yoksa metnin tamamı.
    Aynı normalleştirilmiş başlık iki kez geçerse (`bolumAgaci` ilk eşleşmeyi verir) ikincisi incelenmez — bugünkü davranış. */
function oykuSatirlari(text: string): string[] {
  const secs = sections(text);
  const oykuKokleri = secs.filter((s) => OYKU_BASLIGI.test(s.heading));
  let kokler = [...oykuKokleri.filter((s) => !TASLAK_BASLIK.test(s.heading)), ...oykuKokleri.filter((s) => TASLAK_BASLIK.test(s.heading))];
  if (!kokler.length) {
    const ilk = secs.find((s) => !DIGER_BOLUMLER.test(s.heading));
    if (!ilk) return text.split("\n");
    kokler = [ilk];
  }
  const agaclar = kokler.map((k) => kes(bolumAgaci(text, new RegExp(`^${esc(k.heading)}$`, "u"), DIGER_BOLUMLER))).filter((a) => a.length);
  for (const agac of agaclar) {
    const d = daralt(agac);
    if (dolu(d)) return d;
  }
  return agaclar.length ? satirlari(agaclar[0]!) : [];
}

/* ── Cümle sayımı (öykü bölümünde) ── */

const MADDE_ISARETI = /^\s*(?:>\s*)*(?:[-*+•]|\d+[.)])\s+/;
/** Öyküdeki cümleler: satır satır sayılır (madde/alıntı/numara işaretleri ve biçim işaretleri atılır); noktalamasız satır da bir cümledir.
    Yatay çizgi, "(sahne notu)", iki noktayla biten kısa etiket satırı ve taslak notu cümle değildir. */
function cumleSayisi(satirlar: string[]): number {
  let n = 0;
  for (const ham of satirlar) {
    const l = ham.replace(MADDE_ISARETI, "").replace(/[*_`~]/g, "").trim();
    if (!l || /^[-–—=\s]+$/.test(l)) continue;
    if (/^[([].*[)\]]$/.test(l)) continue;
    if (l.endsWith(":") && l.split(/\s+/).length <= 8) continue;
    if (l.startsWith("⚠") || notNormalize(l).includes(TASLAK_NORM)) continue;
    n += countSentences(l);
  }
  return n;
}

/* ── Bakış açısı ── */

/** Ben zamirleri ve "kendim…" (tr-TR küçük harf, tek sözcük). */
const BEN_ZAMIRI = /^(?:ben|benim|bana|beni|bende|benden|benimle|benimki|bence|kendim(?:e|i|de|den|le)?)$/u;
/** Zamirsiz ama KESİN birinci kişi ekleri: -(ı)yorum, -acağım/-eceğim, -malıyım/-meliyim ("yorum" adı bunlardan biri değildir: önünde ünlü + y gerekir). */
const KESIN_EK = /^\p{L}+(?:[ıiuü]yorum|(?:acağ|eceğ)[ıi]m|mal[ıi]y[ıi]m|mel[ıi]y[ıi]m)$/u;
/** Geniş birinci kişi ekleri (yalnız "birinci kişi istendi mi"de, en az İKİ kez; üçüncü kişi ihlali için fazla belirsiz): aorist -rım/-rim, geçmiş -dım,
    -mışım, istek -ayım/-eyim. Kök en az 2 harf; `ADLAR` ekle karışan sık adlardır ("durum", "yardım", "yarım"). */
const GENIS_EK = /^\p{L}{2,}(?:(?:ar|er|ır|ir|ur|ür|r)(?:ım|im|um|üm)|(?:dı|di|du|dü|tı|ti|tu|tü)m|(?:mış|miş|muş|müş)(?:ım|im|um|üm)|[ae]y[ıi]m)$/u;
const ADLAR = new Set(["durum", "kurum", "yorum", "yarım", "yardım", "tarım", "karım", "kerim", "devrim", "dürüm", "derim"]);

const sozcukler = (s: string): string[] => lower(s).match(/\p{L}+/gu) ?? [];
const kesinBirinci = (kelime: string) => BEN_ZAMIRI.test(kelime) || KESIN_EK.test(kelime);
const genisBirinci = (kelime: string) => !ADLAR.has(kelime) && GENIS_EK.test(kelime);
/** Alıntı içi konuşma ("Ben de oynamak istiyorum" dedi) anlatıcının ağzı değildir; üçüncü kişi ihlalinde dışlanır. Düz tek tırnak yalnız kelime dışında açılıp kapanırsa
    alıntıdır (Türkçe ek kesmesi — "Efe'nin" — harfe bitişiktir, alıntı sayılmaz). */
const alintisiz = (s: string) => s.replace(/“[^”]*”|"[^"]*"|«[^»]*»|‘[^’]*’|(?<![\p{L}\d])'[^'\n]+'(?![\p{L}\d])/gu, " ");

/* ── Duygunun "kötü/yanlış" diye çerçevelenmesi ── */

const DEGER = String.raw`(?:kötü|yanlış|ayıp|günah|çirkin)`;
/** `his` yalnız ad olarak: "hissetmek/hissediyorum/hissettirir" fiilleri (his+s+e+t/d…) ad değildir ("kendimi kötü hissederim" öykünün istediği dildir). */
const HIS = String.raw`his(?!s?e[dt])`;
const DUYGU_ADI = String.raw`(?:${HIS}|duygu)\p{L}*`;
/** Duygu adı + değer yargısı: "kötü bir duygu/his", "yanlış duygular", "utanç verici bir his". */
const SORU = String.raw`(?!\s+(?:bir\s+şey\s+)?m[ıiuü](?!\p{L}))`;
const ISIM_TAMLAMA = String.raw`(?:${DEGER}|utanç verici|utanılacak)\s+(?:bir\s+)?${DUYGU_ADI}${SORU}`;
/** Duygu/duygusal tepki özne + değer yüklemi: "kızmak kötü(dür)", "korkmak ayıptır", "kızgınlık her zaman yanlış", "duygular kötüdür".
    Araya yalnız pekiştirici sözcükler girebilir ("ama", "normaldir" girmez: "Kızmak normaldir ama kötü sözler …" bir duygu yargısı değildir). Değer sözcüğünün
    ardından "hissettirir/hisseder" gelirse yargı değil durum anlatımıdır; "kötü bir şey mi?" bir soru, "kötü bir duygu mu?" bir sorudur (retorik soru yargı değildir). */
const DUYGU_OZNESI = String.raw`(?<!\p{L})(?:kızmak|kızmanın|kızgın olmak|kızgınlık|öfkelenmek|öfke|sinirlenmek|ağlamak|korkmak|korku|üzülmek|üzüntü|utanmak|utanç|kıskanmak|kıskançlık|heyecanlanmak|endişelenmek|endişe|kaygılanmak|kaygı|hissetmek|${DUYGU_ADI})`;
const PEKISTIRICI = String.raw`(?:çok|her|zaman|bazen|hep|tamamen|gerçekten|aslında|bile|de|da|bir|mutlaka)`;
const YUKLEM = String.raw`${DEGER}(?:tır|tir|dır|dir|dur|dür)?(?!\p{L})(?!\s+(?:bir\s+)?hiss?e[dt])${SORU}`;
const OZNE_YUKLEM = String.raw`${DUYGU_OZNESI}\s+(?:${PEKISTIRICI}\s+){0,2}${YUKLEM}`;
const KOTU_CERCEVE = new RegExp(`(?<!\\p{L})${ISIM_TAMLAMA}|${OZNE_YUKLEM}`, "u");
/** Terim olumlu önerilmiyor, aktarılıyor ya da reddediliyor: "… kötü olduğunu düşünme" (olumsuz emir; bitişik olumsuzlama dedektörü "-me"yi ad sayar), "kötü olduğunu söyler,
    ama bu doğru değil" (aktarma), "kötü bir şey gibi gelir ama değildir" (görünüm), "kötü sanılır". */
const KARSIT = /(?<!\p{L})(?:düşünme|sanma|zannetme|inanma|söyleme|deme)(?!\p{L})|olduğunu\s+(?:düşün|san|zannet|söyle|de|iddia|inan)\p{L}*|gibi\s+(?:gel|görün|his)\p{L}*|(?:sanıl|zannedil|düşünül)\p{L}*/u;

export function sosyalOykuChecks(args: { body: SosyalOykuBody; text: string }): ToolCheckOut {
  const { body, text } = args;
  // Prompt: "Sosyal öykü metni — yaşa/düzeye göre KISA (DEHB için 5–8 cümle)". Öykü bölümünde 3–10 cümle (5–8 ±2); dar sınır profile göre
  // değiştiği için (DEHB'de 5–8, diğerlerinde "yaşa/düzeye göre") ince ayrım hakemin `kisalik` ölçütündedir.
  const satirlar = oykuSatirlari(text);
  const n = cumleSayisi(satirlar);
  const kisalik = n >= 3 && n <= 10 ? 1 : 0;

  // Prompt: "Bakış açısı: birinci kişi (ben dili) / üçüncü kişi". Öykü bölümünde bakılır. Birinci kişi: ben zamiri ya da herhangi bir birinci kişi eki
  // (Türkçe'de zamir sık düşer: "Sıramı beklerim"; zamirsiz geniş ekler en az iki kez: ad/fiil karışıklığına karşı); alıntılar dahil (varlık yeter).
  // Üçüncü kişi: alıntı DIŞINDA kesin birinci kişi işareti yok.
  const oyku = satirlar.join("\n");
  const tum = sozcukler(oyku);
  const disarida = sozcukler(alintisiz(oyku));
  const kesin = disarida.filter(kesinBirinci);
  const benVar = tum.some(kesinBirinci) || tum.filter(genisBirinci).length >= 2;
  const bakisAcisi = body.bakisAcisi === "birinci_kisi" ? (benVar ? 1 : 0) : kesin.length ? 0 : 1;

  // Prompt: "Duyguyu \"kötü/yanlış\" diye çerçeveleme — duygu geçerli, davranış seçilebilir". Tüm metin taranır. Olumsuzlama korumalı: "Kızmak kötü
  // bir şey DEĞİLDİR" ve "Hiçbir duygu kötü ya da yanlış değildir" promptun istediği dildir.
  const kotu = olumluGecisler(text, KOTU_CERCEVE, KARSIT);
  const duyguCercevesi = kotu.length ? 0 : 1;

  const scores = { kisalik, bakis_acisi: bakisAcisi, duygu_cercevesi: duyguCercevesi };
  return { scores, details: { oyku_cumle: n, ben_isaret: kesin.length, kotu_cerceve: kotu.join("|"), ...scores }, hard: [] };
}
