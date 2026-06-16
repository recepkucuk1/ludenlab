import { NextRequest, NextResponse } from "next/server";
import { auth } from "@studio/auth";
import { prisma } from "@studio/lib/db";
import { logError } from "@studio/lib/utils";
import { progressUpdatesSchema, zodError } from "@studio/lib/validation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id: studentId } = await params;

    const student = await prisma.student.findFirst({
      where: { id: studentId, therapistId: session.user.id },
    });
    if (!student) {
      return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 });
    }

    const progress = await prisma.studentProgress.findMany({
      where: { studentId, therapistId: session.user.id },
      select: { goalId: true, status: true, notes: true, updatedAt: true },
    });

    return NextResponse.json({ progress });
  } catch (error) {
    logError("GET /studio/api/students/[id]/progress", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
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

    const { id: studentId } = await params;

    const student = await prisma.student.findFirst({
      where: { id: studentId, therapistId: session.user.id },
    });
    if (!student) {
      return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 });
    }

    const body = await request.json();
    const parsedUpdates = progressUpdatesSchema.safeParse(body.updates);
    if (!parsedUpdates.success) {
      return NextResponse.json({ error: zodError(parsedUpdates.error) }, { status: 400 });
    }
    const updates = parsedUpdates.data;

    const therapistId = session.user.id;

    await prisma.$transaction(
      updates.map((u) =>
        prisma.studentProgress.upsert({
          where: { studentId_goalId: { studentId, goalId: u.goalId } },
          create: {
            studentId,
            goalId: u.goalId,
            status: u.status,
            notes: u.notes ?? null,
            therapistId,
          },
          update: {
            status: u.status,
            notes: u.notes ?? null,
          },
        })
      )
    );

    return NextResponse.json({ saved: updates.length });
  } catch (error) {
    logError("PUT /studio/api/students/[id]/progress", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
