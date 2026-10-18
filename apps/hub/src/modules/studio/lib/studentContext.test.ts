import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NameMapping } from "@ludenlab/ai";
import type { PrismaClient } from "@/generated/studio/client";
import {
  BUTCE_TOPLAM,
  PROFIL_BOLUMLERI,
  loadStudentContext,
  profilBolumleriniAyikla,
  renderStudentBlock,
  type StudentContextInput,
} from "./studentContext";

// `@studio/lib/pseudonym` → `@studio/lib/db` → PrismaClient kurulumu (import anında). Saf
// biçimlendirici testinde DB istemcisi kurulmasın diye köprü taklit edilir (toolHandler.test ile aynı).
vi.mock("@studio/lib/db", () => ({ prisma: {} }));

const map: NameMapping = { real: "Ela Şahin", alias: "Nisa" };

const temel: StudentContextInput = {
  alias: "Nisa",
  ageYears: 6,
  workArea: "language",
  diagnosis: "OSB, hafif; ifade edici dil gecikmesi",
  notes: null,
  recentObservations: [],
  aiProfile: null,
  curriculumTitles: [],
  recentCards: [],
  lastSummary: null,
  completedGoalCodes: [],
  inProgressGoalTitles: [],
};

/** Yalnız yedek (eşi olmayan surrogate) — JSON/HTTP katmanında geçersiz UTF-8'e döner. */
const YALNIZ_YEDEK = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

