// apps/hub/evals/tools/studio/weekly-plan/checks.ts
import type { ToolCheckOut } from "../../../lib/adapterFactory";
import { countSentences, frac, kayitlar, lower, mean, nesne, nesneVeyaNull, str, sureDk } from "../../../lib/sharedChecks";

export interface WeeklyPlanBody {
  weekStart: string;
  sessionsPerWeek: number;
  sessionDuration: "20" | "30" | "40" | "45" | "60";
  focusAreas: string[];
  planApproach: "ai" | "guided";
  daySchedule: Array<{ dayName: string; lessonCount: number }>;
  extraNote?: string;
}
type Rec = Record<string, unknown>;
/** Dizi uzunluğu; dizi değilse 0 (bütçe kontrolleri eksik alana "fazla" demez; eksiklik başka puanda). */
const sayi = (v: unknown) => (Array.isArray(v) ? v.length : 0);

/* ── Odak kapsama ──
   Bir odak alanı, bir dersin (odak alanı + hedef) metninde ayırt edici parçalarının en az yarısı (iki parçalıda ikisi) ile geçiyorsa
   işlenmiş sayılır. Parçalar: ≥ 4 harfli sözcüklerin kökü (ilk 5 harf, kısa sözcükte son harf atılır; sözcük
   başına eşleşir, ekler sorun olmaz) + ses harfleri ("/s/", "/ş/": tek harfli sözcük; bağımsız harf olarak
   aranır). Ses harfi varsa en az biri bulunmalıdır: "/k/ sesi kelime başı" için /k/ olmadan "kelime başlama"
   yetmez. (Eski kural ilk kelimenin ilk 5 harfiydi: "Üç …" ya da "/s/ …" odağı neredeyse her derse eşleşirdi.) */
const DURAK = new Set(["için", "gibi", "daha", "veya", "olan"]); // yalnız ≥ 4 harflileri: kısa sözcükler zaten parça olmaz
function odakKapsar(odak: string): (metin: string) => boolean {
  const kelimeler = lower(odak).match(/\p{L}+/gu) ?? [];
  const ses = kelimeler.filter((k) => k.length === 1).map((k) => new RegExp(`(?<!\\p{L})${k}(?!\\p{L})`, "u"));
  const govde = kelimeler
    .filter((k) => k.length >= 4 && !DURAK.has(k))
    .map((k) => new RegExp(`(?<!\\p{L})${k.slice(0, Math.min(5, k.length - 1))}`, "u"));
  const parcalar = [...ses, ...govde];
  if (parcalar.length === 0) return (metin) => lower(metin).includes(lower(odak).trim()); // yalnız kısa sözcükler: bütün ifade
  // İki parçalı odakta (ör. "Sıra alma") ikisi de gerekir: yarısı yetseydi "sıralama" ya da "almak" tek başına yeterdi.
  const gerekli = parcalar.length === 2 ? 2 : Math.ceil(parcalar.length / 2);
  return (metin) => {
    const t = lower(metin);
    return parcalar.filter((re) => re.test(t)).length >= gerekli && (ses.length === 0 || ses.some((re) => re.test(t)));
  };
}

/** Üç bloğun (ısınma + ana çalışma + kapanış) toplamı derse en çok bu kadar uzak olabilir: 5 dk, 20 dk'lık derste %15. */
const sureTolerans = (hedef: number) => Math.min(5, hedef * 0.15);

const kelimeKumesi = (s: string) => new Set(lower(s).match(/\p{L}+/gu) ?? []);
const benzerlik = (a: Set<string>, b: Set<string>) => {
  if (a.size === 0 && b.size === 0) return 1;
  let ortak = 0;
  for (const x of a) if (b.has(x)) ortak++;
  return ortak / new Set([...a, ...b]).size;
};
/** İki dersin ana çalışması bu orandan fazla ortak sözcük taşıyorsa aynı etkinlik sayılır. */
const AYNI_ETKINLIK = 0.8;
/** Rota bunları ekler/ezer; prompt "yazma" der: modelin ham çıktısında bulunmaları token israfıdır. */
const SISTEM_ALANLARI = ["dayName", "date", "duration"];
const yazilmis = (v: unknown) => (typeof v === "string" ? v.trim() !== "" : v !== undefined && v !== null);

const HAFTA_CUMLE: Array<[string, number, number]> = [
  ["studentSummary", 1, 2],
  ["weeklyGoal", 1, 1],
  ["parentCommunication", 2, 3],
  ["expertNotes", 2, 3],
  ["nextWeekSuggestion", 1, 1],
];

