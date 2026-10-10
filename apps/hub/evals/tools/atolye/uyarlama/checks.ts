// apps/hub/evals/tools/atolye/uyarlama/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { AYRAC, MADDE, TABLO, baslikMi, sections, type Section } from "../../../lib/markdown";
import { lower } from "../../../lib/sharedChecks";
import { derinlik, maddeler } from "../ortak";

export interface UyarlamaBody {
  ders?: string;
  ortam: "kaynastirma" | "ozel_egitim_sinifi" | "destek_egitim_odasi" | "ev";
  mebHedefKod?: string;
  mebDavranisKodlari?: string[];
}

/* ── Gerekçe ────────────────────────────────────────────────────────────────────────────────────────
   Prompt: "6. Her madde için **kısa gerekçe** (hangi güçlüğe nasıl yardımcı)".
   Gerekçe yazılabilecek biçimler: "Gerekçe:" / "Neden:" / "Sebep:" etiketi, "çünkü …", madde sonunda parantez ya da tire/ok sonrası
   açıklama cümlesi (≥ 8 karakter ve açıklama sözcüğü) ("(okuma yükünü azaltır)", "— dikkat süresi kısa olduğu için"), tablonun "Gerekçe" sütunu, ayrı bir "Gerekçeler" bölümü.
   Puan = gerekçe sayısı / öneri maddesi sayısı (en çok 1): her madde için bir gerekçe. Yerleşim (madde içi, alt madde, kardeş madde, ardından gelen
   paragraf) önemsizdir; sayım satır/madde başınadır. */

/** Kesin gerekçe işaretleri (tr-TR küçük harfe indirilmiş metinde). */
const GEREKCE = new RegExp(
  [
    String.raw`gerekçe`,
    String.raw`(?<!\p{L})(?:neden|nedeni|sebep|sebebi)(?:\s*[:：–—]|\s+-\s)`,
    String.raw`çünkü|olduğu için|olduğundan`,
    String.raw`(?<!\p{L})(?:böylece|bu sayede|sayesinde|nedeniyle|dolayısıyla)(?!\p{L})`,
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
    "dikkat|zorlan|zorluk|güçlük|sorun|ihtiyaç|kaygı|panik|stres|gerginlik|yorgun|yavaş|bellek|çözümleme|akıcı|güven|motivasyon|odak",
  ].join("|"),
  "u",
);
/** Parantez içi örnek/kısaltma gerekçe değildir: "(ör. ekran okuyucu)". */
const ORNEK = /^\s*(?:ör|örn|vb|bkz|gibi)(?!\p{L})/u;
const PARANTEZ = /\(([^()]{8,})\)/gu;
const KUYRUK = /(?:\s[—–]\s|\s-\s|\s?(?:→|⇒|->)\s?)(.{8,})$/u;

/** Gerekçe etiketiyle BAŞLAYAN madde/satır: önceki maddenin gerekçesidir, ayrı bir öneri değildir. */
const GEREKCE_ETIKETI = /^(?:gerekçe\p{L}*|neden\p{L}*|sebe[pb]\p{L}*|amaç|etki|fayda|yarar)(?:\s*[:：–—]|\s+-\s)/u;
const etiketGovdesi = (s: string) => lower(s.replace(/[*_`]/g, "")).replace(/^[\s|>•+-]+/, "");
const sadeGerekce = (madde: string) => GEREKCE_ETIKETI.test(etiketGovdesi(madde));

function gerekceVar(madde: string): boolean {
  const t = lower(madde);
  if (GEREKCE.test(t)) return true;
  for (const m of t.matchAll(PARANTEZ)) if (!ORNEK.test(m[1]!) && ACIKLAMA.test(m[1]!)) return true;
  const k = KUYRUK.exec(t)?.[1];
  return Boolean(k && ACIKLAMA.test(k));
}

const hucreler = (satir: string) => satir.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
const GEREKCE_SUTUNU = /gerekçe|neden|sebep|nasıl yardımcı|etki|fayda|amaç/u;

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
const BAGLAM = /bağlam/;
const ONERI = /sunum|yanıt|çıktı|ortam|zaman|değerlendirme|sınav/;
/** Başlık sınıfı: bağlam özeti öneri değildir (başlığında "ortam" geçse bile); önerilerden biri → öneri; "Gerekçeler" → ayrı gerekçe bölümü. */
function sinifla(heading: string): Sinif {
  if (BAGLAM.test(heading)) return "diger";
  if (ONERI.test(heading)) return "oneri";
  return /gerekçe/.test(heading) ? "gerekce" : "diger";
}

/** Öneri bölümleri ve ayrı gerekçe bölümleri (alt başlıkları dahil). Kök kalın sözde başlıksa kalın kardeşler (şablon başlığı olmayanlar) alt bölümdür. */
function kapsam(text: string): { oneri: Section[]; gerekce: Section[] } {
  const oneri: Section[] = [];
  const gerekce: Section[] = [];
  let kok: { sinif: Sinif; d: number; kalin: boolean } | null = null;
  for (const s of sections(text)) {
    const d = derinlik(s);
    const kalinKardes = kok?.kalin && s.level === "bold" && sinifla(s.heading) === "diger" && !BAGLAM.test(s.heading);
    if (kok && kok.sinif !== "diger" && (d > kok.d || kalinKardes)) {
      (kok.sinif === "oneri" ? oneri : gerekce).push(s);
      continue;
    }
    const sinif = sinifla(s.heading);
    kok = sinif === "diger" ? null : { sinif, d, kalin: s.level === "bold" };
    if (sinif === "oneri") oneri.push(s);
    else if (sinif === "gerekce") gerekce.push(s);
  }
  return { oneri, gerekce };
}

/** Maddeye girmeyen, girintisiz paragraf satırı ("*Gerekçe:* …" gibi maddelerin ardından gelen açıklama). */
const paragrafMi = (l: string) => l.trim() !== "" && !MADDE.test(l) && !TABLO.test(l) && !/^\s/.test(l) && !baslikMi(l);

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
    sayi += isli.filter((l) => paragrafMi(l) && GEREKCE_ETIKETI.test(etiketGovdesi(l))).length;
  }
  for (const s of gerekce) sayi += maddeler(s.lines).length; // ayrı "Gerekçeler" bölümünün her maddesi bir gerekçedir
  return { madde, gerekce: sayi };
}

export function uyarlamaChecks(args: { body: UyarlamaBody; text: string }): ToolCheckOut {
  const { madde, gerekce } = gerekceSayimi(args.text);
  // Madde yoksa (düzyazı) ölçülecek madde yok: metindeki gerekçe işaretleri en az 3 ise 1.
  const isaret = (lower(args.text).match(new RegExp(GEREKCE.source, "gu")) ?? []).length;
  const scores = { gerekce: madde > 0 ? Math.min(1, gerekce / madde) : Math.max(gerekce, isaret) >= 3 ? 1 : 0 };
  return { scores, details: { gerekce_madde: madde, gerekce_sayisi: gerekce, ...scores }, hard: [] };
}
