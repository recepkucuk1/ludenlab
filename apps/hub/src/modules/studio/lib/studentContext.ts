import type { NameMapping } from "@ludenlab/ai";
import { scrub } from "@studio/lib/pseudonym";
import { WORK_AREA_LABEL } from "@studio/lib/constants";
import { formatDate } from "@studio/lib/utils";

/**
 * Ortak öğrenci bağlam katmanı (spec A2). Tek kaynak: haftalık planın ve kart üreticisinin kendi
 * sorguları buraya taşınır. Blok RUMUZLUDUR; her serbest alan `scrub`'dan geçer (kart başlığı,
 * profil, not, tanı gerçek adla kaydedilmiş olabilir). Bağlam hiçbir zaman üretimi engellemez:
 * öğrenci sorgusu patlarsa boş blok + uyarı; ikincil sorgulardan (kart/özet/ilerleme/müfredat)
 * biri patlarsa yalnız o alan atlanır, kimlik/not/profil yine yazılır.
 *
 * Bütçe: toplam 2.400 karakter; alanlar A2 sırasıyla doldurulur, sığmayan alan atlanır ve
 * sıradakine bakılır. Kimlik satırları (öğrenci/alan/tanı/modüller) hiç kırpılmaz. Alan
 * tavanlarının toplamı 2.400'ü aşar (profil 1.100): hepsi birden doluysa sondaki alanlar düşer.
 */
export const BUTCE_TOPLAM = 2400;
const BUTCE = { not: 400, profil: 1100, profilTeknik: 300, kartBaslik: 80, ozet: 400, hedefMadde: 10, kartSayisi: 5 } as const;

/**
 * AI profilinden bloğa alınan ÜÇ bölüm — başlıklar `generateProfile.ts` şablonuyla SÖZLEŞMEDİR.
 * İlk ikisi arayüz/şablon sözleşmesidir (sıra ve ad değişmez); üçüncüsü ("Etkili Yaklaşım ve
 * Teknikler") bloğa `Etkili yaklaşım:` satırı olarak, ≤300 karakterle ve profil bütçesinin
 * artanıyla girer.
 */
export const PROFIL_BOLUMLERI = ["Öncelikli Çalışma Alanları", "Dikkat Edilmesi Gereken Noktalar", "Etkili Yaklaşım ve Teknikler"] as const;

/**
 * Hedef takibi durumları: arayüz `not_started | in_progress | consolidating | mastered` yazar
 * (goal-tracker sayfası); `completed` eski kayıtların takma adıdır (rozet rotası da
 * `completed`+`mastered`i tamamlanmış sayar). Sorgu filtresi ve eşleme AYNI listeden gelir.
 */
const TAMAMLANAN_DURUMLAR = ["completed", "mastered"] as const;
const SUREN_DURUMLAR = ["in_progress", "consolidating"] as const;
const HEDEF_DURUMLARI = [...TAMAMLANAN_DURUMLAR, ...SUREN_DURUMLAR];

export interface StudentContextInput {
  /** Rumuz — gerçek ad DEĞİL (çocuk-PII kapısı, denetim #09). */
  alias: string;
  ageYears: number | null;
  workArea: string;
  diagnosis: string | null;
  notes: string | null;
  aiProfile: string | null;
  curriculumTitles: string[];
  recentCards: { title: string; toolType: string | null; createdAt: Date }[];
  lastSummary: { createdAt: Date; overallAssessment: string | null; nextSessionPlan: string | null } | null;
  completedGoalCodes: string[];
  inProgressGoalTitles: string[];
}

/**
 * `n` karakteri aşan metni `n-1` + "…" yapar (sonuç her zaman ≤ n). Kesim bir emoji'nin
 * ortasına denk gelirse yalnız kalan yüksek yedek (surrogate) atılır: yalnız yedek içeren
 * dize JSON/HTTP katmanında geçersiz UTF-8'e dönüp tüm API çağrısını düşürürdü.
 */
const kirp = (s: string, n: number) =>
  s.length <= n ? s : s.slice(0, n - 1).replace(/[\uD800-\uDBFF]$/u, "").trimEnd() + "…";
const tekSatir = (s: string) => s.replace(/\s+/g, " ").trim();
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Bölüm sonu: `#` ile başlayan satır (boşluksuz `###Başlık` dahil), `---`/`***` yatay çizgi ya
 * da tamamı kalın yazılmış satır (`**Başlık**` — kalın başlık biçimi, bkz. `bolum`).
 */