describe("renderStudentBlock", () => {
  it("kimlik satırı her zaman yazılır ve kesilmez", () => {
    const t = renderStudentBlock(temel);
    expect(t).toContain("Öğrenci: Nisa, 6 yaş");
    expect(t).toContain("Çalışma alanı: Dil");
    expect(t).toContain("Tanı: OSB, hafif; ifade edici dil gecikmesi");
  });

  it("yaş yoksa yaş yazılmaz, tanı yoksa tanı satırı yok", () => {
    const t = renderStudentBlock({ ...temel, ageYears: null, diagnosis: null });
    expect(t).toContain("Öğrenci: Nisa\n");
    expect(t).not.toContain("Tanı:");
  });

  it("modüller: katalog sınırlı, hepsi listelenir", () => {
    const t = renderStudentBlock({ ...temel, curriculumTitles: ["Pragmatik Dil", "Kekemelik", "Artikülasyon", "İşitsel İşlemleme", "Fonolojik Farkındalık"] });
    expect(t).toContain("Modüller: Pragmatik Dil, Kekemelik, Artikülasyon, İşitsel İşlemleme, Fonolojik Farkındalık");
  });

  it("uzman notu 400 karakterde kırpılır ve '…' ile biter", () => {
    const t = renderStudentBlock({ ...temel, notes: "a".repeat(600) });
    const satir = t.split("\n").find((l) => l.startsWith("Uzman notları: "))!;
    expect(satir.length).toBeLessThanOrEqual("Uzman notları: ".length + 400);
    expect(satir.endsWith("…")).toBe(true);
  });

  it("kırpma bir emoji'nin ortasına denk gelirse yalnız yedek bırakmaz", () => {
    // 398 harf + 😀 (2 kod birimi) + 'b' = 401 → 399'da kesilir, kesim emoji'nin ortasıdır.
    const t = renderStudentBlock({ ...temel, notes: "a".repeat(398) + "😀" + "b" });
    const satir = t.split("\n").find((l) => l.startsWith("Uzman notları: "))!;
    expect(satir).not.toMatch(YALNIZ_YEDEK);
    expect(satir.endsWith("a…")).toBe(true);
    expect(satir.length).toBeLessThanOrEqual("Uzman notları: ".length + 400);
    expect(t).not.toMatch(YALNIZ_YEDEK);
  });

  it("profilden yalnız üç bölüm alınır (≤1100 karakter), diğer başlıklar gelmez; sıra öncelik → dikkat → yaklaşım", () => {
    const profil = `## Kavramsal Arka Plan\n\n### Tanının Klinik Açıklaması\nUzun açıklama.\n\n---\n\n## Uzmana Öneriler\n\n### Öncelikli Çalışma Alanları\n- İki kelimeli istek cümlelerini üçe genişletme\n- Geçiş anlarında görsel uyarı\n\n### Etkili Yaklaşım ve Teknikler\n- Model olma ve genişletme\n- Doğal ortamda öğretim\n\n### Dikkat Edilmesi Gereken Noktalar\nAni ses değişimleri kaygı yaratır.\n\n### Aile ile Paylaşılabilecek Öneriler\nEvde resimli program.`;
    const t = renderStudentBlock({ ...temel, aiProfile: profil });
    expect(t).toContain("Öncelikli çalışma alanları: İki kelimeli istek cümlelerini üçe genişletme; Geçiş anlarında görsel uyarı");
    expect(t).toContain("Dikkat edilmesi gerekenler: Ani ses değişimleri kaygı yaratır.");
    expect(t).toContain("Etkili yaklaşım: Model olma ve genişletme; Doğal ortamda öğretim");
    // Profildeki sıra farklı olsa da blokta sıra sabittir: öncelik → dikkat → yaklaşım.
    expect(t.indexOf("Öncelikli çalışma alanları: ")).toBeLessThan(t.indexOf("Dikkat edilmesi gerekenler: "));
    expect(t.indexOf("Dikkat edilmesi gerekenler: ")).toBeLessThan(t.indexOf("Etkili yaklaşım: "));
    expect(t).not.toContain("Klinik Açıklaması");
    expect(t).not.toContain("Evde resimli program");
  });

  it("profil üç satırı birlikte 1100 karakteri aşmaz; yaklaşım satırı tek başına ≤300 ve '…' ile biter", () => {
    const t = renderStudentBlock({
      ...temel,
      aiProfile: `### Öncelikli Çalışma Alanları\n${"o".repeat(500)}\n### Dikkat Edilmesi Gereken Noktalar\n${"d".repeat(300)}\n### Etkili Yaklaşım ve Teknikler\n${"t".repeat(700)}`,
    });
    const satirlar = t.split("\n").filter((l) => /^(Öncelikli çalışma alanları|Dikkat edilmesi gerekenler|Etkili yaklaşım): /.test(l));
    expect(satirlar).toHaveLength(3);
    expect(satirlar.reduce((n, l) => n + l.length, 0)).toBeLessThanOrEqual(1100);
    const yaklasim = satirlar.find((l) => l.startsWith("Etkili yaklaşım: "))!;
    expect(yaklasim.length).toBeLessThanOrEqual(300);
    expect(yaklasim.endsWith("…")).toBe(true);
  });

  it("ilk iki bölüm profil bütçesini doldurursa yaklaşım satırı atlanır; kalan dar ama ≥40 ise sığdığı kadar yazılır", () => {
    const dolu = renderStudentBlock({
      ...temel,
      aiProfile: `### Öncelikli Çalışma Alanları\n${"o".repeat(700)}\n### Dikkat Edilmesi Gereken Noktalar\n${"d".repeat(700)}\n### Etkili Yaklaşım ve Teknikler\nModel olma.`,
    });
    expect(dolu).toContain("Öncelikli çalışma alanları: ");
    expect(dolu).toContain("Dikkat edilmesi gerekenler: ");
    expect(dolu).not.toContain("Etkili yaklaşım");

    // 728 + 328 = 1056 → kalan 44 (>40): yaklaşım satırı 44 karaktere kırpılır.
    const dar = renderStudentBlock({
      ...temel,
      aiProfile: `### Öncelikli Çalışma Alanları\n${"o".repeat(700)}\n### Dikkat Edilmesi Gereken Noktalar\n${"d".repeat(300)}\n### Etkili Yaklaşım ve Teknikler\n${"t".repeat(200)}`,
    });
    const yaklasim = dar.split("\n").find((l) => l.startsWith("Etkili yaklaşım: "))!;
    expect(yaklasim).toBeDefined();
    expect(yaklasim.length).toBe(44);
    expect(yaklasim.endsWith("…")).toBe(true);
  });

  it("son 5 kart: başlık ≤80 karakter, araç türü ve tarih", () => {
    const cards = Array.from({ length: 7 }, (_, i) => ({
      title: `Kart ${i} ${"x".repeat(100)}`,
      toolType: "SOCIAL_STORY",
      createdAt: new Date(2026, 8, 1 + i),
    }));
    const t = renderStudentBlock({ ...temel, recentCards: cards });
    const satirlar = t.split("\n").filter((l) => l.startsWith("- Kart "));
    expect(satirlar).toHaveLength(5);
    expect(satirlar[0]!.length).toBeLessThanOrEqual(80 + " (SOCIAL_STORY, 07.09.2026)".length + 2);
  });

  it("kartlar yeniden eskiye sıralanır; sıra girdiden bağımsızdır", () => {
    const cards = [
      { title: "Eski", toolType: "HOMEWORK", createdAt: new Date(2026, 8, 1) },
      { title: "Yeni", toolType: null, createdAt: new Date(2026, 8, 9) },
    ];
    const t = renderStudentBlock({ ...temel, recentCards: cards });
    const satirlar = t.split("\n").filter((l) => l.startsWith("- "));
    expect(satirlar).toEqual(["- Yeni (kart, 09.09.2026)", "- Eski (HOMEWORK, 01.09.2026)"]);
  });

  it("son oturum özeti: genel değerlendirme + sonraki plan, ≤400 karakter", () => {
    const t = renderStudentBlock({
      ...temel,
      lastSummary: { createdAt: new Date(2026, 9, 1), overallAssessment: "İyi gitti. ".repeat(40), nextSessionPlan: "Üç sözcüklü isteğe geç." },
    });
    const satir = t.split("\n").find((l) => l.startsWith("Son oturum (01.10.2026): "))!;
    expect(satir.length).toBeLessThanOrEqual("Son oturum (01.10.2026): ".length + 400);
    expect(satir).toContain("Sonraki plan:");
  });

  it("yarım bütçe kuralı: 600 karakterlik değerlendirme 150 karakterlik planı dışarı itmez; plan tam yazılır", () => {
    const plan = "p".repeat(150);
    const t = renderStudentBlock({
      ...temel,
      lastSummary: { createdAt: new Date(2026, 9, 1), overallAssessment: "o".repeat(600), nextSessionPlan: plan },
    });
    const onEk = "Son oturum (01.10.2026): ";
    const satir = t.split("\n").find((l) => l.startsWith(onEk))!;
    expect(satir).toContain(`Sonraki plan: ${plan}`);
    expect(satir.endsWith(plan)).toBe(true);
    expect(satir.length).toBe(onEk.length + 400); // değerlendirme artan 235'e kırpıldı
  });

  it("son oturumda yalnız plan varsa değerlendirmesiz yazılır; ikisi de boşsa satır yok", () => {
    const t = renderStudentBlock({
      ...temel,
      lastSummary: { createdAt: new Date(2026, 9, 1), overallAssessment: null, nextSessionPlan: "Sıra alma oyunu." },
    });
    expect(t).toContain("Son oturum (01.10.2026): Sonraki plan: Sıra alma oyunu.");
    const bos = renderStudentBlock({ ...temel, lastSummary: { createdAt: new Date(2026, 9, 1), overallAssessment: null, nextSessionPlan: null } });
    expect(bos).not.toContain("Son oturum");
  });

  it("hedefler: tamamlanan kodlar + süren başlıklar, toplam ≤10 madde", () => {
    const t = renderStudentBlock({
      ...temel,
      completedGoalCodes: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7"],
      inProgressGoalTitles: ["Üç sözcüklü istek", "Sıra alma", "Ortak dikkat", "Taklit"],
    });
    expect(t).toContain("Tamamlanan hedefler: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7");
    expect(t).toContain("Sürmekte olan hedefler: Üç sözcüklü istek, Sıra alma, Ortak dikkat");
    expect(t).not.toContain("Taklit"); // 7 + 3 = 10
  });

  /** Alanlar dolu ama toplam sığıyor: kimlik ~85 + not 416 + profil ~796 (tavan 1101 — tüm tavanlar
      toplanınca 2400 aşılır; o durumda sonraki alanların atlanması aşağıda ayrıca sınanır) + kartlar 561 + özet 426 ≈ 2284. */
  const dolu: StudentContextInput = {
    ...temel,
    notes: "n".repeat(400),
    aiProfile: `### Öncelikli Çalışma Alanları\n${"- madde ".repeat(60)}\n### Dikkat Edilmesi Gereken Noktalar\n${"d".repeat(260)}`,
    recentCards: Array.from({ length: 5 }, (_, i) => ({ title: "k".repeat(80), toolType: "WEEKLY_PLAN", createdAt: new Date(2026, 8, i + 1) })),
    lastSummary: { createdAt: new Date(2026, 9, 1), overallAssessment: "o".repeat(300), nextSessionPlan: "p".repeat(300) },
  };

  it("tam sığan durum: hiçbir alan atlanmaz, toplam ≤2400, kimlik başta", () => {
    const t = renderStudentBlock({ ...dolu, completedGoalCodes: ["1.1"], inProgressGoalTitles: ["x".repeat(60)] });
    expect(BUTCE_TOPLAM).toBe(2400);
    expect(t.length).toBeLessThanOrEqual(2400);
    expect(t.startsWith("Öğrenci: Nisa")).toBe(true);
    for (const parca of ["Uzman notları: ", "Öncelikli çalışma alanları: ", "Son çalışmalar:", "Son oturum (01.10.2026): ", "Tamamlanan hedefler: 1.1", `Sürmekte olan hedefler: ${"x".repeat(60)}`]) {
      expect(t).toContain(parca);
    }
  });

  it("bütçe sınırı: tam 2400'e düşen hedef alanı kalır, 2401'e düşen atılır", () => {
    const once = renderStudentBlock(dolu).length;
    const onEk = "\nSürmekte olan hedefler: ".length;
    expect(2400 - once - onEk).toBeGreaterThan(0);

    const tam = renderStudentBlock({ ...dolu, inProgressGoalTitles: ["x".repeat(2400 - once - onEk)] });
    expect(tam.length).toBe(2400);
    expect(tam).toContain("Sürmekte olan hedefler:");

    const tasan = renderStudentBlock({ ...dolu, inProgressGoalTitles: ["x".repeat(2401 - once - onEk)] });
    expect(tasan.length).toBe(once);
    expect(tasan).not.toContain("Sürmekte");
  });

  it("bütçeye sığmayan alan atlanır ama sonraki küçük alan yine yazılır; kimlik satırları kesilmez", () => {
    const t = renderStudentBlock({
      ...dolu,
      diagnosis: "t".repeat(300), // kimlik: kesilmez, bütçeyi erken doldurur
      aiProfile: `### Öncelikli Çalışma Alanları\n${"- madde ".repeat(120)}`,
      completedGoalCodes: ["1.1", "1.2"],
      inProgressGoalTitles: [],
    });
    expect(t.length).toBeLessThanOrEqual(2400);
    expect(t).toContain(`Tanı: ${"t".repeat(300)}`);
    expect(t).not.toContain("Son oturum"); // 426 karakter sığmadı → atlandı
    expect(t).toContain("Tamamlanan hedefler: 1.1, 1.2"); // sıradaki küçük alan sığdı
  });

  it("alias satırı dışında gerçek ad hiçbir alanda kalmaz (scrub)", () => {
    const t = renderStudentBlock(
      {
        ...temel,
        diagnosis: "Ela Şahin: OSB",
        notes: "Ela Şahin dinozorları sever.",
        aiProfile: "### Öncelikli Çalışma Alanları\nEla'nın istek cümleleri.\n### Dikkat Edilmesi Gereken Noktalar\nEla Şahin kaygılı.",
        recentCards: [{ title: "Ela için sosyal hikâye", toolType: "SOCIAL_STORY", createdAt: new Date(2026, 8, 1) }],
        lastSummary: { createdAt: new Date(2026, 9, 1), overallAssessment: "Ela iyi.", nextSessionPlan: "Elanın sırası" },
        inProgressGoalTitles: ["Ela ile sıra alma"],
      },
      map,
    );
    expect(t).not.toMatch(/Ela/);
    expect(t).toContain("Nisa");
  });

  it("çok satırlı serbest metin tek satıra iner", () => {
    const t = renderStudentBlock({ ...temel, notes: "ilk\n\nikinci  \t üçüncü" });
    expect(t).toContain("Uzman notları: ilk ikinci üçüncü");
  });

  it("son gözlemler: uzman notlarından sonra, profilden önce; tarihli satırlar; yeni → eski", () => {
    const t = renderStudentBlock({
      ...temel,
      notes: "Trenleri sever",
      aiProfile: "## Uzmana Öneriler\n\n### Öncelikli Çalışma Alanları\n- İki kelime",
      recentObservations: [
        { text: "/r/ kelime başında %60", createdAt: new Date(2026, 9, 14) },
        { text: "Oyunla daha iyi", createdAt: new Date(2026, 9, 16) },
      ],
    });
    expect(t).toContain("Son gözlemler:\n- 16.10.2026: Oyunla daha iyi\n- 14.10.2026: /r/ kelime başında %60");
    expect(t.indexOf("Uzman notları:")).toBeLessThan(t.indexOf("Son gözlemler:"));
    expect(t.indexOf("Son gözlemler:")).toBeLessThan(t.indexOf("Öncelikli çalışma alanları:"));
  });

  it("son gözlemler 400 karakterde kalır: sığmayan EN ESKİ satırlar düşer", () => {
    const gozlemler = Array.from({ length: 5 }, (_, i) => ({ text: `${i}`.repeat(150), createdAt: new Date(2026, 9, 10 + i) }));
    const t = renderStudentBlock({ ...temel, recentObservations: gozlemler });
    const blok = t.slice(t.indexOf("Son gözlemler:"));
    expect(blok.length).toBeLessThanOrEqual("Son gözlemler:".length + 400 + 1);
    expect(blok).toContain("- 14.10.2026: 4444");
    expect(blok).not.toContain("- 10.10.2026:");
  });

  it("gözlem metni rumuzlanır", () => {
    const t = renderStudentBlock({ ...temel, recentObservations: [{ text: "Ela Şahin bugün çok iyiydi", createdAt: new Date(2026, 9, 14) }] }, map);
    expect(t).toContain("- 14.10.2026: Nisa bugün çok iyiydi");
    expect(t).not.toMatch(/Ela/);
  });

  it("gözlem yoksa başlık da yok", () => {
    expect(renderStudentBlock(temel)).not.toContain("Son gözlemler");
  });
});

