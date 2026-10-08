// apps/hub/evals/lib/mocks/studio.ts
import type { StudioFixture } from "../core";
import { als } from "../evalContext";

/* Studio tarafı taklitleri: Prisma (fikstürden), kredi, oturum. Gerçek DB'ye hiç dokunulmaz. */

function fx(): StudioFixture | null {
  const f = als.getStore()?.fixture;
  return f && "workArea" in f ? f : null;
}

type Select = Record<string, unknown> | undefined;

/** Prisma `select` taklidi: verilmişse yalnız seçilen anahtarlar döner, verilmemişse satırın tamamı. */
function pick<T extends Record<string, unknown>>(row: T, select: Select): Partial<T> {
  if (!select) return row;
  return Object.fromEntries(Object.entries(row).filter(([k]) => select[k])) as Partial<T>;
}

/** Müfredat kimlikleri fikstürde yok; başlık sırasıyla sabit kimlik uydurulur (`curriculum.findMany` geri çözer). */
const curriculumId = (i: number) => `eval-cur-${i}`;

function studentRow(f: StudioFixture) {
  return {
    id: f.id,
    name: f.name,
    birthDate: new Date(f.birthDate),
    workArea: f.workArea,
    diagnosis: f.diagnosis,
    notes: f.notes,
    aiProfile: f.aiProfile,
    curriculumIds: f.curriculumTitles.map((_, i) => curriculumId(i)),
    llmAlias: null,
  };
}

async function createCard({ data }: { data: unknown }) {
  const st = als.getStore();
  if (st) st.saved = data;
  return { id: "eval-card" };
}

export function studioPrismaMock() {
  const byId = async ({ where, select }: { where?: { id?: string }; select?: Select }) => {
    const f = fx();
    return f && where?.id === f.id ? pick(studentRow(f), select) : null;
  };
  return {
    student: { findFirst: byId, findUnique: byId, findMany: async () => [], update: async () => ({}) },
    card: {
      // Üretim sorgusu `orderBy: { createdAt: "desc" }, take: N` — sıralama ve kesim burada da uygulanır.
      findMany: async ({ take, select }: { take?: number; select?: Select } = {}) =>
        (fx()?.recentCards ?? [])
          .map((c) => ({ title: c.title, toolType: c.toolType, difficulty: c.difficulty, createdAt: new Date(c.createdAt) }))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, take ?? undefined)
          .map((row) => pick(row, select)),
      // Son SESSION_SUMMARY kartı: içerik anahtarları üretimde kaydedilenlerle AYNI. weekly-plan başka
      // anahtarlar okuyor (overallPerformance dışında hiçbiri eşleşmiyor) — bilinen üretim hatası; taklit onu
      // gizlemesin diye anahtarlar burada yeniden adlandırılmaz.
      findFirst: async () => {
        const s = fx()?.lastSummary;
        if (!s) return null;
        const { overallAssessment, nextSessionPlan, overallPerformance, behaviorNotes } = s;
        return { content: { overallAssessment, nextSessionPlan, overallPerformance, behaviorNotes }, createdAt: new Date(s.createdAt) };
      },
      create: createCard,
    },
    curriculum: {
      findMany: async ({ where }: { where?: { id?: { in?: string[] } } } = {}) => {
        const titles = fx()?.curriculumTitles ?? [];
        const ids = where?.id?.in;
        const picked = ids ? titles.filter((_, i) => ids.includes(curriculumId(i))) : titles;
        return picked.map((title) => ({ title }));
      },
    },
    curriculumGoal: { findMany: async () => [] },
    studentProgress: { findMany: async () => (fx()?.completedGoalCodes ?? []).map((code) => ({ goal: { code } })) },
    $transaction: async (cb: (tx: unknown) => unknown) => cb({ card: { create: createCard } }),
  };
}

/** Üretim patladığında gerçek kod krediyi iade eder; taklit bunu bayrakla kaydeder. */
async function markRefunded() {
  const st = als.getStore();
  if (st) st.refunded = true;
}

export const studioCreditsMock = {
  reserveCredits: async () => true,
  refundCredits: markRefunded,
  reserveCreditsFor: async () => true,
  refundCreditsFor: markRefunded,
};

export const studioAuthMock = { auth: async () => ({ user: { id: "eval-uzman" } }) };
