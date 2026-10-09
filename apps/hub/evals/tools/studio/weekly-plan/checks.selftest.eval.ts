// apps/hub/evals/tools/studio/weekly-plan/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { weeklyPlanChecks, type WeeklyPlanBody } from "./checks";

const body: WeeklyPlanBody = { weekStart: "2026-10-12", sessionsPerWeek: 3, sessionDuration: "40", focusAreas: ["İstek cümlesi", "Sıra alma"], planApproach: "ai", daySchedule: [{ dayName: "Pazartesi", lessonCount: 2 }, { dayName: "Çarşamba", lessonCount: 1 }] };
const day = (focusArea: string) => ({ focusArea, objective: "o", warmup: { activity: "a", duration: "5 dk", materials: ["x"] }, mainWork: { activity: "b", duration: "25 dk", steps: ["1", "2"], materials: ["y"], targetGoals: ["g"] }, closing: { activity: "c", duration: "5 dk" }, notes: null });
const ok = { title: "Plan", studentSummary: "s", days: [day("İstek cümlesi"), day("Sıra alma"), day("İstek cümlesi")], weeklyGoal: "w", materialsNeeded: ["a", "b"], parentCommunication: "p", expertNotes: "e", nextWeekSuggestion: "n" };

describe("weeklyPlanChecks", () => {
  it("ders sayısı = günlük ders toplamı; odak alanları kapsanır; adım/materyal bütçesi", () => {
    const r = weeklyPlanChecks({ body, output: ok, raw: ok, text: "", alias: "Hazal" });
    expect(r.scores).toMatchObject({ ders_sayisi: 1, gun_alanlari: 1, odak_kapsama: 1, adim_butce: 1, materyal_butce: 1 });
    expect(r.hard).toEqual([]);
  });
  it("days dizi değilse sert hata; ders sayısı tutmazsa 0; adım > 3 düşürür", () => {
    expect(weeklyPlanChecks({ body, output: { ...ok, days: "x" }, raw: ok, text: "", alias: null }).hard).toContain("gun_dizisi_yok");
    const out = { ...ok, days: [day("İstek cümlesi"), { ...day("Sıra alma"), mainWork: { ...day("x").mainWork, steps: ["1", "2", "3", "4"] } }] };
    const r = weeklyPlanChecks({ body, output: out, raw: out, text: "", alias: null });
    expect(r.scores.ders_sayisi).toBe(0);
    expect(r.scores.adim_butce).toBe(0.5);
  });
});

/* ── Ayırt ediciliği ölçen gerçekçi taban: her puan 1, her mutant ilgili puanı düşürür ── */

