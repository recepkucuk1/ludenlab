import { NextRequest, NextResponse } from "next/server";
import { auth } from "@studio/auth";
import { prisma } from "@studio/lib/db";
import { logError } from "@studio/lib/utils";
import { studentBodySchema, zodError } from "@studio/lib/validation";
import { rateLimit, rateLimitResponse } from "@studio/lib/rateLimit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = await params;

    const student = await prisma.student.findFirst({
      where: { id, therapistId: session.user.id },
      include: {
        cards: { orderBy: { createdAt: "desc" } },
        assignments: {
          orderBy: { assignedAt: "desc" },
          select: {
            id: true,
            status: true,
            assignedAt: true,
            card: { select: { id: true, title: true, category: true, difficulty: true, ageGroup: true, createdAt: true } },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ student });
  } catch (error) {
    logError("GET /studio/api/students/[id]", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
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

    const { id } = await params;

    const existing = await prisma.student.findFirst({
      where: { id, therapistId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 });
    }

    const parsed = studentBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: zodError(parsed.error) }, { status: 400 });
    }
    const { name, birthDate, workArea, diagnosis, notes, curriculumIds } = parsed.data;

    const student = await prisma.student.update({
      where: { id },
      data: {
        name,
        birthDate: birthDate ? new Date(birthDate) : null,
        workArea,
        diagnosis: diagnosis || null,
        notes: notes || null,
        curriculumIds: Array.isArray(curriculumIds) ? curriculumIds : undefined,
      },
    });

    return NextResponse.json({ student });
  } catch (error) {
    logError("PUT /studio/api/students/[id]", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = await params;

    const { allowed, retryAfter } = rateLimit(`students:delete:${session.user.id}`, 10);
    if (!allowed) return rateLimitResponse(retryAfter);

    const student = await prisma.student.findFirst({
      where: { id, therapistId: session.user.id },
    });

    if (!student) {
      return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 });
    }

    await prisma.student.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("DELETE /studio/api/students/[id]", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