export function weeklyPlanChecks(args: { body: WeeklyPlanBody; output: unknown; raw?: Rec | null; text?: string; alias?: string | null }): ToolCheckOut {
  const { body } = args;
  const output = nesneVeyaNull(args.output);
  const days = kayitlar(output?.days);
  const hard: string[] = [];
  if (output && days.length === 0) hard.push("gun_dizisi_yok");

  // Rota fazla dersi KIRPAR (`slice`): üründeki çıktı doğru sayıda görünse de model fazla üretmiş olabilir; modelin
  // ham çıktısı (varsa) da tam sayıda olmalı ("days dizisi tam olarak N ders içersin").
  const beklenen = body.daySchedule.reduce((a, d) => a + d.lessonCount, 0);
  const ham = args.raw && Array.isArray(args.raw.days) ? kayitlar(args.raw.days) : null;
  const dersSayisi = days.length === beklenen && (ham === null || ham.length === beklenen) ? 1 : 0;

  const bloklar = (d: Rec) => ({ w: nesne(d.warmup), m: nesne(d.mainWork), c: nesne(d.closing) });
  const gunAlanlari = frac(days, (d) => {
    const { w, m, c } = bloklar(d);
    return [d.focusArea, d.objective, w.activity, m.activity, c.activity].every((x) => str(x).trim());
  });

  const gunMetni = (d: Rec) => `${str(d.focusArea)} ${str(d.objective)}`;
  const odakEksik = body.focusAreas.filter((f) => {
    const kapsar = odakKapsar(f);
    return !days.some((d) => kapsar(gunMetni(d)));
  });
  const odakKapsama = body.focusAreas.length ? (body.focusAreas.length - odakEksik.length) / body.focusAreas.length : 0;

  // Prompt: ana çalışmada en çok 3 adım (adımsız ders de eksiktir); ısınmada ≤ 2, ana çalışmada ≤ 3 materyal, ≤ 2 hedef;
  // haftalık liste ≤ 6.
  const adimButce = frac(days, (d) => {
    const n = sayi(nesne(d.mainWork).steps);
    return n >= 1 && n <= 3;
  });
  const gunButcesi = frac(days, (d) => {
    const { w, m } = bloklar(d);
    return sayi(w.materials) <= 2 && sayi(m.materials) <= 3 && sayi(m.targetGoals) <= 2;
  });
  const haftalik = output?.materialsNeeded;
  const materyalButce = Array.isArray(haftalik) && haftalik.length >= 1 && haftalik.length <= 6 ? 1 : 0;

  // Prompt: hedef/ısınma/ana çalışma/kapanış tek cümle (en çok bir), notes null ya da tek cümle; haftalık alanların cümle
  // aralıkları. Boş alan burada ölçülmez (eksiklik `gun_alanlari`/`alanlar`da): aynı kusur iki puanda cezalanmaz.
  const gunCumle = days.map((d) => {
    const { w, m, c } = bloklar(d);
    return mean([d.objective, w.activity, m.activity, c.activity, d.notes].map((x) => (countSentences(str(x)) <= 1 ? 1 : 0)));
  });
  const haftaCumle = HAFTA_CUMLE.map(([k, en, cok]) => {
    if (!str(output?.[k]).trim()) return 1;
    const n = countSentences(str(output?.[k]));
    return n >= en && n <= cok ? 1 : 0;
  });
  const cumleButcesi = output ? mean([days.length ? mean(gunCumle) : 0, mean(haftaCumle)]) : 0;

  // Süre dağılımı: ısınma + ana çalışma + kapanış ≈ ders süresi (prompt örneği 5+30+10 dk'dır; 20 dk'lık derse kopyalanırsa 45 dk'lık plan olur).
  const hedefDk = Number(body.sessionDuration);
  const toplamlar = days.map((d) => {
    const { w, m, c } = bloklar(d);
    const parca = [sureDk(w.duration), sureDk(m.duration), sureDk(c.duration)];
    return parca.every((p): p is number => p !== null) ? parca.reduce((a, b) => a + b, 0) : null;
  });
  const sureDagilimi = toplamlar.length ? toplamlar.filter((t) => t !== null && Math.abs(t - hedefDk) <= sureTolerans(hedefDk)).length / toplamlar.length : 0;

  // Çeşitlilik: her gün farklı etkinlik. Bir ders, öncekilerden birinin neredeyse kopyasıysa (etkinlik + adımlar) tekrar sayılır.
  const imzalar = days.map((d) => {
    const m = nesne(bloklar(d).m);
    return kelimeKumesi(`${str(m.activity)} ${(Array.isArray(m.steps) ? m.steps : []).map(str).join(" ")}`);
  });
  const etkinlikCesidi = imzalar.length ? mean(imzalar.map((s, i) => (imzalar.slice(0, i).every((onceki) => benzerlik(s, onceki) < AYNI_ETKINLIK) ? 1 : 0))) : 0;

  // Gün adı/tarih/süre: ham çıktıda yazılmamalı; ham çıktı yoksa "yazmadı" kanıtlanamaz: 0.
  const sistemAlani = ham && ham.length ? frac(ham, (d) => !SISTEM_ALANLARI.some((k) => yazilmis(d[k]))) : 0;

  const alanlar = mean(["title", "studentSummary", "weeklyGoal", "parentCommunication", "expertNotes", "nextWeekSuggestion"].map((k) => (str(output?.[k]).trim() ? 1 : 0)));
  const scores = {
    ders_sayisi: dersSayisi,
    gun_alanlari: gunAlanlari,
    odak_kapsama: odakKapsama,
    adim_butce: adimButce,
    materyal_butce: materyalButce,
    gun_butcesi: gunButcesi,
    cumle_butcesi: cumleButcesi,
    sure_dagilimi: sureDagilimi,
    etkinlik_cesidi: etkinlikCesidi,
    sistem_alani: sistemAlani,
    alanlar,
  };
  return {
    scores: { ...scores, talimat: output ? mean(Object.values(scores)) : 0 },
    details: {
      ders: days.length,
      ders_ham: ham ? ham.length : "—",
      beklenen,
      ...scores,
      sure_toplamlari: toplamlar.map((t) => (t === null ? "?" : String(Math.round(t * 10) / 10))).join("|"),
      odak_eksik: odakEksik.join("|"),
    },
    hard,
  };
}