type Rec = Record<string, unknown>;
const B3: WeeklyPlanBody = {
  weekStart: "2026-10-12", sessionsPerWeek: 3, sessionDuration: "40", planApproach: "ai",
  focusAreas: ["Üç kelimeli istek cümlesi", "Sıra alma"],
  daySchedule: [{ dayName: "Pazartesi", lessonCount: 1 }, { dayName: "Çarşamba", lessonCount: 1 }, { dayName: "Cuma", lessonCount: 1 }],
};
/** Modelin ham çıktısı: gün adı/tarih/süre YOK (sunucu ekler). */
const ham = {
  title: "Haftalık Plan — Ela — 12–18 Ekim",
  studentSummary: "Ela iki kelimelik istekler kuruyor. Dinozor ve tren oyunlarında en istekli.",
  days: [
    { focusArea: "Üç kelimeli istek cümlesi", objective: "Ela dinozor figürleriyle modelden sonra üç kelimeli isteği kurar.",
      warmup: { activity: "Geçiş kartını gösterip tren şarkısıyla başlarız.", duration: "5 dakika", materials: ["Geçiş kartı"] },
      mainWork: { activity: "Figürleri kutuya saklayıp her istekte cümleyi bir sözcük uzatırız.", duration: "30 dakika", steps: ["Figürleri kutuya koy", "İsteği bekle", "Cümleyi bir sözcük uzatarak geri ver"], materials: ["Dinozor figürleri", "Kutu"], targetGoals: ["Üç sözcüklü istek"] },
      closing: { activity: "Geçiş kartıyla oyunu bitirip figürlere veda ederiz.", duration: "5 dakika" }, notes: null },
    { focusArea: "Sıra alma", objective: "Ela tren oyununda sırasını sözel işaretle bekler.",
      warmup: { activity: "Vagonları dizerken kimin sırası olduğunu birlikte söyleriz.", duration: "5 dakika", materials: ["Tren seti"] },
      mainWork: { activity: "Tren yolunda sırayla vagon ekleyip bekleme işaretini çalıştırırız.", duration: "25 dakika", steps: ["Vagonu sırayla ver", "Bekleme kartını göster"], materials: ["Tren seti", "Bekleme kartı"], targetGoals: ["Sıra alma"] },
      closing: { activity: "Ela'ya hangi vagonu sevdiğini sorarak toparlarız.", duration: "10 dakika" }, notes: "Kalabalık olursa sakin köşede başla." },
    { focusArea: "Üç kelimeli istek cümlesi", objective: "Ela istek fırsatlarında cümleyi yardımsız kurmaya çalışır.",
      warmup: { activity: "Dinozor sesleriyle taklit oyunu oynarız.", duration: "10 dakika", materials: [] },
      mainWork: { activity: "Mutfak oyununda gizlenen yiyecekleri istemesi için fırsat yaratırız.", duration: "25 dakika", steps: ["Yiyecekleri sakla", "Ela'nın isteğini bekle", "Eksik sözcüğü ima et"], materials: ["Oyuncak yiyecekler"], targetGoals: ["Üç sözcüklü istek", "Sıra alma"] },
      closing: { activity: "Geçiş kartıyla bitişi haber veririz.", duration: "5 dakika" }, notes: null },
  ],
  weeklyGoal: "Ela üç kelimeli isteği oyun içinde bağımsız kurar.",
  materialsNeeded: ["Geçiş kartı", "Dinozor figürleri", "Tren seti", "Bekleme kartı", "Oyuncak yiyecekler"],
  parentCommunication: "Bu hafta üç kelimeli istek cümlesi üzerinde çalışacağız. Evde sofrada bir sözcük uzatarak yanıtlayabilirsiniz. Geçiş kartını evde de kullanabilirsiniz.",
  expertNotes: "Önceki oturumda istek cümlesi modelle %60 üretildi. Bu hafta ipucu kademeli azaltılır.",
  nextWeekSuggestion: "Gelecek hafta isteği farklı ortamlara genelle.",
};
type Ham = typeof ham;
const kopya = (): Ham => structuredClone(ham);
const GUNLER = ["Pazartesi", "Çarşamba", "Cuma"];
/** Rota `enrichContent`ının yaptığı: gün numarası, adı, tarih ve süre eklenir. */
const zenginles = (m: unknown): unknown => {
  const o = m as Rec;
  if (!Array.isArray(o.days)) return o;
  return { ...o, days: o.days.map((d, i) => (d && typeof d === "object" ? { ...(d as Rec), dayNumber: i + 1, dayName: GUNLER[i] ?? "Cuma", date: "12 Eki 2026", duration: "40 dakika" } : d)) };
};
const kos = (m: unknown, raw: unknown = m, b: WeeklyPlanBody = B3) => weeklyPlanChecks({ body: b, output: zenginles(m), raw: raw as Rec | null, text: "", alias: "Ela" });
const gun = (m: Ham, i: number) => m.days[i]!;