const BOLUM_SONU = /^(?:#{1,6}|---[ \t]*$|\*\*\*[ \t]*$|(?:\*\*|__)[^\n]+?(?:\*\*|__)[ \t]*:?[ \t]*$)/mu;

/**
 * Başlık satırının (`### Başlık`, `**Başlık**`, `**Başlık:**`, `1. Başlık`, sonda `:` olabilir)
 * altındaki gövdeyi bir sonraki bölüm sonuna kadar alır; madde işaretlerini/numaralarını söküp
 * satırları "; " ile birleştirir.
 */
function bolum(profil: string, baslik: string): string {
  const re = new RegExp(
    `^#{0,6}[ \\t]*(?:\\d+[.)][ \\t]*)?(?:\\*\\*|__)?${escapeRe(baslik)}[ \\t]*:?[ \\t]*(?:\\*\\*|__)?[ \\t]*:?[ \\t]*$`,
    "miu",
  );
  const m = re.exec(profil);
  if (!m) return "";
  const kalan = profil.slice(m.index + m[0].length);
  const son = kalan.search(BOLUM_SONU);
  const govde = (son < 0 ? kalan : kalan.slice(0, son)).trim();
  return govde
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/u, "").trim())
    .filter(Boolean)
    .join("; ");
}

export function profilBolumleriniAyikla(profil: string): { oncelik: string; dikkat: string; teknik: string } {
  return {
    oncelik: bolum(profil, PROFIL_BOLUMLERI[0]),
    dikkat: bolum(profil, PROFIL_BOLUMLERI[1]),
    teknik: bolum(profil, PROFIL_BOLUMLERI[2]),
  };
}

/** Saf biçimlendirici: alanlar A2 sırasıyla, bütçe dolunca sonrakiler atlanır; kimlik satırı kesilmez. */
export function renderStudentBlock(ctx: StudentContextInput, map?: NameMapping | null): string {
  const s = (t: string | null | undefined) => (map ? scrub(t, map) : t) ?? "";
  const alan = WORK_AREA_LABEL[ctx.workArea] ?? ctx.workArea;
  const kimlik = [
    `Öğrenci: ${ctx.alias}${ctx.ageYears !== null ? `, ${ctx.ageYears} yaş` : ""}`,
    `Çalışma alanı: ${alan}`,
    ctx.diagnosis?.trim() ? `Tanı: ${tekSatir(s(ctx.diagnosis))}` : null,
    // Modül kataloğu sınırlı ve başlıklar kısa: hepsi yazılır (haftalık plan da hepsini veriyordu).
    ctx.curriculumTitles.length ? `Modüller: ${ctx.curriculumTitles.map(tekSatir).join(", ")}` : null,
  ].filter((l): l is string => Boolean(l));

  // Her aday bir "alan"dır (bir ya da birkaç satır); bütçeye ya bütünüyle girer ya da atlanır.
  const adaylar: string[][] = [];

  if (ctx.notes?.trim()) adaylar.push([`Uzman notları: ${kirp(tekSatir(s(ctx.notes)), BUTCE.not)}`]);

  if (ctx.aiProfile?.trim()) {
    // Profil rumuzlanmış metin üzerinden ayrıştırılır (başlıklar ad içermez, gövde içerebilir).
    const { oncelik, dikkat, teknik } = profilBolumleriniAyikla(s(ctx.aiProfile));
    const satirlar: string[] = [];
    let kalan = BUTCE.profil;
    const ekle = (satir: string, tavan: number) => {
      const t = kirp(satir, tavan);
      satirlar.push(t);
      kalan -= t.length;
    };
    if (oncelik) ekle(`Öncelikli çalışma alanları: ${tekSatir(oncelik)}`, kalan);
    if (dikkat && kalan > 40) ekle(`Dikkat edilmesi gerekenler: ${tekSatir(dikkat)}`, kalan);
    // Yaklaşım satırı: ilk iki bölümden artan bütçeyle, ama en çok 300 karakter.
    if (teknik && kalan > 40) ekle(`Etkili yaklaşım: ${tekSatir(teknik)}`, Math.min(BUTCE.profilTeknik, kalan));
    if (satirlar.length) adaylar.push(satirlar);
  }

  if (ctx.recentCards.length) {
    const kartlar = [...ctx.recentCards]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, BUTCE.kartSayisi)
      .map((c) => `- ${kirp(tekSatir(s(c.title)), BUTCE.kartBaslik)} (${c.toolType ?? "kart"}, ${formatDate(c.createdAt, "short")})`);
    adaylar.push(["Son çalışmalar:", ...kartlar]);
  }

  if (ctx.lastSummary) {
    // Sonraki plan bir sonraki üretim için en eyleme dönük parça: bütçenin yarısına kadar
    // yer ayrılır ki uzun bir değerlendirme onu dışarı itmesin; artan değerlendirmeye kalır.
    const planHam = ctx.lastSummary.nextSessionPlan?.trim() ? `Sonraki plan: ${tekSatir(s(ctx.lastSummary.nextSessionPlan))}` : "";
    const plan = planHam ? kirp(planHam, Math.floor(BUTCE.ozet / 2)) : "";
    const degerHam = ctx.lastSummary.overallAssessment?.trim() ? tekSatir(s(ctx.lastSummary.overallAssessment)) : "";
    const deger = degerHam ? kirp(degerHam, BUTCE.ozet - (plan ? plan.length + 1 : 0)) : "";
    const parca = [deger, plan].filter(Boolean).join(" ");
    if (parca) adaylar.push([`Son oturum (${formatDate(ctx.lastSummary.createdAt, "short")}): ${parca}`]);
  }

  if (ctx.completedGoalCodes.length || ctx.inProgressGoalTitles.length) {
    const tamam = ctx.completedGoalCodes.slice(0, BUTCE.hedefMadde).map(tekSatir);
    const suren = ctx.inProgressGoalTitles
      .slice(0, Math.max(0, BUTCE.hedefMadde - tamam.length))
      .map((t) => tekSatir(s(t)));
    const satirlar: string[] = [];
    if (tamam.length) satirlar.push(`Tamamlanan hedefler: ${tamam.join(", ")}`);
    if (suren.length) satirlar.push(`Sürmekte olan hedefler: ${suren.join(", ")}`);
    if (satirlar.length) adaylar.push(satirlar);
  }

  let metin = kimlik.join("\n");
  for (const grup of adaylar) {
    const ek = "\n" + grup.join("\n");
    if (metin.length + ek.length > BUTCE_TOPLAM) continue; // bütçe dolu: bu alan atlanır, sıradakine bakılır
    metin += ek;
  }
  return metin;
}

