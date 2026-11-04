// apps/hub/src/app/studio/api/students/[id]/probes/runs/[runId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@studio/lib/db";
import { requireAuth, requireStudentOwnership } from "@studio/lib/auth-helpers";
import { logError } from "@studio/lib/utils";

/* Tek koşuyu sil — sahiplik therapistId + öğrenci üzerinden (spec §6). */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; runId: string }> }) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;
  try {
    const { id, runId } = await params;
    const ownership = await requireStudentOwnership(id, session.user.id);
    if (ownership instanceof NextResponse) return ownership;
    const { count } = await prisma.probeRun.deleteMany({ where: { id: runId, therapistId: session.user.id, series: { studentId: id } } });
    if (count === 0) return NextResponse.json({ error: "Ölçüm bulunamadı" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("DELETE /studio/api/students/[id]/probes/runs/[runId]", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
