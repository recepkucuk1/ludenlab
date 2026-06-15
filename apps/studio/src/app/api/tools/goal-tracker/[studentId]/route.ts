import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

    const { studentId } = await params;

    const student = await prisma.student.findFirst({
      where: { id: studentId, therapistId: session.user.id },
    });
    if (!student) return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 });

    if (student.curriculumIds.length === 0) {
      const recentCards = await prisma.card.findMany({
        where: { studentId, therapistId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, title: true, toolType: true, createdAt: true },
      });
      return NextResponse.json({ student, modules: [], recentCards, recentProgress: [] });
    }

    const curricula = await prisma.curriculum.findMany({
      where: { id: { in: student.curriculumIds } },
      include: { goals: true },
    });

    const parseCode = (code: string): [number, number] => {
      const parts = code.split(".");
      const a = Number.parseInt(parts[0] ?? "", 10);
      const b = Number.parseInt(parts[1] ?? "", 10);
      return [Number.isFinite(a) ? a : 0, Number.isFinite(b) ? b : 0];
    };
    for (const c of curricula) {
      c.goals.sort((x, y) => {
        const [xa, xb] = parseCode(x.code);
        const [ya, yb] = parseCode(y.code);
        if (xa !== ya) return xa - ya;
        return xb - yb;
      });
    }

    const allGoalIds = curricula.flatMap(c => c.goals.map(g => g.id));

    const progressList = await prisma.studentProgress.findMany({
      where: { studentId, goalId: { in: allGoalIds }, therapistId: session.user.id },
    });
    const progressMap = Object.fromEntries(progressList.map(p => [p.goalId, p]));

    // Build a goal title lookup for recentProgress
    const goalTitleMap: Record<string, string> = {};
    curricula.forEach(c => c.goals.forEach(g => { goalTitleMap[g.id] = g.title; }));

    const recentCards = await prisma.card.findMany({
      where: { studentId, therapistId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, title: true, toolType: true, createdAt: true },
    });

    const recentProgress = progressList
      .filter(p => p.status !== "not_started")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map(p => ({
        goalId: p.goalId,
        goalTitle: goalTitleMap[p.goalId] ?? "",
        status: p.status,
        updatedAt: p.updatedAt,
      }));

    const modules = curricula.map(c => ({
      curriculum: { id: c.id, code: c.code, area: c.area, title: c.title },
      goals: c.goals.map(g => ({
        goal: { id: g.id, code: g.code, title: g.title, isMainGoal: g.isMainGoal },
        progress: progressMap[g.id] ?? null,
      })),
    }));

    return NextResponse.json({ student, modules, recentCards, recentProgress });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

    const { studentId } = await params;
    const body = await request.json();
    const { goalId, note } = body as { goalId: string; note: string };

    if (!goalId) return NextResponse.json({ error: "goalId zorunlu" }, { status: 400 });

    const student = await prisma.student.findFirst({
      where: { id: studentId, therapistId: session.user.id },
    });
    if (!student) return NextResponse.json({ error: "Öğrenci bulunamadı" }, { status: 404 });

    const progress = await prisma.studentProgress.upsert({
      where: { studentId_goalId: { studentId, goalId } },
      update: { notes: note || null },
      create: {
        studentId,
        goalId,
        status: "not_started",
        notes: note || null,
        therapistId: session.user.id,
      },
    });

    return NextResponse.json({ progress });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
