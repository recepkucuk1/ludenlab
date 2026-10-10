// apps/hub/evals/tools/atolye/ev-odevi/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { TABLO, baslikMi } from "../../../lib/markdown";
import { lower } from "../../../lib/sharedChecks";
import { derinlik } from "../ortak";

export interface EvOdeviBody {
  hedefKonu: string;
  gunSayisi: number;
  ekstraNot?: string;
  mebHedefKod?: string;
  mebDavranisKodlari?: string[];
}

/* ── Bölüm regex'leri: TEK KAYNAK (adapter `sections` bunları kullanır; plan kapsamının dışlama listesi de buradan) ──
   Prompt: "1. Genel Çerçeve ve Ebeveyn Bilgilendirmesi 2. Günlük Çalışma Planı 3. Alternatif Yollar 4. Gözlem ve Uzmana Notlar (Aile için)".
   Başlıklar küçük harfe indirilir, baştaki numara atılır ("2. Günlük Çalışma Planı" → "günlük çalışma planı"). Gün başlıkları ("### Gün 1") plan bölümü SAYILMAZ: ürün
   "Günlük Çalışma Planı" bölümü ister; gün başlıkları onun altındadır (gün sayısı ayrıca `gun_sayisi`nda ölçülür). */
export const EV_ODEVI_BOLUMLERI = {
  genel: /genel çerçeve|ebeveyn/,
  plan: /günlük (?:çalışma )?(?:plan|program)|çalışma planı/,
  alternatif: /alternatif|b planı/,
  gozlem: /gözlem|uzmana/,
} as const;
export const EV_ODEVI_BOLUM_LISTESI: RegExp[] = Object.values(EV_ODEVI_BOLUMLERI);

/** Günlük plan DIŞI bölümler: gün ve süre taramasında dışlanır ("Alternatif: Gün 4 serbest oyun", "Gözlem: haftalık 60 dk geri bildirim", "Genel çerçeve: …").
    Daha dar bir kalıp: bölümün adı "Gün 1 – Ebeveyn için not" gibi bir gün başlığını yutmasın. */
const PLAN_DISI = /genel çerçeve|ebeveyn bilgilendirme|alternatif|b planı|gözlem ve uzman|uzmana|geri bildirim/;

/** Günlük plan dışı bölümlerin (alt başlıklarıyla) çıkarıldığı satırlar. Başlık yoksa metnin tamamı. */
function planSatirlari(text: string): string[] {
  const out: string[] = [];
  let atla: number | null = null; // atlanan bölümün derinliği
  for (const satir of text.split("\n")) {
    const b = baslikMi(satir);
    if (b) {
      if (atla !== null && derinlik(b) > atla) continue;
      atla = PLAN_DISI.test(b.heading) ? derinlik(b) : null;
      if (atla !== null) continue;
    } else if (atla !== null) continue;
    out.push(satir);
  }
  return out;
}

/* ── Gün etiketleri ──
   Prompt: "Günlük Çalışma Planı — Belirtilen gün sayısı kadar. Her gün için: …". Satır BAŞINDAKİ etiket (başlık, madde, kalın öncül, tablo hücresi): "### 1. Gün",
   "Gün 1", "**Gün 1:**", "Birinci gün", "| Gün 1 |", "Gün 1–2", gün adı ("Pazartesi"). Cümle içi anma ("Gün 3'te direnirse"), "Günlük", "Gün sonunda" etiket değildir. */
