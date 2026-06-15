import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateStudentProfile } from "@/lib/generateProfile";
import { logError } from "@/lib/utils";
import { studentBodySchema, zodError } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get("limit") ?? "1000", 10)));
    const skip  = (page - 1) * limit;

    const [total, students] = await Promise.all([
      prisma.student.count({ where: { therapistId: session.user.id } }),
      prisma.student.findMany({
        where: { therapistId: session.user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          _count: { select: { cards: true } },
          cards: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
          progress: { select: { status: true }, take: 200 },
        },
      }),
    ]);

    return NextResponse.json({
      students: students.map((s) => ({
        ...s,
        _count: { cards: s._count.cards },
        latestCardAt: s.cards[0]?.createdAt ?? null,
        progressSummary: {
          completed: s.progress.filter((p) => p.status === "completed").length,
          total: s.progress.length,
        },
        cards: undefined,
        progress: undefined,
      })),
      total,
      page,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    logError("GET /api/students", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const parsed = studentBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: zodError(parsed.error) }, { status: 400 });
    }
    const { name, birthDate, workArea, diagnosis, notes, curriculumIds } = parsed.data;

    // ── Plan limiti kontrolü ──
    const [therapist, studentCount] = await Promise.all([
      prisma.therapist.findUnique({ where: { id: session.user.id }, select: { studentLimit: true } }),
      prisma.student.count({ where: { therapistId: session.user.id } }),
    ]);
    const limit = therapist?.studentLimit ?? 2;
    if (studentCount >= limit) {
      return NextResponse.json(
        { error: `Planınızda en fazla ${limit} öğrenci ekleyebilirsiniz.` },
        { status: 403 }
      );
    }

    const student = await prisma.student.create({
      data: {
        name,
        birthDate: birthDate ? new Date(birthDate) : null,
        workArea,
        diagnosis: diagnosis || null,
        notes: notes || null,
        therapistId: session.user.id,
        curriculumIds: Array.isArray(curriculumIds) ? curriculumIds : [],
      },
    });

    // Response gönderildikten sonra profil üret (after = Next.js post-response hook)
    after(async () => {
      try {
        await generateStudentProfile(student.id, session.user.id);
      } catch (err) {
        console.error("[generateStudentProfile] after() hatası:", err);
      }
    });

    return NextResponse.json({ student }, { status: 201 });
  } catch (error) {
    logError("POST /api/students", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
