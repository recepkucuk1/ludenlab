import { NextRequest, NextResponse } from "next/server";
import { auth } from "@studio/auth";
import { prisma } from "@studio/lib/db";
import { denetimSonucuSchema, temizle } from "@/lib/hedefDenetimi";
import { Prisma } from "@/generated/studio/client";
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
      select: { goalId: true, status: true, notes: true, updatedAt: true, objective: true, objectiveAudit: true, objectiveAuditedAt: true },
    });

    // Bozuk/eski biçimli denetim JSON'u istemciyi çökertmesin: şemaya uymayan → null.
    const guvenli = progress.map((p) => {
      const a = denetimSonucuSchema.safeParse(p.objectiveAudit);
      return { ...p, objectiveAudit: a.success ? a.data : null };
    });
    return NextResponse.json({ progress: guvenli });
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

    // Kısa dönem hedef: metin değişirse eski denetim BAYAT → aynı transaction'da sıfırlanır (bayat denetim gösterilmez).
    // `objective` undefined gelirse (eski istemci, asistan goal_status) sütunlara dokunulmaz.
    await prisma.$transaction(async (tx) => {
      for (const u of updates) {
        const where = { studentId_goalId: { studentId, goalId: u.goalId } };
        // Kanonik metin: denetim rotası temizle(objective) saklar; aynı biçimle karşılaştır.
        const objective = u.objective === undefined ? undefined : u.objective === null ? null : temizle(u.objective) || null;
        let denetimSifirla = false;
        if (objective !== undefined) {
          const mevcut = await tx.studentProgress.findUnique({ where, select: { objective: true } });
          denetimSifirla = (mevcut?.objective ?? null) !== objective;
        }
        const createHedef = objective === undefined ? {} : { objective };
        // Değişmeyen metin update'e yazılmaz (eşzamanlı denetimle yarış olmasın).
        const updateHedef = denetimSifirla ? { objective, objectiveAudit: Prisma.DbNull, objectiveAuditedAt: null } : {};
        const updateNotes = u.notes === undefined ? {} : { notes: u.notes ?? null };
        await tx.studentProgress.upsert({
          where,
          create: { studentId, goalId: u.goalId, status: u.status, notes: u.notes ?? null, therapistId, ...createHedef },
          update: { status: u.status, ...updateNotes, ...updateHedef },
        });
      }
    }, { timeout: 15_000 });

    return NextResponse.json({ saved: updates.length });
  } catch (error) {
    logError("PUT /studio/api/students/[id]/progress", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
