// apps/hub/evals/tools/atolye/materyal/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { AYRAC, TABLO, TASLAK_NORM, baslikMi, notNormalize } from "../../../lib/markdown";
import { lower } from "../../../lib/sharedChecks";
import { bolumAgaci, etiketNormalle, olumsuzMu } from "../ortak";

export interface MateryalBody {
  materyalTuru: "calisma_yapragi" | "etkinlik" | "okuma_metni" | "alistirma";
  konu: string;
  zorlukVaryanti: "tek" | "kolay_orta" | "kolay_orta_ileri";
  cevapAnahtari: boolean;
  mebHedefKod?: string;
  mebDavranisKodlari?: string[];
}

/* ── Bölüm regex'leri: TEK KAYNAK (adapter `sections` bunları kullanır) ──
   Altıncı "Cevap anahtarı" bölümü BİLEREK yok: istenmediğinde prompt "ekleme" der, yokluğu yapı hatası olamaz; varlığı/doluluğu `cevap_anahtari`da. */

/** Prompt: "1. Başlık + hedeflenen kazanım 2. Öğretmen için uygulama yönergesi 3. Materyal gövdesi 4. Zorluk varyantları 5. Sınıf-içi farklılaştırma / uyarlama notları". */
export const MATERYAL_BOLUMLERI = {
  baslik: /başlık|kazanım/,
  yonerge: /uygulama yönergesi|öğretmen/,
  govde: /materyal gövdesi|gövde/,
  varyant: /zorluk varyant/,
  farklilastirma: /farklılaştırma|uyarlama/,
} as const;
export const MATERYAL_BOLUM_LISTESI: RegExp[] = Object.values(MATERYAL_BOLUMLERI);

/** Şablonun diğer bölümleri: kalın sözde başlık kökünde bölümün nerede bittiği (`bolumAgaci` `durak`ı). */
const DIGER_BOLUMLER = /^(?:başlık|hedef|öğretmen|uygulama|materyal|zorluk|sınıf|farklılaştırma|uyarlama|kazanım)/;

/* ── Cevap anahtarı ─────────────────────────────────────────────────────────────────────────────────
   Prompt: cevapAnahtari=evet → "6. **Cevap anahtarı**"; hayır → "(Cevap anahtarı istenmedi — ekleme.)".
   İstendiyse anahtar DOLU olmalı; istenmediyse dolu bir anahtar OLMAMALI (model "istenmedi" notu düşebilir: o anahtar değildir).
   Anahtar üç biçimde bulunur (iki yönde de aynı): (1) başlık ("## Cevap anahtarı", "## Cevaplar", "## Doğru yanıtlar"), (2) etiketli satır
   ("Cevap anahtarı: 1) b 2) d", "Cevaplar: …"), (3) her maddenin altındaki satır-içi cevap ("Cevap: 8"). */

/** Başlık: "cevap anahtarı" her yerde; "cevaplar"/"yanıtlar"/"doğru cevap(lar)" başlığın BAŞINDA. */
const CEVAP = /(?:cevap|yanıt) anahtar\p{L}*|^(?:doğru )?(?:cevap|yanıt)lar(?!\p{L})|^doğru (?:cevap|yanıt)(?!\p{L})/u;
/** Etiketli satır (başlıkla AYNI adlar): içerik aynı satırda ve/veya sonraki başlığa kadarki satırlarda. */
const CEVAP_ETIKETI = /^(?:(?:cevap|yanıt) anahtar\p{L}*|(?:doğru )?(?:cevap|yanıt)lar)\s*[:–—-]\s*(.*)$/u;
/** Satır-içi cevap: "Cevap: 8", "Doğru cevap: b", "Doğru yanıt: b" — içerik yalnız aynı satırda ("Cevap: ____" çocuğun yazacağı boşluktur, cevap değil). Çıplak "Yanıt:" bilerek yok: çocuğa yönerge olabilir ("Yanıt: Evet / Hayır"). */
const CEVAP_SATIRI = /^(?:(?:doğru )?cevap|doğru yanıt)\s*[:–—-]\s*(\S.*)$/u;
/** Boşluk doldurma işareti: alt çizgi dizisi, üç nokta, kutu. */
const BOSLUK = /_{2,}|\.{3,}|…|[□☐]/u;

/** Cevap anahtarı bölümünde gerçek içerik sayılan satır: harf/rakam taşır; taslak notu değil ("⚠️ …TASLAKTIR" son bölümün sonuna düşer);
    "anahtar istenmedi/eklenmedi" gibi olumsuz bildirim değil. */
function gercekSatir(l: string): boolean {
  const t = l.trim();
  if (!/[\p{L}\p{N}]/u.test(t)) return false;
  if (t.startsWith("⚠") || notNormalize(t).includes(TASLAK_NORM)) return false;
  if (olumsuzMu(t) && /cevap|anahtar|yanıt|istenme|ekle/.test(lower(t))) return false;
  return true;
}
/** Tablo başlık satırı içerik değildir (ayraç satırının harf/rakamı yoktur: `gercekSatir` eler). */
const icerikSatirlari = (lines: string[]) => lines.filter((l, k) => !(TABLO.test(l) && AYRAC.test(lines[k + 1] ?? "x")) && gercekSatir(l));