describe("profilBolumleriniAyikla", () => {
  it("başlıklar sabit sözleşmedir (ilk ikisi generateProfile/arayüz sözleşmesi; üçüncüsü yaklaşım)", () => {
    expect(PROFIL_BOLUMLERI).toEqual(["Öncelikli Çalışma Alanları", "Dikkat Edilmesi Gereken Noktalar", "Etkili Yaklaşım ve Teknikler"]);
  });
  it("başlık yoksa boş döner; madde işaretleri '; ' ile birleşir; üçüncü bölüm `teknik`", () => {
    expect(profilBolumleriniAyikla("serbest metin")).toEqual({ oncelik: "", dikkat: "", teknik: "" });
    expect(profilBolumleriniAyikla("### Öncelikli Çalışma Alanları\n- a\n- b\n### Dikkat Edilmesi Gereken Noktalar\nc")).toEqual({ oncelik: "a; b", dikkat: "c", teknik: "" });
    expect(
      profilBolumleriniAyikla("### Öncelikli Çalışma Alanları\n- a\n### Etkili Yaklaşım ve Teknikler\n- t1\n- t2\n### Dikkat Edilmesi Gereken Noktalar\nc"),
    ).toEqual({ oncelik: "a", dikkat: "c", teknik: "t1; t2" });
  });
  it("başlık düzeyi (##/###), numaralı madde ve '---' ayracı tanınır", () => {
    expect(
      profilBolumleriniAyikla("## Öncelikli Çalışma Alanları\n1. a\n2) b\n\n---\n\nserbest\n## Dikkat Edilmesi Gereken Noktalar\n* c\n# Başka"),
    ).toEqual({ oncelik: "a; b", dikkat: "c", teknik: "" });
  });
  it("kalın başlık (**…**), numaralı başlık ve sondaki ':' tanınır; tamamı kalın satır bölümü bitirir", () => {
    expect(
      profilBolumleriniAyikla("**Öncelikli Çalışma Alanları**\n- a\n**Dikkat Edilmesi Gereken Noktalar:**\nb\n**Aile ile Paylaşılabilecek Öneriler**\nc"),
    ).toEqual({ oncelik: "a", dikkat: "b", teknik: "" });
    expect(profilBolumleriniAyikla("### 1. Öncelikli Çalışma Alanları:\na\n__Dikkat Edilmesi Gereken Noktalar__\nb")).toEqual({ oncelik: "a", dikkat: "b", teknik: "" });
    // Kalın VURGU içeren gövde satırı (tamamı kalın değil) bölümü bitirmez.
    expect(profilBolumleriniAyikla("### Öncelikli Çalışma Alanları\n**Not:** a\nb")).toEqual({ oncelik: "**Not:** a; b", dikkat: "", teknik: "" });
  });
  it("boşluksuz '###Başlık' ve '***' çizgisi bölümü bitirir", () => {
    expect(profilBolumleriniAyikla("### Öncelikli Çalışma Alanları\na\n###Dikkat Edilmesi Gereken Noktalar\nb\n***\nserbest")).toEqual({ oncelik: "a", dikkat: "b", teknik: "" });
  });
});

