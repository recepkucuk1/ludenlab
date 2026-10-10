// apps/hub/evals/tools/atolye/materyal/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { AYRAC, TABLO, TASLAK_NORM, baslikMi, notNormalize } from "../../../lib/markdown";
import { lower } from "../../../lib/sharedChecks";
import { bolumAgaci, olumsuzMu } from "../ortak";

export interface MateryalBody {
  materyalTuru: "calisma_yapragi" | "etkinlik" | "okuma_metni" | "alistirma";
  konu: string;
  zorlukVaryanti: "tek" | "kolay_orta" | "kolay_orta_ileri";
  cevapAnahtari: boolean;
  mebHedefKod?: string;
  mebDavranisKodlari?: string[];
}

/** Satır-başı etiket karşılaştırması için: vurgu işaretleri, madde/tablo/başlık işaretleri ve baştaki numara atılır; tr-TR küçük harf. */
const etiketGovdesi = (s: string) => lower(s.replace(/[*_`]/g, "")).replace(/^[\s|#>•+-]+/, "").replace(/^\d+[.)]\s*/, "");

/** Şablonun diğer bölümleri: kalın sözde başlık kökünde bölümün nerede bittiği (`bolumAgaci` `durak`ı). */
const DIGER_BOLUMLER = /^(?:başlık|hedef|öğretmen|uygulama|materyal|zorluk|sınıf|farklılaştırma|uyarlama|kazanım)/;

/* ── Cevap anahtarı ─────────────────────────────────────────────────────────────────────────────────
   Prompt: cevapAnahtari=evet → "6. **Cevap anahtarı**"; hayır → "(Cevap anahtarı istenmedi — ekleme.)".
   İstendiyse bölüm DOLU olmalı; istenmediyse dolu bir anahtar OLMAMALI (model "istenmedi" notu düşebilir: o anahtar değildir). */

const CEVAP = /(?:cevap|yanıt) anahtar\p{L}*|^(?:cevaplar|yanıtlar|doğru (?:cevap|yanıt)lar?)(?!\p{L})/u;
/** Satır-içi etiket: "**Cevap anahtarı:** 1) b 2) d" — başlık değil, etiketli paragraf. */
const CEVAP_ETIKETI = /^(?:cevap|yanıt) anahtar\p{L}*\s*[:–—-]\s*(.*)$/u;

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

function cevapDurumu(text: string): { bulundu: boolean; dolu: boolean } {
  const agac = bolumAgaci(text, CEVAP, DIGER_BOLUMLER);
  if (agac.length) return { bulundu: true, dolu: icerikSatirlari(agac.flatMap((s) => s.lines)).length > 0 };
  // Başlık yok: etiketli satır ("Cevap anahtarı: …") ve bir sonraki başlığa kadarki satırlar.
  const satirlar = text.split("\n");
  const i = satirlar.findIndex((l) => CEVAP_ETIKETI.test(etiketGovdesi(l)));
  if (i < 0) return { bulundu: false, dolu: false };
  const ilk = CEVAP_ETIKETI.exec(etiketGovdesi(satirlar[i]!))![1]!;
  const sonra = satirlar.slice(i + 1);
  const son = sonra.findIndex((l) => baslikMi(l));
  return { bulundu: true, dolu: icerikSatirlari([ilk, ...(son < 0 ? sonra : sonra.slice(0, son))]).length > 0 };
}

/* ── Zorluk varyantları ─────────────────────────────────────────────────────────────────────────────
   Prompt: "Zorluk varyantı: tek düzey | kolay + orta | kolay + orta + ileri" + "Zorluk varyantları (seçilen varyanta göre kolay/orta/ileri)".
   Seviye etiketi başlıkta (sözcük olarak: "Kolay düzey"; "kolaylaştırma"/"ortam"/"ilerleme" DEĞİL), kalın etiket/madde başında ya da tablo hücresinde. */

type Seviye = "kolay" | "orta" | "ileri";
const GEREKEN: Record<MateryalBody["zorlukVaryanti"], Seviye[]> = { tek: [], kolay_orta: ["kolay", "orta"], kolay_orta_ileri: ["kolay", "orta", "ileri"] };
const ZORLUK_BOLUMU = /zorluk varyant/;
const SEVIYE_SOZU = /(?<!\p{L})(kolay|orta|ileri)(?!\p{L})/gu;
const SEVIYE_BASI = /^(?:(?:varyant|düzey|seviye|zorluk|grup|kademe)\s*[a-z0-9]*\s*[:.)\-–—]*\s*|[a-c1-3][.)]\s*)?\(?(kolay|orta|ileri)(?!\p{L})/u;

function seviyeler(satirlar: string[]): Set<Seviye> {
  const bulunan = new Set<Seviye>();
  for (const l of satirlar) {
    const b = baslikMi(l);
    if (b) {
      for (const m of b.heading.matchAll(SEVIYE_SOZU)) bulunan.add(m[1] as Seviye);
      continue;
    }
    const parcalar = TABLO.test(l) ? l.split("|") : [l];
    for (const p of parcalar) {
      const m = SEVIYE_BASI.exec(etiketGovdesi(p));
      if (m) bulunan.add(m[1] as Seviye);
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
    details: { cevap_bolumu: cevap.bulundu, cevap_dolu: cevap.dolu, varyant_bulunan: [...bulunan].join("|"), ...scores },
    hard: [],
  };
}