function cevapDurumu(text: string): { bulundu: boolean; dolu: boolean; satirIci: number } {
  const satirlar = text.split("\n");
  // (3) satır-içi cevaplar: her satır tek başına; boşluk işareti taşıyan ("Cevap: ___ elma") ya da bildirim olan satır sayılmaz.
  const satirIci = satirlar.filter((l) => {
    const m = CEVAP_SATIRI.exec(etiketNormalle(l));
    return m !== null && !BOSLUK.test(l) && gercekSatir(m[1]!);
  }).length;
  // (1) başlık
  const agac = bolumAgaci(text, CEVAP, DIGER_BOLUMLER);
  if (agac.length) return { bulundu: true, dolu: icerikSatirlari(agac.flatMap((s) => s.lines)).length > 0 || satirIci > 0, satirIci };
  // (2) etiketli satır ("Cevap anahtarı: …") ve bir sonraki başlığa kadarki satırlar
  const i = satirlar.findIndex((l) => CEVAP_ETIKETI.test(etiketNormalle(l)));
  if (i < 0) return { bulundu: false, dolu: satirIci > 0, satirIci };
  const ilk = CEVAP_ETIKETI.exec(etiketNormalle(satirlar[i]!))![1]!;
  const sonra = satirlar.slice(i + 1);
  const son = sonra.findIndex((l) => baslikMi(l));
  return { bulundu: true, dolu: icerikSatirlari([ilk, ...(son < 0 ? sonra : sonra.slice(0, son))]).length > 0 || satirIci > 0, satirIci };
}

/* ── Zorluk varyantları ─────────────────────────────────────────────────────────────────────────────
   Prompt: "Zorluk varyantı: tek düzey | kolay + orta | kolay + orta + ileri" + "Zorluk varyantları (seçilen varyanta göre kolay/orta/ileri)".
   Seviye etiketi başlıkta (sözcük olarak: "Kolay düzey"; "kolaylaştırma"/"ortam"/"ilerleme" DEĞİL), kalın etiket/madde başında ya da tablo hücresinde. */

type Seviye = "kolay" | "orta" | "ileri";
/** "Zor" ileri düzeyin eş anlamlısı olarak etiketlenebilir; `zorluk`/`zorlu` bir etiket değildir (sözcük sınırı). */
const seviyeAdi = (s: string): Seviye => (s === "zor" ? "ileri" : (s as Seviye));
const GEREKEN: Record<MateryalBody["zorlukVaryanti"], Seviye[]> = { tek: [], kolay_orta: ["kolay", "orta"], kolay_orta_ileri: ["kolay", "orta", "ileri"] };
const ZORLUK_BOLUMU = /zorluk varyant/;
const SEVIYE_SOZU = /(?<!\p{L})(kolay|orta|ileri|zor)(?!\p{L})/gu;
const SEVIYE_BASI = /^(?:(?:varyant|düzey|seviye|zorluk|grup|kademe)\s*[a-z0-9]*\s*[:.)\-–—]*\s*|[a-c1-3][.)]\s*)?\(?(kolay|orta|ileri|zor)(?!\p{L})/u;

function seviyeler(satirlar: string[]): Set<Seviye> {
  const bulunan = new Set<Seviye>();
  for (const l of satirlar) {
    const b = baslikMi(l);
    if (b) {
      for (const m of b.heading.matchAll(SEVIYE_SOZU)) bulunan.add(seviyeAdi(m[1]!));
      continue;
    }
    const parcalar = TABLO.test(l) ? l.split("|") : [l];
    for (const p of parcalar) {
      const m = SEVIYE_BASI.exec(etiketNormalle(p));
      if (m) bulunan.add(seviyeAdi(m[1]!));
    }
  }
  return bulunan;
}

/** `tek`te yalnız varyant bölümü taranır (alt başlıkları dahil; kökün kendi başlığı etiket sayılmaz). */
function varyantBolumuSatirlari(text: string): string[] | null {
  const [kok, ...alt] = bolumAgaci(text, ZORLUK_BOLUMU, DIGER_BOLUMLER);
  return kok ? [...kok.lines, ...alt.flatMap((s) => [`## ${s.heading}`, ...s.lines])] : null;
}

export function materyalChecks(args: { body: MateryalBody; text: string }): ToolCheckOut {
  const { body, text } = args;
  // Cevap anahtarı: istendiyse bölüm dolu (1), istenmediyse dolu anahtar yok (1). "(Cevap anahtarı istenmedi — ekleme.)" notu anahtar sayılmaz.
  const cevap = cevapDurumu(text);
  const cevapAnahtari = body.cevapAnahtari ? (cevap.dolu ? 1 : 0) : cevap.dolu ? 0 : 1;
  // Varyant: kolay+orta(+ileri) istendiyse İSTENEN seviyelerin hepsi etiketli bulunmalı (fazlası sorun değil); `tek` istendiyse varyant
  // bölümünde birden çok seviye sunulmamalı ("tek düzey"). Bölüm hiç yoksa `tek`te ölçülecek bir şey yok (yapı puanı düşer).
  const gereken = GEREKEN[body.zorlukVaryanti] ?? GEREKEN.tek;
  let bulunan: Set<Seviye>;
  let varyant: number;
  if (gereken.length === 0) {
    bulunan = seviyeler(varyantBolumuSatirlari(text) ?? []);
    varyant = bulunan.size <= 1 ? 1 : 0;
  } else {
    bulunan = seviyeler(text.split("\n"));
    varyant = gereken.every((s) => bulunan.has(s)) ? 1 : 0;
  }
  const scores = { cevap_anahtari: cevapAnahtari, varyant };
  return {
    scores,
    details: { cevap_bolumu: cevap.bulundu, cevap_dolu: cevap.dolu, cevap_satir_ici: cevap.satirIci, varyant_bulunan: [...bulunan].join("|"), ...scores },
    hard: [],
  };
}