/**
 * Yükleyicinin ihtiyaç duyduğu yapısal istemci tipi. Metot sözdizimi BİLEREK: Prisma'nın
 * üretilmiş jenerik imzaları bu gevşek imzaya ancak metot (çift yönlü) denetimiyle uyar;
 * gerçek `PrismaClient` böylece doğrudan geçirilebilir (testte tip düzeyinde doğrulanır).
 */
type StudentContextPrisma = {
  student: { findFirst(args: unknown): Promise<unknown> };
  card: { findMany(args: unknown): Promise<unknown>; findFirst(args: unknown): Promise<unknown> };
  curriculum: { findMany(args: unknown): Promise<unknown> };
  studentProgress: { findMany(args: unknown): Promise<unknown> };
};

type StudentRow = {
  birthDate: Date | null;
  workArea: string;
  diagnosis: string | null;
  notes: string | null;
  aiProfile: string | null;
  curriculumIds: string[];
};
type CardRow = { title: string; toolType: string | null; createdAt: Date };
type SummaryRow = { content: unknown; createdAt: Date };
type ProgressRow = { status: string; goal: { code: string; title: string } };

export interface LoadStudentContextArgs {
  studentId: string;
  therapistId: string;
  nameMap: NameMapping;
  /** Bloğa ALINMAYACAK alanlar (ör. AI profili üretilirken `aiProfile` döngüye girmesin). */
  exclude?: "aiProfile"[];
  /** Yaş hesabı için "şimdi" — testte sabitlenir. */
  now?: Date;
  /**
   * Çağıran öğrenci satırını ZATEN çekmişse (araç kapısı öğrenciyi doğrularken çeker) buraya
   * verir; öğrenci sorgusu atlanır. Satırın uzmanla kapsamlı çekildiği çağıranın sorumluluğudur.
   */
  student?: StudentRow;
}

/** Yıl farkı — `toolHandler.ts`/kart rotasındaki `calcAgeYears` ile aynı yaklaşım. */
const yas = (birth: Date | null, now: Date) => (birth ? now.getFullYear() - new Date(birth).getFullYear() : null);

