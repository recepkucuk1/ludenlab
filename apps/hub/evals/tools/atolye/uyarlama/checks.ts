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
   tire/ok/iki nokta/son cümle KUYRUĞU ("— yükü azaltır", "**Renkli kodlama:** b/d karışıklığını önler.", "… yapılır. Bu, yükü hafifletir."; kuyrukta ETKİ FİİLİ şart),
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
/** KUYRUK biçimlerinde ("**Ek süre:** …", "… yapılır. …", "— …") gerekçe için ETKİ FİİLİ şart: betimleyen cümleler ("ek süre sağlanır", "görsel destek eklenir",
    "dikkat dağıtıcı nesneler kaldırılır") rationale değildir. Etken biçimler: azaltır/önler/kolaylaştırır/hafifletir/destekler/telafi eder/yardımcı olur/…;
    EDİLGEN (-ıl-/-ın-/-en-: sağlanır, desteklenir, artırılır, azaltılır) ve yalın ad ("dikkat", "güçlük") sayılmaz. Parantez ("(yük azalır)"), etiket, "çünkü" ve tablo/bölüm biçimleri `ACIKLAMA`yı kullanır. */
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
const KUYRUKLAR = [/(?:\s[—–]\s|\s-\s|\s?(?:→|⇒|->)\s?)(.{8,})$/u, /:\s+(.{8,})$/u, /[.!?…]\s+([^.!?…]{8,}[.!?…]?)$/u];

/** Gerekçe etiketiyle BAŞLAYAN madde/satır: önceki maddenin gerekçesidir, ayrı bir öneri değildir. */
const GEREKCE_ETIKETI = /^(?:gerekçe\p{L}*|neden\p{L}*|sebe[pb]\p{L}*|hangi güçlüğe|amaç|etki|fayda|yarar)(?:\s*[:：–—]|\s+-\s)/u;
const sadeGerekce = (madde: string) => GEREKCE_ETIKETI.test(etiketNormalle(madde));

function gerekceVar(madde: string): boolean {
  const t = lower(madde);
  if (GEREKCE.test(t)) return true;
  for (const m of t.matchAll(PARANTEZ)) if (!ORNEK.test(m[1]!) && ACIKLAMA.test(m[1]!)) return true;
  const kisaltmasiz = t.replace(KISALTMA, "$1"); // "vb. destekleyici araçlar…": kısaltma noktası cümle sonu değildir
  return KUYRUKLAR.some((re) => {
    const k = re.exec(kisaltmasiz)?.[1];
    return Boolean(k && !ORNEK.test(k) && ETKI_FIILI.test(k));
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
