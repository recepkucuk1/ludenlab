import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

    const { studentId } = await params;
    const body = await request.json();
    const { goalId, status, notes } = body as { goalId: string; status: string; notes?: string };

    if (!goalId || !status) return NextResponse.json({ error: "goalId ve status zorunlu" }, { status: 400 });

    const validStatuses = ["not_started", "in_progress", "consolidating", "mastered", "completed"];
    if (!validStatuses.includes(status)) return NextResponse.json({ error: "Geçersiz status" }, { status: 400 });

    const student = await prisma.student.findFirst({
      where: { id: studentId, therapistId: session.user.id },
    });
    if (!student) return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 });

    const updateData: Record<string, unknown> = { status };
    if (notes !== undefined) updateData.notes = notes;

    const progress = await prisma.studentProgress.upsert({
      where: { studentId_goalId: { studentId, goalId } },
      update: updateData,
      create: {
        studentId,
        goalId,
        status,
        notes: notes ?? null,
        therapistId: session.user.id,
      },
    });

    return NextResponse.json({ progress });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
