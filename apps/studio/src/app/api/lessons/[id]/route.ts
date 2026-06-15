import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/utils";
import { z } from "zod";

const updateSchema = z.object({
  title:        z.string().min(1).max(200).optional(),
  date:         z.string().optional(),
  startTime:    z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime:      z.string().regex(/^\d{2}:\d{2}$/).optional(),
  note:         z.string().nullable().optional(),
  isRecurring:  z.boolean().optional(),
  recurringDay: z.number().int().min(0).max(6).nullable().optional(),
  status:       z.enum(["PLANNED", "COMPLETED", "CANCELLED"]).optional(),
});

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

    const lesson = await prisma.lesson.findFirst({
      where: { id, therapistId: session.user.id },
    });
    if (!lesson) {
      return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 });
    }

    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Geçersiz istek" },
        { status: 400 }
      );
    }
    const { date, ...rest } = parsed.data;

    // We need to read scope from request.url or JSON body. Let's just read from searchParams since it's cleaner.
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope"); // "this" | "all"
    const originalDate = searchParams.get("date");

    const newDate = date ? new Date(date) : lesson.date;
    const newStartTime = rest.startTime ?? lesson.startTime;
    const newEndTime = rest.endTime ?? lesson.endTime;
    const newStatus = rest.status ?? lesson.status;

    if (newStatus !== "CANCELLED") {
      const overlappingLesson = await prisma.lesson.findFirst({
        where: {
          id: { not: id },
          therapistId: session.user.id,
          date: newDate,
          status: { not: "CANCELLED" },
          startTime: { lt: newEndTime },
          endTime: { gt: newStartTime }
        }
      });
  
      if (overlappingLesson) {
        return NextResponse.json({ error: "Bu saat aralığında başka bir dersiniz bulunuyor." }, { status: 409 });
      }
    }

    if (lesson.isRecurring && scope === "this" && originalDate) {
      // Create or update exception
      const origDateObj = new Date(originalDate);
      origDateObj.setHours(0, 0, 0, 0);

      const existingException = await prisma.lessonException.findFirst({
        where: { lessonId: id, originalDate: origDateObj }
      });

      if (existingException) {
        await prisma.lessonException.update({
          where: { id: existingException.id },
          data: { ...rest }
        });
      } else {
        await prisma.lessonException.create({
          data: {
            lessonId: id,
            originalDate: origDateObj,
            ...rest
          }
        });
      }

      const updated = await prisma.lesson.findUnique({
        where: { id },
        include: {
          student: { select: { id: true, name: true, workArea: true } },
          exceptions: true
        }
      });
      return NextResponse.json({ lesson: updated });
    }

    // Default flow (update all or non-recurring)
    const updated = await prisma.lesson.update({
      where: { id },
      data: {
        ...rest,
        ...(date ? { date: new Date(date) } : {}),
      },
      include: {
        student: { select: { id: true, name: true, workArea: true } },
        exceptions: true
      },
    });

    return NextResponse.json({ lesson: updated });
  } catch (error) {
    logError("PUT /api/lessons/[id]", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = await params;

    const lesson = await prisma.lesson.findFirst({
      where: { id, therapistId: session.user.id },
    });
    if (!lesson) {
      return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");
    const originalDate = searchParams.get("date");

    if (lesson.isRecurring && scope === "this" && originalDate) {
      const origDateObj = new Date(originalDate);
      origDateObj.setHours(0, 0, 0, 0);

      const existingException = await prisma.lessonException.findFirst({
        where: { lessonId: id, originalDate: origDateObj }
      });

      if (existingException) {
        await prisma.lessonException.update({
          where: { id: existingException.id },
          data: { status: "CANCELLED" }
        });
      } else {
        await prisma.lessonException.create({
          data: {
            lessonId: id,
            originalDate: origDateObj,
            status: "CANCELLED"
          }
        });
      }

      return NextResponse.json({ success: true, scope: "this" });
    }

    await prisma.lesson.delete({ where: { id } });

    return NextResponse.json({ success: true, scope: "all" });
  } catch (error) {
    logError("DELETE /api/lessons/[id]", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
