import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id: cardId } = await params;

    const card = await prisma.card.findFirst({
      where: { id: cardId, therapistId: session.user.id },
    });
    if (!card) {
      return NextResponse.json({ error: "Kart bulunamadı" }, { status: 404 });
    }

    const assignments = await prisma.cardAssignment.findMany({
      where: { cardId },
      select: { id: true, studentId: true, status: true },
    });

    return NextResponse.json({
      assignments: assignments.map((a: { id: string; studentId: string; status: string }) => ({
        id: a.id,
        studentId: a.studentId,
        status: a.status,
      })),
      assignedStudentIds: assignments.map((a: { studentId: string }) => a.studentId),
    });
  } catch (error) {
    logError("GET /api/cards/[id]/assignments", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id: cardId } = await params;

    const card = await prisma.card.findFirst({
      where: { id: cardId, therapistId: session.user.id },
    });
    if (!card) {
      return NextResponse.json({ error: "Kart bulunamadı" }, { status: 404 });
    }

    const body = await request.json();
    const { studentIds } = body as { studentIds: string[] };

    if (!Array.isArray(studentIds)) {
      return NextResponse.json({ error: "studentIds bir dizi olmalıdır" }, { status: 400 });
    }

    // Verify all students belong to this therapist
    if (studentIds.length > 0) {
      const students = await prisma.student.findMany({
        where: { id: { in: studentIds }, therapistId: session.user.id },
        select: { id: true },
      });
      if (students.length !== studentIds.length) {
        return NextResponse.json({ error: "Geçersiz öğrenci ID'si" }, { status: 400 });
      }
    }

    await prisma.$transaction([
      prisma.cardAssignment.deleteMany({ where: { cardId } }),
      prisma.cardAssignment.createMany({
        data: studentIds.map((studentId) => ({ cardId, studentId })),
      }),
    ]);

    return NextResponse.json({ assignedCount: studentIds.length });
  } catch (error) {
    logError("PUT /api/cards/[id]/assignments", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
