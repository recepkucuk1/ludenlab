import { NextRequest, NextResponse } from "next/server";
import { auth } from "@studio/auth";
import { prisma } from "@studio/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { logError } from "@studio/lib/utils";
import { studentBodySchema, zodError } from "@studio/lib/validation";
import { isStudentLimitReached } from "@studio/lib/plans";

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
    logError("GET /studio/api/students", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Oluştur/sil döngüsünü frenle (silme ucunda da limit var — simetri).
    const { allowed, retryAfter } = rateLimit(`students-create:${session.user.id}`, 10);
    if (!allowed) return rateLimitResponse(retryAfter);

    const parsed = studentBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: zodError(parsed.error) }, { status: 400 });
    }
    const { name, birthDate, workArea, diagnosis, notes, curriculumIds } = parsed.data;

    // ── Plan limiti kontrolü + oluşturma TEK işlemde (2026-09 denetimi #21) ──
    // Say→oluştur arası açıktı: paralel POST'lar aynı sayımı görüp limiti aşabiliyordu.
    // Terapist satırı kilitlenir → aynı terapistin eşzamanlı istekleri sıraya girer.
    const therapistId = session.user.id;
    const outcome = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ studentLimit: number }>>`
        SELECT "studentLimit" FROM "Therapist" WHERE id = ${therapistId} FOR UPDATE`;
      const studentCount = await tx.student.count({ where: { therapistId } });
      const limit = locked[0]?.studentLimit ?? 2;
      // `-1` sınırsızdır — ham karşılaştırma ADVANCED/ENTERPRISE'i kilitliyordu.
      if (isStudentLimitReached(limit, studentCount)) return { limit } as const;

      const student = await tx.student.create({
        data: {
          name,
          birthDate: birthDate ? new Date(birthDate) : null,
          workArea,
          diagnosis: diagnosis || null,
          notes: notes || null,
          therapistId,
          curriculumIds: Array.isArray(curriculumIds) ? curriculumIds : [],
        },
      });
      return { student } as const;
    });
    if (!("student" in outcome)) {
      return NextResponse.json(
        { error: `Planınızda en fazla ${outcome.limit} öğrenci ekleyebilirsiniz.` },
        { status: 403 }
      );
    }
    const { student } = outcome;

    // NOT: Burada ESKİDEN `after(() => generateStudentProfile(...))` vardı — ÖLÇÜLMEYEN,
    // hız-limitsiz ve SONUCU KAYDEDİLMEYEN bir Claude çağrısı (2026-08 güvenlik denetimi #04).
    // Öğrenci oluştur/sil döngüsüyle kredi harcamadan sınırsız LLM maliyeti üretilebiliyordu.
    // Kaldırıldı: profil zaten kullanıcı istediğinde ÖLÇÜLEN uçtan üretiliyor
    // (POST /studio/api/students/[id]/ai-profile → ön-kredi + hız limiti + atomik düşüm +
    // `student.aiProfile`'a yazım). Kullanıcıya görünen davranış değişmez; buradaki çağrının
    // çıktısı hiçbir yere yazılmadığı için zaten kimseye fayda sağlamıyordu.

    return NextResponse.json({ student }, { status: 201 });
  } catch (error) {
    logError("POST /studio/api/students", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
