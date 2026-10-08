// apps/hub/evals/lib/mocks/studio.ts
import type { StudioFixture } from "../core";
import { als } from "../evalContext";

/* Studio tarafı taklitleri: Prisma (fikstürden), kredi, oturum. Gerçek DB'ye hiç dokunulmaz. */

function fx(): StudioFixture | null {
  const f = als.getStore()?.fixture;
  return f && "workArea" in f ? f : null;
}

function studentRow(f: StudioFixture) {
  return {
    id: f.id,
    name: f.name,
    birthDate: new Date(f.birthDate),
    workArea: f.workArea,
    diagnosis: f.diagnosis,
    notes: f.notes,
    aiProfile: f.aiProfile,
    curriculumIds: [],
    llmAlias: null,
  };
}

async function createCard({ data }: { data: unknown }) {
  const st = als.getStore();
  if (st) st.saved = data;
  return { id: "eval-card" };
}

export function studioPrismaMock() {
  const byId = async ({ where }: { where?: { id?: string } }) => {
    const f = fx();
    return f && where?.id === f.id ? studentRow(f) : null;
  };
  return {
    student: { findFirst: byId, findUnique: byId, findMany: async () => [], update: async () => ({}) },
    card: {
      findMany: async () =>
        (fx()?.recentCards ?? []).map((c) => ({ title: c.title, toolType: c.toolType, difficulty: c.difficulty, createdAt: new Date(c.createdAt) })),
      findFirst: async () => {
        const s = fx()?.lastSummary;
        return s ? { content: { overallAssessment: s.overallAssessment, nextSessionPlan: s.nextSessionPlan }, createdAt: new Date(s.createdAt) } : null;
      },
      create: createCard,
    },
    curriculum: { findMany: async () => (fx()?.curriculumTitles ?? []).map((title) => ({ title })) },
    curriculumGoal: { findMany: async () => [] },
    studentProgress: { findMany: async () => (fx()?.completedGoalCodes ?? []).map((code) => ({ goal: { code } })) },
    $transaction: async (cb: (tx: unknown) => unknown) => cb({ card: { create: createCard } }),
  };
}

export const studioCreditsMock = {
  reserveCredits: async () => true,
  refundCredits: async () => {
    const st = als.getStore();
    if (st) st.refunded = true;
  },
  reserveCreditsFor: async () => true,
  refundCreditsFor: async () => {
    const st = als.getStore();
    if (st) st.refunded = true;
  },
};

export const studioAuthMock = { auth: async () => ({ user: { id: "eval-uzman" } }) };
