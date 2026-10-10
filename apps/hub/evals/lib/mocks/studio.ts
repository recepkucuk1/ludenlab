// apps/hub/evals/lib/mocks/studio.ts
import type { StudioFixture } from "../core";
import { als } from "../evalContext";

/* Studio tarafı taklitleri: Prisma (fikstürden), kredi, oturum. Gerçek DB'ye hiç dokunulmaz. */

function fx(): StudioFixture | null {
  const f = als.getStore()?.fixture;
  return f && "workArea" in f ? f : null;
}

type Select = Record<string, unknown> | undefined;
type StatusWhere = string | { in?: string[] } | undefined;

/** Prisma `where.status` taklidi: düz dize ya da `{ in: [...] }`; verilmemişse süzme yok (hepsi istenmiş sayılır). */
const statusIstendi = (w: StatusWhere, s: string): boolean =>
  w === undefined ? true : typeof w === "string" ? w === s : (w.in ?? []).includes(s);

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
      // Son SESSION_SUMMARY kartı: içerik anahtarları üretimde kaydedilenlerle AYNI (overallAssessment /
      // nextSessionPlan). Ortak bağlam katmanı (studentContext.ts) bu anahtarları okur; haftalık planın eski
      // yanlış anahtarları (overallPerformance/sessionNotes/nextSessionGoals) o katmanla kapandı. Anahtarlar
      // burada yeniden adlandırılmaz. `where.toolType` başka bir tür istiyorsa null: fikstürde yalnız özet
      // kartı "son kart" olarak tutulur; toolType verilmezse eski davranış (özet döner).
      findFirst: async ({ where }: { where?: { studentId?: string; therapistId?: string; toolType?: string }; orderBy?: unknown; select?: Select } = {}) => {
        if (where?.toolType !== undefined && where.toolType !== "SESSION_SUMMARY") return null;
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
    studentProgress: {
      // Bağlam katmanı `status: { in: [...] }` + `select: { status, goal: { code, title } }` ister; eski kart rotası
      // `status: "completed"` + `goal: { code }` istiyordu — ikisi de aynı satırlardan beslenir ve `where.status`
      // listesine göre süzülür (sabit liste yok). Tamamlanan hedefin başlığı fikstürde yok: başlık = kod.
      findMany: async ({ where, select }: { where?: { studentId?: string; therapistId?: string; status?: StatusWhere }; select?: Select } = {}) => {
        const f = fx();
        const rows = [
          ...(statusIstendi(where?.status, "completed")
            ? (f?.completedGoalCodes ?? []).map((code) => ({ status: "completed", goal: { code, title: code } }))
            : []),
          ...(statusIstendi(where?.status, "in_progress")
            ? (f?.inProgressGoals ?? []).map((g) => ({ status: "in_progress", goal: { code: g.code, title: g.title } }))
            : []),
        ];
        return rows.map((row) => pick(row, select));
      },
    },
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
