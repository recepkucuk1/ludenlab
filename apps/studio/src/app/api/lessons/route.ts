import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/utils";
import { z } from "zod";

const createSchema = z.object({
  studentId:    z.string().min(1),
  title:        z.string().min(1).max(200),
  date:         z.string().min(1),
  startTime:    z.string().regex(/^\d{2}:\d{2}$/),
  endTime:      z.string().regex(/^\d{2}:\d{2}$/),
  note:         z.string().nullish(),
  isRecurring:  z.boolean().default(false),
  recurringDay: z.number().int().min(0).max(6).nullish(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month      = searchParams.get("month");      // "2026-03"
    const week       = searchParams.get("week");       // "2026-03-24" (any day in week)
    const studentId  = searchParams.get("studentId");
    const upcoming   = searchParams.get("upcoming") === "true";
    const therapistId = session.user.id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      therapistId,
      ...(studentId ? { studentId } : {}),
    };

    // Date range filter — recurring lessons are always included (no date filter)
    if (upcoming) {
      where.date = { gte: new Date() };
    } else if (month) {
      const [y, m] = month.split("-").map(Number);
      const start = new Date(y, m - 1, 1);
      const end   = new Date(y, m, 1);
      where.OR = [
        { date: { gte: start, lt: end } },
        { isRecurring: true },
      ];
    } else if (week) {
      const d = new Date(week);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() + diff);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      where.OR = [
        { date: { gte: weekStart, lt: weekEnd } },
        { isRecurring: true },
      ];
    }

    const lessons = await prisma.lesson.findMany({
      where,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      include: {
        student: { select: { id: true, name: true, workArea: true } },
        exceptions: true,
      },
      ...(upcoming ? { take: 5 } : {}),
    });

    return NextResponse.json({ lessons });
  } catch (error) {
    logError("GET /api/lessons", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Geçersiz istek" },
        { status: 400 }
      );
    }
    const { studentId, title, date, startTime, endTime, note, isRecurring, recurringDay } = parsed.data;

    // Verify student belongs to therapist
    const student = await prisma.student.findFirst({
      where: { id: studentId, therapistId: session.user.id },
    });
    if (!student) {
      return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 });
    }

    // Check for overlapping lessons on the same day
    const overlappingLesson = await prisma.lesson.findFirst({
      where: {
        therapistId: session.user.id,
        date: new Date(date),
        status: { not: "CANCELLED" },
        startTime: { lt: endTime },
        endTime: { gt: startTime }
      }
    });

    if (overlappingLesson) {
      return NextResponse.json({ error: "Bu saat aralığında başka bir dersiniz bulunuyor." }, { status: 409 });
    }

    const lesson = await prisma.lesson.create({
      data: {
        therapistId: session.user.id,
        studentId,
        title,
        date: new Date(date),
        startTime,
        endTime,
        note: note ?? null,
        isRecurring,
        recurringDay: isRecurring ? (recurringDay ?? null) : null,
      },
      include: {
        student: { select: { id: true, name: true, workArea: true } },
      },
    });

    return NextResponse.json({ lesson }, { status: 201 });
  } catch (error) {
    logError("POST /api/lessons", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
