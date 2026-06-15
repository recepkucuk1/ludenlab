import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/utils";
import { cardStatusSchema } from "@/lib/validation";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { assignmentId } = await params;

    const body = await request.json();
    const parsed = cardStatusSchema.safeParse(body.status);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz durum değeri. Geçerli değerler: not_started, in_progress, completed" },
        { status: 400 }
      );
    }

    // Assignment'ın bu terapiste ait olduğunu kontrol et
    const assignment = await prisma.cardAssignment.findUnique({
      where: { id: assignmentId },
      include: { card: { select: { therapistId: true } } },
    });

    if (!assignment || assignment.card.therapistId !== session.user.id) {
      return NextResponse.json({ error: "Atama bulunamadı" }, { status: 404 });
    }

    const updated = await prisma.cardAssignment.update({
      where: { id: assignmentId },
      data: { status: parsed.data },
    });

    return NextResponse.json({ assignment: updated });
  } catch (error) {
    logError("PUT /api/cards/assignments/[assignmentId]/status", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
