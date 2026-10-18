import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@studio/lib/db";
import { requireAuth, requireStudentOwnership } from "@studio/lib/auth-helpers";
import { isAssistantPlan } from "@studio/lib/plans";
import { assistantQuota } from "@studio/lib/assistant/quota";
import { logError } from "@studio/lib/utils";

/** Gözlem günlüğü (son 50, yeni → eski) + plan kilidi. Okuma plan kapısına TABİ DEĞİL (uzman verisi). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;
  try {
    const { id } = await params;
    const ownership = await requireStudentOwnership(id, session.user.id);
    if (ownership instanceof NextResponse) return ownership;

    const [observations, therapist] = await Promise.all([
      prisma.studentObservation.findMany({
        where: { studentId: id, therapistId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, text: true, createdAt: true, updatedAt: true },
      }),
      prisma.therapist.findUnique({ where: { id: session.user.id }, select: { planType: true } }),
    ]);
    const locked = !therapist || !isAssistantPlan(therapist.planType);
    const quota = therapist && !locked ? await assistantQuota(prisma, session.user.id, therapist.planType) : null;
    return NextResponse.json({ observations, locked, quota });
  } catch (error) {
    logError("GET /studio/api/students/[id]/observations", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