/** İkincil sorgu sonucu: reddedilmişse uyarı + varsayılan (alan atlanır, blok sürer). */
function yedek<T>(sonuc: PromiseSettledResult<unknown>, ad: string, varsayilan: T): T {
  if (sonuc.status === "fulfilled") return (sonuc.value ?? varsayilan) as T;
  console.warn(`[studentContext] ${ad} yüklenemedi, alan atlandı`, sonuc.reason);
  return varsayilan;
}

/**
 * Yükleyici: sorgular uzmanla kapsamlı. Öğrenci sorgusu patlarsa boş blok + uyarı; ikincil
 * sorgulardan biri patlarsa yalnız o alan düşer (üretim her durumda sürer).
 */
export async function loadStudentContext(prisma: StudentContextPrisma, args: LoadStudentContextArgs): Promise<string> {
  const now = args.now ?? new Date();
  try {
    const [ogrenciS, kartS, ozetS, ilerlemeS] = await Promise.allSettled([
      args.student
        ? Promise.resolve(args.student)
        : prisma.student.findFirst({
            where: { id: args.studentId, therapistId: args.therapistId },
            // Gerçek ad (name) BİLEREK seçilmez: bloğa rumuz girer, ada gerek yok.
            select: { birthDate: true, workArea: true, diagnosis: true, notes: true, aiProfile: true, curriculumIds: true },
          }),
      prisma.card.findMany({
        where: { studentId: args.studentId, therapistId: args.therapistId },
        orderBy: { createdAt: "desc" },
        take: BUTCE.kartSayisi,
        select: { title: true, toolType: true, createdAt: true },
      }),
      prisma.card.findFirst({
        where: { studentId: args.studentId, therapistId: args.therapistId, toolType: "SESSION_SUMMARY" },
        orderBy: { createdAt: "desc" },
        select: { content: true, createdAt: true },
      }),
      prisma.studentProgress.findMany({
        where: { studentId: args.studentId, therapistId: args.therapistId, status: { in: HEDEF_DURUMLARI } },
        select: { status: true, goal: { select: { code: true, title: true } } },
      }),
    ]);
    if (ogrenciS.status === "rejected") {
      console.warn("[studentContext] öğrenci yüklenemedi, blok atlandı", ogrenciS.reason);
      return "";
    }
    const student = (ogrenciS.value ?? null) as StudentRow | null;
    if (!student) return "";

    const recentCards = yedek<CardRow[]>(kartS, "son çalışmalar", []);
    const lastSummary = yedek<SummaryRow | null>(ozetS, "oturum özeti", null);
    const progress = yedek<ProgressRow[]>(ilerlemeS, "hedef ilerlemesi", []);

    let curricula: { title: string }[] = [];
    if (student.curriculumIds.length) {
      try {
        curricula = (await prisma.curriculum.findMany({
          where: { id: { in: student.curriculumIds } },
          select: { title: true },
        })) as { title: string }[];
      } catch (err) {
        console.warn("[studentContext] müfredat yüklenemedi, alan atlandı", err);
      }
    }

    // Oturum özeti kartının içeriği ÜRETİMDE kaydedilen anahtarlarla okunur (session-summary
    // şeması: overallAssessment/nextSessionPlan). Haftalık planın eski okuduğu
    // overallPerformance/sessionNotes/nextSessionGoals anahtarları yanlıştı — burada kapanır.
    const icerik = lastSummary && lastSummary.content && typeof lastSummary.content === "object"
      ? (lastSummary.content as Record<string, unknown>)
      : null;
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
    const tamamlanan = new Set<string>(TAMAMLANAN_DURUMLAR);
    const suren = new Set<string>(SUREN_DURUMLAR);

    return renderStudentBlock(
      {
        alias: args.nameMap.alias,
        ageYears: yas(student.birthDate, now),
        workArea: student.workArea,
        diagnosis: student.diagnosis,
        notes: student.notes,
        aiProfile: args.exclude?.includes("aiProfile") ? null : student.aiProfile,
        curriculumTitles: curricula.map((x) => x.title),
        recentCards,
        lastSummary: lastSummary && icerik
          ? { createdAt: lastSummary.createdAt, overallAssessment: str(icerik.overallAssessment), nextSessionPlan: str(icerik.nextSessionPlan) }
          : null,
        completedGoalCodes: progress.filter((p) => tamamlanan.has(p.status)).map((p) => p.goal.code),
        inProgressGoalTitles: progress.filter((p) => suren.has(p.status)).map((p) => p.goal.title),
      },
      args.nameMap,
    );
  } catch (err) {
    console.warn("[studentContext] bağlam yüklenemedi, blok atlandı", err);
    return "";
  }
}
