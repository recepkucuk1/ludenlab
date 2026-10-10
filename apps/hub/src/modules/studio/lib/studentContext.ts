import type { NameMapping } from "@ludenlab/ai";
import { scrub } from "@studio/lib/pseudonym";
import { WORK_AREA_LABEL } from "@studio/lib/constants";
import { formatDate } from "@studio/lib/utils";

/**
 * Ortak öğrenci bağlam katmanı (spec A2). Tek kaynak: haftalık planın ve kart üreticisinin kendi
 * sorguları buraya taşınır. Blok RUMUZLUDUR; her serbest alan `scrub`'dan geçer (kart başlığı,
 * profil, not, tanı gerçek adla kaydedilmiş olabilir). Bağlam hiçbir zaman üretimi engellemez:
 * sorgu patlarsa boş blok + uyarı.
 *
 * Bütçe: toplam 2.400 karakter; alanlar A2 sırasıyla doldurulur, sığmayan alan atlanır ve
 * sıradakine bakılır. Kimlik satırları (öğrenci/alan/tanı/modüller) hiç kırpılmaz.
 */
export const BUTCE_TOPLAM = 2400;
const BUTCE = { not: 400, profil: 800, kartBaslik: 80, ozet: 400, hedefMadde: 10, kartSayisi: 5 } as const;

/** AI profilinden bloğa alınan İKİ bölüm — başlıklar `generateProfile.ts` şablonuyla SÖZLEŞMEDİR. */
export const PROFIL_BOLUMLERI = ["Öncelikli Çalışma Alanları", "Dikkat Edilmesi Gereken Noktalar"] as const;

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

/** `n` karakteri aşan metni `n-1` + "…" yapar (sonuç her zaman ≤ n). */
const kirp = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…");
const tekSatir = (s: string) => s.replace(/\s+/g, " ").trim();
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * `#…# Başlık` satırının altındaki gövdeyi (bir sonraki `#` başlığa ya da `---` ayracına kadar)
 * alır; madde işaretlerini/numaralarını söküp satırları "; " ile birleştirir.
 */
function bolum(profil: string, baslik: string): string {
  const re = new RegExp(`^#{1,6}[ \\t]*${escapeRe(baslik)}[ \\t]*:?[ \\t]*$`, "miu");
  const m = re.exec(profil);
  if (!m) return "";
  const kalan = profil.slice(m.index + m[0].length);
  const son = kalan.search(/^(?:#{1,6}\s|---[ \t]*$)/mu);
  const govde = (son < 0 ? kalan : kalan.slice(0, son)).trim();
  return govde
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/u, "").trim())
    .filter(Boolean)
    .join("; ");
}

export function profilBolumleriniAyikla(profil: string): { oncelik: string; dikkat: string } {
  return { oncelik: bolum(profil, PROFIL_BOLUMLERI[0]), dikkat: bolum(profil, PROFIL_BOLUMLERI[1]) };
}

/** Saf biçimlendirici: alanlar A2 sırasıyla, bütçe dolunca sonrakiler atlanır; kimlik satırı kesilmez. */
export function renderStudentBlock(ctx: StudentContextInput, map?: NameMapping | null): string {
  const s = (t: string | null | undefined) => (map ? scrub(t, map) : t) ?? "";
  const alan = WORK_AREA_LABEL[ctx.workArea] ?? ctx.workArea;
  const kimlik = [
    `Öğrenci: ${ctx.alias}${ctx.ageYears !== null ? `, ${ctx.ageYears} yaş` : ""}`,
    `Çalışma alanı: ${alan}`,
    ctx.diagnosis?.trim() ? `Tanı: ${tekSatir(s(ctx.diagnosis))}` : null,
    ctx.curriculumTitles.length ? `Modüller: ${ctx.curriculumTitles.slice(0, 3).map(tekSatir).join(", ")}` : null,
  ].filter((l): l is string => Boolean(l));

  // Her aday bir "alan"dır (bir ya da birkaç satır); bütçeye ya bütünüyle girer ya da atlanır.
  const adaylar: string[][] = [];

  if (ctx.notes?.trim()) adaylar.push([`Uzman notları: ${kirp(tekSatir(s(ctx.notes)), BUTCE.not)}`]);

  if (ctx.aiProfile?.trim()) {
    // Profil rumuzlanmış metin üzerinden ayrıştırılır (başlıklar ad içermez, gövde içerebilir).
    const { oncelik, dikkat } = profilBolumleriniAyikla(s(ctx.aiProfile));
    const satirlar: string[] = [];
    let kalan = BUTCE.profil;
    if (oncelik) {
      const t = kirp(`Öncelikli çalışma alanları: ${tekSatir(oncelik)}`, kalan);
      satirlar.push(t);
      kalan -= t.length;
    }
    if (dikkat && kalan > 40) satirlar.push(kirp(`Dikkat edilmesi gerekenler: ${tekSatir(dikkat)}`, kalan));
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

export interface LoadStudentContextArgs {
  studentId: string;
  therapistId: string;
  nameMap: NameMapping;
  /** Bloğa ALINMAYACAK alanlar (ör. AI profili üretilirken `aiProfile` döngüye girmesin). */
  exclude?: "aiProfile"[];
  /** Yaş hesabı için "şimdi" — testte sabitlenir. */
  now?: Date;
}

/** Yıl farkı — `toolHandler.ts`/kart rotasındaki `calcAgeYears` ile aynı yaklaşım. */
const yas = (birth: Date | null, now: Date) => (birth ? now.getFullYear() - new Date(birth).getFullYear() : null);

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

/** Yükleyici: sorgular uzmanla kapsamlı; her hata yutulur (boş blok + uyarı — üretim sürer). */
export async function loadStudentContext(prisma: StudentContextPrisma, args: LoadStudentContextArgs): Promise<string> {
  const now = args.now ?? new Date();
  try {
    const [student, recentCards, lastSummary, progress] = (await Promise.all([
      prisma.student.findFirst({
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
        where: { studentId: args.studentId, therapistId: args.therapistId, status: { in: ["completed", "in_progress"] } },
        select: { status: true, goal: { select: { code: true, title: true } } },
      }),
    ])) as [StudentRow | null, CardRow[], SummaryRow | null, ProgressRow[]];
    if (!student) return "";

    const curricula = student.curriculumIds.length
      ? ((await prisma.curriculum.findMany({ where: { id: { in: student.curriculumIds } }, select: { title: true } })) as { title: string }[])
      : [];

    // Oturum özeti kartının içeriği ÜRETİMDE kaydedilen anahtarlarla okunur (session-summary
    // şeması: overallAssessment/nextSessionPlan). Haftalık planın eski okuduğu
    // overallPerformance/sessionNotes/nextSessionGoals anahtarları yanlıştı — burada kapanır.
    const icerik = lastSummary && lastSummary.content && typeof lastSummary.content === "object"
      ? (lastSummary.content as Record<string, unknown>)
      : null;
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

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
        completedGoalCodes: progress.filter((p) => p.status === "completed").map((p) => p.goal.code),
        inProgressGoalTitles: progress.filter((p) => p.status === "in_progress").map((p) => p.goal.title),
      },
      args.nameMap,
    );
  } catch (err) {
    console.warn("[studentContext] bağlam yüklenemedi, blok atlandı", err);
    return "";
  }
}