describe("loadStudentContext", () => {
  const prisma = {
    student: { findFirst: vi.fn() },
    card: { findMany: vi.fn(), findFirst: vi.fn() },
    curriculum: { findMany: vi.fn() },
    studentProgress: { findMany: vi.fn() },
    studentObservation: { findMany: vi.fn() },
  };
  const ogrenci = { id: "s1", name: "Ela Şahin", birthDate: new Date(2020, 4, 14), workArea: "language", diagnosis: "OSB", notes: "Ela trenleri sever", aiProfile: null, curriculumIds: ["c1"] };
  const istek = { studentId: "s1", therapistId: "t1", nameMap: map, now: new Date(2026, 9, 12) };

  /** Her test temiz başlar: çağrı geçmişi silinir, dört sorgu da mutlu yola kurulur. */
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.student.findFirst.mockResolvedValue(ogrenci);
    prisma.card.findMany.mockResolvedValue([{ title: "Ela treni", toolType: "SOCIAL_STORY", createdAt: new Date(2026, 8, 1) }]);
    prisma.card.findFirst.mockResolvedValue(null);
    prisma.curriculum.findMany.mockResolvedValue([{ title: "Pragmatik Dil" }]);
    prisma.studentProgress.findMany.mockResolvedValue([
      { status: "completed", goal: { code: "2.1", title: "İstek" } },
      { status: "in_progress", goal: { code: "2.2", title: "Sıra alma" } },
    ]);
    prisma.studentObservation.findMany.mockResolvedValue([
      { text: "Ela /r/ sesinde ilerledi", createdAt: new Date(2026, 9, 11) },
    ]);
  });

  it("gerçek PrismaClient yükleyicinin istemci tipine uyar (sonraki görevler onu geçecek)", () => {
    const istemci = null as unknown as PrismaClient;
    const kabul: Parameters<typeof loadStudentContext>[0] = istemci;
    expect(kabul).toBeNull();
  });

  it("sorguları uzmanla kapsamlar, bloğu rumuzlu döndürür", async () => {
    const blok = await loadStudentContext(prisma as never, istek);
    expect(prisma.student.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "s1", therapistId: "t1" } }));
    expect(prisma.card.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: "s1", therapistId: "t1" }, take: 5 }));
    expect(prisma.card.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: "s1", therapistId: "t1", toolType: "SESSION_SUMMARY" } }));
    expect(prisma.curriculum.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ["c1"] } } }));
    expect(blok).toContain("Öğrenci: Nisa, 6 yaş");
    expect(blok).toContain("Modüller: Pragmatik Dil");
    expect(blok).toContain("Nisa treni");
    expect(blok).toContain("Tamamlanan hedefler: 2.1");
    expect(blok).toContain("Sürmekte olan hedefler: Sıra alma");
    expect(blok).not.toMatch(/Ela/);
  });

  it("hedef sorgusunun biçimi sabittir (eval taklidi bunu sunar); kazanıldı/pekiştiriliyor durumları eşlenir", async () => {
    prisma.studentProgress.findMany.mockResolvedValue([
      { status: "completed", goal: { code: "2.1", title: "İstek" } },
      { status: "mastered", goal: { code: "2.3", title: "Taklit" } },
      { status: "in_progress", goal: { code: "2.2", title: "Sıra alma" } },
      { status: "consolidating", goal: { code: "2.4", title: "Ortak dikkat" } },
      { status: "not_started", goal: { code: "2.5", title: "Başlanmamış" } },
    ]);
    const blok = await loadStudentContext(prisma as never, istek);
    expect(prisma.studentProgress.findMany).toHaveBeenCalledWith({
      where: { studentId: "s1", therapistId: "t1", status: { in: ["completed", "mastered", "in_progress", "consolidating"] } },
      select: { status: true, goal: { select: { code: true, title: true } } },
    });
    expect(blok).toContain("Tamamlanan hedefler: 2.1, 2.3");
    expect(blok).toContain("Sürmekte olan hedefler: Sıra alma, Ortak dikkat");
    expect(blok).not.toContain("Başlanmamış");
  });

  it("son oturum kartından üretimde kaydedilen anahtarlar okunur; eski/yanlış anahtarlar satır üretmez", async () => {
    prisma.card.findFirst.mockResolvedValue({ createdAt: new Date(2026, 9, 1), content: { overallAssessment: "Ela hedefe yakın.", nextSessionPlan: "Üçlü istek", overallPerformance: "on_target" } });
    const blok = await loadStudentContext(prisma as never, istek);
    expect(blok).toContain("Son oturum (01.10.2026): Nisa hedefe yakın. Sonraki plan: Üçlü istek");
    expect(blok).not.toContain("on_target");

    prisma.card.findFirst.mockResolvedValue({ createdAt: new Date(2026, 9, 1), content: { overallPerformance: "on_target", sessionNotes: "x", nextSessionGoals: "y" } });
    expect(await loadStudentContext(prisma as never, istek)).not.toContain("Son oturum");
  });

  it("exclude: ['aiProfile'] profili bloğa almaz; müfredat yoksa müfredat sorgusu yapılmaz", async () => {
    prisma.student.findFirst.mockResolvedValue({ ...ogrenci, aiProfile: "### Öncelikli Çalışma Alanları\n- İstek cümleleri", curriculumIds: [] });
    const tam = await loadStudentContext(prisma as never, istek);
    expect(tam).toContain("Öncelikli çalışma alanları: İstek cümleleri");
    const dar = await loadStudentContext(prisma as never, { ...istek, exclude: ["aiProfile"] });
    expect(dar).not.toContain("Öncelikli çalışma alanları");
    expect(dar).toContain("Uzman notları: Nisa trenleri sever");
    expect(prisma.curriculum.findMany).not.toHaveBeenCalled();
    expect(dar).not.toContain("Modüller:");
  });

  it("öğrenci satırı verilirse öğrenci sorgusu atlanır, blok ondan kurulur", async () => {
    const { id: _id, name: _name, ...satir } = ogrenci;
    const blok = await loadStudentContext(prisma as never, { ...istek, student: { ...satir, diagnosis: "DKGB" } });
    expect(prisma.student.findFirst).not.toHaveBeenCalled();
    expect(blok).toContain("Öğrenci: Nisa, 6 yaş");
    expect(blok).toContain("Tanı: DKGB");
    expect(blok).toContain("Modüller: Pragmatik Dil");
    expect(blok).toContain("Nisa treni");
  });

  it("öğrenci sorgusu patlarsa boş string döner ve console.warn çağrılır (üretim sürer)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    prisma.student.findFirst.mockRejectedValue(new Error("db"));
    const blok = await loadStudentContext(prisma as never, istek);
    expect(blok).toBe("");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[studentContext]"), expect.anything());
    warn.mockRestore();
  });

  it("ikincil sorgu patlarsa yalnız o alan düşer: kimlik/not/diğer alanlar yazılır, console.warn çağrılır", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    prisma.card.findMany.mockRejectedValue(new Error("kart"));
    const blok = await loadStudentContext(prisma as never, istek);
    expect(blok).toContain("Öğrenci: Nisa, 6 yaş");
    expect(blok).toContain("Uzman notları: Nisa trenleri sever");
    expect(blok).toContain("Modüller: Pragmatik Dil");
    expect(blok).toContain("Tamamlanan hedefler: 2.1");
    expect(blok).not.toContain("Son çalışmalar");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[studentContext]"), expect.anything());

    warn.mockClear();
    prisma.card.findMany.mockResolvedValue([]);
    prisma.curriculum.findMany.mockRejectedValue(new Error("müfredat"));
    const blok2 = await loadStudentContext(prisma as never, istek);
    expect(blok2).toContain("Öğrenci: Nisa, 6 yaş");
    expect(blok2).not.toContain("Modüller:");
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("öğrenci bulunamazsa boş string", async () => {
    prisma.student.findFirst.mockResolvedValue(null);
    expect(await loadStudentContext(prisma as never, { ...istek, studentId: "yok" })).toBe("");
  });

  it("gözlemler uzmanla kapsamlı, son 5, yeni → eski çekilir ve bloğa rumuzlu girer", async () => {
    const blok = await loadStudentContext(prisma as never, istek);
    expect(prisma.studentObservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { studentId: "s1", therapistId: "t1" }, orderBy: { createdAt: "desc" }, take: 5 }),
    );
    expect(blok).toContain("Son gözlemler:\n- 11.10.2026: Nisa /r/ sesinde ilerledi");
  });

  it("gözlem sorgusu patlarsa yalnız o alan düşer", async () => {
    prisma.studentObservation.findMany.mockRejectedValue(new Error("db"));
    const blok = await loadStudentContext(prisma as never, istek);
    expect(blok).toContain("Öğrenci: Nisa");
    expect(blok).not.toContain("Son gözlemler");
  });
});