const ONCUL = /^[\s>#|*_\-+•]+/;
const SIRA: Record<string, number> = { birinci: 1, ikinci: 2, üçüncü: 3, dördüncü: 4, beşinci: 5, altıncı: 6, yedinci: 7 };
const GUN_SAYILI = /^gün\s*(\d+)(?:\s*[-–—]\s*(\d+))?(?![\p{L}\d'’])/u;
const SAYI_GUN = /^(\d+)\s*[.)]\s*gün(?![\p{L}'’])/u;
const SIRA_GUN = /^(birinci|ikinci|üçüncü|dördüncü|beşinci|altıncı|yedinci)\s+gün(?![\p{L}'’])/u;
const GUN_ADI = /^(pazartesi|salı|çarşamba|perşembe|cumartesi|cuma|pazar)(?![\p{L}'’])/u;

/** Tek bir metin parçasında (satır ya da tablo hücresi) gün etiketi: sayılı etiketleri/gün adını ilgili kümeye ekler. */
function etiketle(parca: string, sayili: Set<number>, adli: Set<string>): void {
  const s = lower(parca).replace(ONCUL, "");
  const a = GUN_SAYILI.exec(s);
  if (a) {
    const bas = Number(a[1]);
    const son = a[2] === undefined ? bas : Number(a[2]);
    for (let g = bas; g <= Math.min(son, bas + 7); g++) sayili.add(g); // aralık ("Gün 1-2"); sınırsız döngüye karşı üst sınır
    return;
  }
  const b = SAYI_GUN.exec(s);
  if (b) return void sayili.add(Number(b[1]));
  const c = SIRA_GUN.exec(s);
  if (c) return void sayili.add(SIRA[c[1]!]!);
  const d = GUN_ADI.exec(s);
  if (d) adli.add(d[1]!);
}

/** Tablo: "| Gün | … |" başlıklı tabloda ilk hücresi çıplak sayı olan satır o günün satırıdır ("| 1 | … |"); her hücre ayrıca etiket olarak taranır
    ("| Gün 1 | … |", "| | Gün 1 | Gün 2 |"). */
const GUN_BASLIGI = /^gün(?: no| sırası)?$/u;
const CIPLAK_GUN = /^(\d+)(?:\s*[-–—]\s*(\d+))?\.?$/u;

function gunEtiketleri(satirlar: string[]): { sayili: Set<number>; adli: Set<string> } {
  const sayili = new Set<number>();
  const adli = new Set<string>();
  let gunTablosu = false;
  for (const ham of satirlar) {
    if (!TABLO.test(ham)) {
      gunTablosu = false;
      etiketle(ham, sayili, adli);
      continue;
    }
    const hucre = ham.trim().replace(/^\||\|$/g, "").split("|").map((h) => h.trim());
    const ilk = lower(hucre[0] ?? "").replace(/\*\*|__/g, "").trim();
    if (GUN_BASLIGI.test(ilk)) gunTablosu = true;
    else if (gunTablosu) {
      const m = CIPLAK_GUN.exec(ilk);
      if (m) for (let g = Number(m[1]); g <= Math.min(m[2] === undefined ? Number(m[1]) : Number(m[2]), Number(m[1]) + 7); g++) sayili.add(g);
    }
    for (const h of hucre) etiketle(h, sayili, adli);
  }
  return { sayili, adli };
}

/** İstenen gün sayısı kadar gün var mı: numaralı etiketler tam 1..N ya da N farklı gün adı. N = 1 için etiket zorunlu değildir (tek günlük program başlıksız olabilir),
    ama birden çok gün etiketi fazladır. */
function gunTamam(e: { sayili: Set<number>; adli: Set<string> }, n: number): boolean {
  if (n <= 1) return e.sayili.size <= 1 && e.adli.size <= 1 && [...e.sayili].every((g) => g === 1);
  const tam = e.sayili.size === n && Array.from({ length: n }, (_, i) => i + 1).every((g) => e.sayili.has(g));
  return tam || e.adli.size === n;
}

/* ── Süre dilimleri ──
   Prompt: "15-20 dakikalık etkili, oyun temelli çalışma dilimleri tasarla". Her süre anması (dakika/saat; rakamla ya da yazıyla) bir dilimdir; aralıkta ÜST uç alınır
   ("15-20 dakikalık" = 20, "20-25 dk" = 25). Oran = ≤ 20 dk olan dilimler / tüm dilimler. Üst sınır ("45 dakikayı geçmesin", "en fazla 30 dakika") ve zaman farkı
   ("yarım saat sonra", "40 dakika önce") bir çalışma süresi değildir. BİLİNEN SINIR: günün dilimleri toplanmaz (her biri ≤ 20 olan üç blok geçer); toplam süre hakemin
   `sure_uyumu` ölçütündedir. MEB kodu + "dk" ("3.2.5 dk") süre sayılmaz (sayı numaranın ortasından başlamaz). */
const BIRIMLER = "(?:dakika|dk|saat)";
const RAKAM = new RegExp(
  String.raw`(?<![\d.,])(\d+(?:[.,]\d+)?)(?:\s*[-–—]\s*(\d+(?:[.,]\d+)?))?(?:['’]\s?(?:ar|er))?\s*(${BIRIMLER})(?:['’]?\p{L}*)`,
  "gu",
);
const ONLAR: Record<string, number> = { on: 10, yirmi: 20, otuz: 30, kırk: 40, elli: 50, altmış: 60 };
const BIRLER: Record<string, number> = { bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, altı: 6, yedi: 7, sekiz: 8, dokuz: 9 };
const SOZ = new RegExp(
  String.raw`(?<!\p{L})(?:(on|yirmi|otuz|kırk|elli|altmış)(?:\s+(bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz))?|(bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz))\s+(${BIRIMLER})(?:['’]?\p{L}*)`,
  "gu",
);
const YARIM = /(?<!\p{L})yarım\s+saat(?:['’]?\p{L}*)/gu;
const sayi = (s: string) => Number(s.replace(",", "."));
/** Üst sınır / zaman farkı sözcükleri (mention sonrasındaki aynı cümle parçasında, ilk üç sözcükte). */
const TAVAN_SONRA = /^(?:geçme\p{L}*|geçmey\p{L}*|geçerse|geçince|aşma\p{L}*|aşmay\p{L}*|aşarsa|fazla|uzun|sonra|önce|içinde|üzerine|üstüne|üzerinde|üstünde)$/u;
const TAVAN_ONCE = /(?:^|\s)en\s+(?:fazla|çok|geç|uzun)\s*$/u;

interface Anma {
  dk: number;
  bas: number;
  son: number;
}
function anmalar(metin: string): number[] {
  const t = lower(metin);
  const hepsi: Anma[] = [];
  for (const m of t.matchAll(RAKAM)) {
    const dk = sayi(m[2] ?? m[1]!) * (m[3] === "saat" ? 60 : 1);
    hepsi.push({ dk, bas: m.index, son: m.index + m[0].length });
  }
  for (const m of t.matchAll(SOZ)) {
    const n = m[3] ? BIRLER[m[3]]! : ONLAR[m[1]!]! + (m[2] ? BIRLER[m[2]]! : 0);
    hepsi.push({ dk: n * (m[4] === "saat" ? 60 : 1), bas: m.index, son: m.index + m[0].length });
  }
  for (const m of t.matchAll(YARIM)) hepsi.push({ dk: 30, bas: m.index, son: m.index + m[0].length });
  return hepsi
    .filter((a) => {
      const parca = t.slice(a.son).split(/[.!?;\n]/)[0] ?? "";
      const sonraki = (parca.match(/\p{L}+/gu) ?? []).slice(0, 3);
      if (sonraki.some((k) => TAVAN_SONRA.test(k))) return false;
      return !TAVAN_ONCE.test(t.slice(Math.max(0, a.bas - 14), a.bas));
    })
    .map((a) => a.dk);
}

export function evOdeviChecks(args: { body: EvOdeviBody; text: string }): ToolCheckOut {
  const { body, text } = args;
  const plan = planSatirlari(text);
  // Plan bölümünde gün etiketi/süre yoksa (başlık adı sapması) tüm metne bakılır.
  const planMetni = plan.join("\n");
  let etiket = gunEtiketleri(plan);
  if (!etiket.sayili.size && !etiket.adli.size) etiket = gunEtiketleri(text.split("\n"));
  const gunSayisi = gunTamam(etiket, body.gunSayisi) ? 1 : 0;
  let dilimler = anmalar(planMetni);
  if (!dilimler.length) dilimler = anmalar(text);
  const sureDilimi = dilimler.length ? dilimler.filter((d) => d <= 20).length / dilimler.length : 0;
  const scores = { gun_sayisi: gunSayisi, sure_dilimi: sureDilimi };
  return { scores, details: { gun: Math.max(etiket.sayili.size, etiket.adli.size), dilim: dilimler.length, ...scores }, hard: [] };
}