describe("weeklyPlanChecks — taban ve mutantlar", () => {
  it("gerçekçi çıktı: her puan 1, talimat 1, sert hata yok", () => {
    const r = kos(ham);
    expect(r.hard).toEqual([]);
    for (const [k, v] of Object.entries(r.scores)) expect(v, k).toBe(1);
    expect(Object.keys(r.scores)).toEqual(expect.arrayContaining(["ders_sayisi", "gun_alanlari", "odak_kapsama", "adim_butce", "materyal_butce", "gun_butcesi", "cumle_butcesi", "sure_dagilimi", "etkinlik_cesidi", "sistem_alani", "alanlar", "talimat"]));
  });

  const mutantlar: Array<[string, (m: Ham) => void, string]> = [
    ["son ders eksik", (m) => { m.days.pop(); }, "ders_sayisi"],
    ["fazladan ders", (m) => { m.days.push(structuredClone(gun(m, 0))); }, "ders_sayisi"],
    ["bir günün hedefi boş", (m) => { gun(m, 1).objective = ""; }, "gun_alanlari"],
    ["bir günün ana çalışması boş", (m) => { gun(m, 2).mainWork.activity = " "; }, "gun_alanlari"],
    ["odak alanı hiçbir derste yok", (m) => { for (const d of m.days) { d.focusArea = "Genel çalışma"; d.objective = "Ela etkinliğe katılır."; } }, "odak_kapsama"],
    ["yalnız bir odak alanı işleniyor", (m) => { gun(m, 1).focusArea = "Üç kelimeli istek cümlesi"; gun(m, 1).objective = "Ela istek cümlesi kurar."; }, "odak_kapsama"],
    ["ana çalışmada 4 adım", (m) => { gun(m, 0).mainWork.steps.push("Dördüncü adım"); }, "adim_butce"],
    ["ana çalışmada adım yok", (m) => { gun(m, 1).mainWork.steps = []; }, "adim_butce"],
    ["haftalık materyal listesi 7 öğe", (m) => { m.materialsNeeded = ["a", "b", "c", "d", "e", "f", "g"]; }, "materyal_butce"],
    ["haftalık materyal listesi boş", (m) => { m.materialsNeeded = []; }, "materyal_butce"],
    ["ısınmada 3 materyal", (m) => { gun(m, 0).warmup.materials = ["a", "b", "c"]; }, "gun_butcesi"],
    ["ana çalışmada 4 materyal", (m) => { gun(m, 1).mainWork.materials = ["a", "b", "c", "d"]; }, "gun_butcesi"],
    ["ana çalışmada 3 hedef", (m) => { gun(m, 2).mainWork.targetGoals = ["a", "b", "c"]; }, "gun_butcesi"],
    ["hedef iki cümle", (m) => { gun(m, 0).objective = "Ela isteği kurar. Sonra bekler."; }, "cumle_butcesi"],
    ["ısınma etkinliği iki cümle", (m) => { gun(m, 1).warmup.activity = "Vagonları dizeriz. Sırayı söyleriz."; }, "cumle_butcesi"],
    ["not iki cümle", (m) => { gun(m, 1).notes = "Sakin köşede başla. Gerekirse mola ver."; }, "cumle_butcesi"],
    ["veli iletişimi tek cümle", (m) => { m.parentCommunication = "Evde çalışabilirsiniz."; }, "cumle_butcesi"],
    ["haftalık hedef iki cümle", (m) => { m.weeklyGoal = "Ela isteği kurar. Sırasını bekler."; }, "cumle_butcesi"],
    ["ana çalışma süresi dersi aşıyor", (m) => { gun(m, 0).mainWork.duration = "60 dakika"; }, "sure_dagilimi"],
    ["süre okunamıyor", (m) => { gun(m, 1).closing.duration = "kısa"; }, "sure_dagilimi"],
    ["bloklar dersten çok kısa", (m) => { for (const d of m.days) { d.warmup.duration = "2 dakika"; d.mainWork.duration = "10 dakika"; d.closing.duration = "3 dakika"; } }, "sure_dagilimi"],
    ["iki gün aynı etkinlik", (m) => { m.days[2] = { ...structuredClone(gun(m, 0)), focusArea: gun(m, 2).focusArea }; }, "etkinlik_cesidi"],
    ["veli iletişimi dört cümle", (m) => { m.parentCommunication = "Bu hafta çalışacağız. Evde oynayın. Sakin kalın. Birlikte gülün."; }, "cumle_butcesi"],
    ["öğrenci özeti üç cümle", (m) => { m.studentSummary = "Ela kısa cümle kuruyor. Oyunda istekli. Geçişte zorlanıyor."; }, "cumle_butcesi"],
    ["gelecek hafta iki cümle", (m) => { m.nextWeekSuggestion = "Gelecek hafta genelle. Sonra ayır."; }, "cumle_butcesi"],
    ["haftalık hedef boş", (m) => { m.weeklyGoal = ""; }, "alanlar"],
    ["uzman notları yok", (m) => { m.expertNotes = " "; }, "alanlar"],
    ["öğrenci özeti boş", (m) => { m.studentSummary = ""; }, "alanlar"],
    ["başlık boş", (m) => { m.title = ""; }, "alanlar"],
    ["veli iletişimi boş", (m) => { m.parentCommunication = ""; }, "alanlar"],
    ["gelecek hafta önerisi boş", (m) => { m.nextWeekSuggestion = ""; }, "alanlar"],
    ["kapanış etkinliği boş", (m) => { gun(m, 1).closing.activity = ""; }, "gun_alanlari"],
    ["ısınma etkinliği boş", (m) => { gun(m, 0).warmup.activity = ""; }, "gun_alanlari"],
    ["odak alanı boş", (m) => { gun(m, 2).focusArea = ""; }, "gun_alanlari"],
  ];
  it.each(mutantlar)("mutant: %s → %s düşer, taban 1", (_ad, mut, anahtar) => {
    const m = kopya();
    mut(m);
    const r = kos(m);
    expect(r.scores[anahtar], anahtar).toBeLessThan(1);
    expect(r.scores.talimat).toBeLessThan(1);
    expect(r.hard).toEqual([]);
  });

  it("model gün adı/tarih/süre yazdıysa (sistem alanı) ham çıktıdan yakalanır; üründeki çıktı değişmez", () => {
    const m = kopya();
    const yazan = { ...m, days: m.days.map((d, i) => (i === 0 ? { ...d, dayName: "Pazartesi", date: "12 Ekim", duration: "40 dakika" } : d)) };
    expect(kos(m, yazan).scores.sistem_alani).toBeCloseTo(2 / 3);
    expect(kos(m, m).scores.sistem_alani).toBe(1);
    expect(kos(m, null).scores.sistem_alani).toBe(0); // ham çıktı yoksa kanıtlanamaz
  });
  it("modelin ham çıktısı dersi fazla üretip rota kırptıysa ders sayısı yine 0", () => {
    const m = kopya();
    const fazla = { ...m, days: [...m.days, structuredClone(m.days[0]!)] };
    expect(kos(m, fazla).scores.ders_sayisi).toBe(0); // üründeki çıktı 3 ders (rota kırptı), ham 4
    expect(kos(m, m).scores.ders_sayisi).toBe(1);
  });

  it("ders sayısı: ham çıktı yokken yalnız üründeki çıktıya bakılır (fazla da eksik de 0)", () => {
    const fazla = kopya();
    fazla.days.push(structuredClone(fazla.days[0]!));
    expect(kos(fazla, null).scores.ders_sayisi).toBe(0);
    const eksik = kopya();
    eksik.days.pop();
    expect(kos(eksik, null).scores.ders_sayisi).toBe(0);
    expect(kos(kopya(), null).scores.ders_sayisi).toBe(1);
  });

  describe("sure_dagilimi: ısınma + ana çalışma + kapanış ≈ ders süresi", () => {
    const sureler = (w: string, m: string, c: string, b: WeeklyPlanBody = B3) => {
      const x = kopya();
      for (const d of x.days) { d.warmup.duration = w; d.mainWork.duration = m; d.closing.duration = c; }
      return kos(x, x, b).scores.sure_dagilimi;
    };
    const B20: WeeklyPlanBody = { ...B3, sessionDuration: "20" };
    it("40 dk: toplam 40 ± 5 geçer, 6 sapma 0", () => {
      expect(sureler("5 dakika", "30 dakika", "5 dakika")).toBe(1);
      expect(sureler("5 dakika", "25 dakika", "5 dakika")).toBe(1); // 35: sınırda
      expect(sureler("5 dakika", "35 dakika", "5 dakika")).toBe(1); // 45: sınırda
      expect(sureler("5 dakika", "24 dakika", "5 dakika")).toBe(0); // 34
      expect(sureler("5 dakika", "36 dakika", "5 dakika")).toBe(0); // 46
    });
    it("20 dk'lık derste tolerans %15 = 3 dk (45 dk'lık prompt örneği ya da 25 dk geçmez)", () => {
      expect(sureler("3 dakika", "12 dakika", "5 dakika", B20)).toBe(1); // 20
      expect(sureler("3 dakika", "15 dakika", "5 dakika", B20)).toBe(1); // 23
      expect(sureler("3 dakika", "16 dakika", "5 dakika", B20)).toBe(0); // 24
      expect(sureler("5 dakika", "30 dakika", "10 dakika", B20)).toBe(0); // 45: prompt örneği 20 dk'lık derse kopyalanmış
    });
    it("saniye dakikaya çevrilir; aralık ortalamayla okunur; ondalık virgül/nokta", () => {
      expect(sureler("30 saniye", "35 dakika", "5 dakika")).toBe(1); // 40,5
      expect(sureler("30 sn", "35 dk", "5 dk")).toBe(1);
      expect(sureler("5-9 dk", "20–30 dk", "6 - 10 dk")).toBe(1); // 7 + 25 + 8
      expect(sureler("2,5 dakika", "32.5 dakika", "5 dakika")).toBe(1);
    });
    it("bir blok okunamıyorsa o ders sayılmaz; kısmen doğru günler orantılı", () => {
      expect(sureler("5 dakika", "30 dakika", "kısa")).toBe(0);
      const x = kopya();
      for (const d of x.days) { d.warmup.duration = "5 dakika"; d.mainWork.duration = "30 dakika"; d.closing.duration = "5 dakika"; }
      x.days[1]!.mainWork.duration = "5 dakika";
      expect(kos(x).scores.sure_dagilimi).toBeCloseTo(2 / 3);
      expect(kos(x).details.sure_toplamlari).toBe("40|15|40");
    });
  });

  describe("etkinlik_cesidi: yalnız neredeyse-kopya etkinlik tekrardır", () => {
    it("aynı etkinlik metni ama farklı adımlar: ayrı etkinlik (adımlar da imzaya girer)", () => {
      const x = kopya();
      x.days[2]!.mainWork.activity = x.days[0]!.mainWork.activity;
      x.days[2]!.mainWork.steps = ["Kartları dağıt", "Sırayla çevir", "Kazananı alkışla"];
      expect(kos(x).scores.etkinlik_cesidi).toBe(1);
    });
    it("bir sözcük farkıyla kopya: tekrar", () => {
      const x = kopya();
      x.days[2]!.mainWork = structuredClone(x.days[0]!.mainWork);
      x.days[2]!.mainWork.activity += " yine";
      expect(kos(x).scores.etkinlik_cesidi).toBeCloseTo(2 / 3);
    });
    it("boş etkinlikler birbirinin kopyası sayılır", () => {
      const x = kopya();
      for (const d of x.days) { d.mainWork.activity = ""; d.mainWork.steps = []; }
      expect(kos(x).scores.etkinlik_cesidi).toBeCloseTo(1 / 3);
    });
  });

  describe("cumle_butcesi: boş alan çifte cezalanmaz; kısaltma cümleyi bölmez", () => {
    it("boş hedef/etkinlik/hafta alanı gun_alanlari/alanlar'da düşer, cumle_butcesi'nde değil", () => {
      const x = kopya();
      gun(x, 1).objective = "";
      gun(x, 0).warmup.activity = "";
      x.weeklyGoal = "";
      x.parentCommunication = "";
      const r = kos(x);
      expect(r.scores.cumle_butcesi).toBe(1);
      expect(r.scores.gun_alanlari).toBeCloseTo(1 / 3);
      expect(r.scores.alanlar).toBeLessThan(1);
    });
    it("tek sözcüklü haftalık alan ('Evet.') 2–3 cümle beklenen alanda sayılmaz", () => {
      const x = kopya();
      x.parentCommunication = "Evet.";
      expect(kos(x).scores.cumle_butcesi).toBeLessThan(1);
    });
    it("'dk.' ve 'vb.' kısaltmaları cümleyi bölmez", () => {
      const x = kopya();
      gun(x, 0).mainWork.activity = "Oyuncak arabaları 5 dk. boyunca garajda dizeriz.";
      gun(x, 1).closing.activity = "Tren, vagon vb. oyuncakları birlikte topluyoruz.";
      expect(kos(x).scores.cumle_butcesi).toBe(1);
      gun(x, 2).warmup.activity = "Arabaları dizeriz. Sonra sıralarız.";
      expect(kos(x).scores.cumle_butcesi).toBeLessThan(1);
    });
  });

  it("sistem alanları ayrı ayrı: yalnız tarih ya da yalnız süre yazılması da yakalanır", () => {
    const m = kopya();
    const yaz = (alan: string, deger: unknown) => ({ ...m, days: m.days.map((d, i) => (i === 0 ? { ...d, [alan]: deger } : d)) });
    expect(kos(m, yaz("date", "12 Ekim")).scores.sistem_alani).toBeCloseTo(2 / 3);
    expect(kos(m, yaz("duration", "40 dakika")).scores.sistem_alani).toBeCloseTo(2 / 3);
    expect(kos(m, yaz("dayName", "Pazartesi")).scores.sistem_alani).toBeCloseTo(2 / 3);
    expect(kos(m, yaz("date", null)).scores.sistem_alani).toBe(1); // null/boş yazılmış sayılmaz
    expect(kos(m, yaz("date", "")).scores.sistem_alani).toBe(1);
    expect(kos(m, yaz("dayNumber", 1)).scores.sistem_alani).toBe(1); // prompt yalnız gün adı/tarih/süreyi yasaklar
  });

  describe("odak_kapsama: ayırt edici parçalar (ilk kelimenin 5 harfi DEĞİL)", () => {
    const tek = (focus: string, ...gunler: Array<{ focusArea: string; objective?: string }>): number => {
      const m = kopya();
      m.days = gunler.map((g, i) => ({ ...structuredClone(gun(kopya(), i % 3)), focusArea: g.focusArea, objective: g.objective ?? "Etkinlik yapılır." }));
      const b: WeeklyPlanBody = { ...B3, focusAreas: [focus], daySchedule: [{ dayName: "Pazartesi", lessonCount: m.days.length }] };
      return weeklyPlanChecks({ body: b, output: zenginles(m), raw: m as unknown as Rec, text: "", alias: "Ela" }).scores.odak_kapsama!;
    };
    it("'Üç' gibi kısa ilk kelime başka bir derse eşleşme sağlamaz", () => {
      expect(tek("Üç kelimeli istek cümlesi", { focusArea: "Üç adımlı sıra bekleme" })).toBe(0);
      expect(tek("Üç kelimeli istek cümlesi", { focusArea: "Üç kelimeli istek cümlesi" })).toBe(1);
      expect(tek("Üç kelimeli istek cümlesi", { focusArea: "İstek cümleleri" })).toBe(1); // 2/3 parça (yarı)
    });
    it("ses odağında ses harfi ayırt edicidir: /k/ olmadan 'kelime başı' yetmez", () => {
      expect(tek("/k/ sesi kelime başı", { focusArea: "Kelime başlama oyunu" })).toBe(0);
      expect(tek("/k/ sesi kelime başı", { focusArea: "/k/ sesi" })).toBe(1);
      expect(tek("/k/ sesi kelime başı", { focusArea: "Kedi ve kuş sözcükleri" })).toBe(0);
    });
    it("/s/–/ş/ ayrımı: iki ses birden ya da ayrım sözcüğü", () => {
      expect(tek("/s/–/ş/ ayrımı", { focusArea: "/s/ ve /ş/ seslerini ayırt etme" })).toBe(1);
      expect(tek("/s/–/ş/ ayrımı", { focusArea: "/s/ sesi" })).toBe(0);
      expect(tek("/s/–/ş/ ayrımı", { focusArea: "Dinleme", objective: "s ile ş ayrımını işitsel olarak yapar." })).toBe(1);
    });
    it("hedef cümlesindeki ifade de sayılır (odak alanı başlığı farklı yazılmışsa)", () => {
      expect(tek("Nedensel bağlaçlar", { focusArea: "Anlatı", objective: "Ecem çünkü bağlacını nedensel cümlede kullanır." })).toBe(1);
    });
    it.each<[string, string, number]>([
      ["Sıra alma", "Olay sıralama", 0], // yalnız "sıra" kökü: iki parçalı odakta ikisi de gerekir
      ["Sıra alma", "Top almak", 0], // yalnız "alma" kökü
      ["İstek cümlesi", "Cümle kurma", 0],
      ["Gürültüde dinleme", "Dinleme becerisi", 0],
      ["Nedensel bağlaçlar", "anlama bağlamında", 0],
      ["Okuduğunu anlama", "Duygu anlamı", 0],
      ["Sıra alma", "Sıra alma etkinliği", 1],
      ["İstek cümlesi", "İstek cümleleri", 1],
      ["Gürültüde dinleme", "Gürültüde dinleme oyunu", 1],
      ["Nedensel bağlaçlar", "Nedensel bağlaç kullanımı", 1],
      ["Okuduğunu anlama", "Okuduğunu anlama becerisi", 1],
    ])("iki parçalı odak: '%s' ← '%s' → %d (iki parça da gerekir)", (odak, gun, beklenen) => {
      expect(tek(odak, { focusArea: gun })).toBe(beklenen);
    });
    it.each<[string, string, number]>([
      ["Ses ayrımı", "Ayrım çalışması", 1], // "ses" 3 harfli: parça değil; yalnız "ayrım" gerekir
      ["Ses", "Ses çalışması", 1], // yalnız kısa sözcüklerden oluşan odak: bütün ifade aranır
      ["Ses", "Konuşma becerisi", 0],
    ])("kısa sözcükler: '%s' ← '%s' → %d", (odak, gun, beklenen) => {
      expect(tek(odak, { focusArea: gun })).toBe(beklenen);
    });
    it.each(["için", "gibi", "daha", "veya", "olan"])("durak sözcük '%s' odak parçası sayılmaz", (w) => {
      expect(tek(`Duygular ${w} oyun`, { focusArea: `Duygu tanıma ${w} etkinlik` })).toBe(0); // yalnız durak + duygu: oyun yok
      expect(tek(`Duygular ${w} oyun`, { focusArea: "Duygu oyunu" })).toBe(1);
    });
    it.each<[string, string, number]>([
      ["Sesi duyma", "Sesleri duymak", 1], // 4 harfli sözcük: son harf atılır ("ses"), 5 harfli: "duym"
      ["İstek", "İsteme", 1], // 5 harfli: "iste"
      ["Anlatı", "anlatma", 1], // 6+ harfli: ilk 5 harf ("anlat")
      ["Anlatı", "Anlamak", 0], // 4 harfli kök ("anla") eşleşme sağlamaz
    ])("kök uzunluğu: '%s' ← '%s' → %d", (odak, gun, beklenen) => {
      expect(tek(odak, { focusArea: gun })).toBe(beklenen);
    });
    it("kapsanan/ kapsanmayan odak oranı", () => {
      const m = kopya();
      expect(weeklyPlanChecks({ body: { ...B3, focusAreas: ["Sıra alma", "Duygu tanıma", "Gürültüde dinleme"] }, output: zenginles(m), raw: m as unknown as Rec, text: "", alias: "Ela" }).scores.odak_kapsama).toBeCloseTo(1 / 3);
    });
  });

  describe("cumle_butcesi: haftalık alan sınırları (alt ve üst, her alan için)", () => {
    const cumleler = (n: number) => Array.from({ length: n }, (_, i) => `Çalışma ${i + 1} güzel geçti.`).join(" ");
    const HAFTA: Array<[keyof Ham, number, number]> = [["studentSummary", 1, 2], ["weeklyGoal", 1, 1], ["parentCommunication", 2, 3], ["expertNotes", 2, 3], ["nextWeekSuggestion", 1, 1]];
    const puan = (alan: keyof Ham, metin: string) => {
      const x = kopya();
      (x as unknown as Rec)[alan] = metin;
      return kos(x).scores.cumle_butcesi!;
    };
    it.each(HAFTA)("%s: [%d, %d] cümle", (alan, en, cok) => {
      expect(puan(alan, cumleler(en)), "alt sınır").toBe(1);
      expect(puan(alan, cumleler(cok)), "üst sınır").toBe(1);
      expect(puan(alan, cumleler(cok + 1)), "üst sınırın bir fazlası").toBeLessThan(1);
      expect(puan(alan, en === 1 ? "Evet." : cumleler(en - 1)), "alt sınırın bir eksiği").toBeLessThan(1);
    });
  });

  describe("etkinlik_cesidi: AYNI_ETKINLIK eşiği 0,8 (Jaccard ≥ 0,8 tekrar)", () => {
    const etk = (a: string, b: string) => {
      const x = kopya();
      const ana = (activity: string) => ({ activity, duration: "30 dakika", steps: [] as string[], materials: [] as string[], targetGoals: [] as string[] });
      x.days[0]!.mainWork = ana(a);
      x.days[1]!.mainWork = ana("xxxx yyyy zzzz wwww vvvv");
      x.days[2]!.mainWork = ana(b);
      return kos(x).scores.etkinlik_cesidi!;
    };
    const DOKUZ = "alfa beta gama delta epsilon zeta eta teta iota";
    it("tam 0,8 (4/5) tekrar; hemen altı (7/9 = 0,78) ayrı etkinlik; 0,9 ve aynısı tekrar; 0,67 ayrı", () => {
      expect(etk("alfa beta gama delta", "alfa beta gama delta epsilon")).toBeCloseTo(2 / 3); // 4/5 = 0,8
      expect(etk("alfa beta gama delta epsilon zeta eta teta", "alfa beta gama delta epsilon zeta eta kapa")).toBe(1); // 7/9 = 0,778
      expect(etk(DOKUZ, `${DOKUZ} kapa`)).toBeCloseTo(2 / 3); // 9/10
      expect(etk(DOKUZ, DOKUZ)).toBeCloseTo(2 / 3);
      expect(etk("alfa beta gama delta", "alfa beta gama delta epsilon zeta")).toBe(1); // 4/6
    });
  });

  describe("dayanıklılık", () => {
    it("null / metin / sayı gün ve blok öğeleri çökmez", () => {
      const m = kopya() as unknown as Rec;
      const bozuk = { ...m, days: [null, "x", 7, { focusArea: "Sıra alma", objective: null, warmup: "a", mainWork: { steps: [null, 3], materials: null, targetGoals: "g" }, closing: [1], notes: 5 }] };
      expect(() => weeklyPlanChecks({ body: B3, output: bozuk, raw: bozuk, text: "", alias: "Ela" })).not.toThrow();
      const r = weeklyPlanChecks({ body: B3, output: bozuk, raw: bozuk, text: "", alias: "Ela" });
      expect(r.hard).toEqual([]);
      expect(r.scores.ders_sayisi).toBe(0);
      expect(r.scores.gun_alanlari).toBe(0);
      expect(r.scores.talimat).toBeLessThan(0.6);
    });
    it("days boş dizi ya da dizi değil: sert hata; çıktı yok: talimat 0, çökmez", () => {
      expect(kos({ ...kopya(), days: [] }).hard).toContain("gun_dizisi_yok");
      expect(kos({ ...kopya(), days: { 0: {} } }).hard).toContain("gun_dizisi_yok");
      const yok = weeklyPlanChecks({ body: B3, output: null, raw: null, text: "", alias: null });
      expect(yok.hard).toEqual([]);
      expect(yok.scores.talimat).toBe(0);
      expect(yok.scores.materyal_butce).toBe(0); // eksik liste "bütçe içinde" sayılmaz
    });
    it("dizi çıktı / metin çıktı nesne sayılmaz", () => {
      expect(weeklyPlanChecks({ body: B3, output: [1], raw: null, text: "", alias: null }).scores.talimat).toBe(0);
      expect(weeklyPlanChecks({ body: B3, output: "metin", raw: null, text: "", alias: null }).scores.talimat).toBe(0);
    });
  });
});
