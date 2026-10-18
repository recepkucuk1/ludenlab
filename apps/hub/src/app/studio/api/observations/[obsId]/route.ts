import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@studio/lib/db";
import { requireAuth } from "@studio/lib/auth-helpers";
import { readJsonBody } from "@/lib/bodyLimit";
import { observationBodySchema, stripHtmlTags, zodError } from "@studio/lib/validation";
import { logError } from "@studio/lib/utils";

/** Tek gözlemi düzenle/sil — sahiplik therapistId ile; plan kapısı YOK (KVKK: uzman kendi verisine her zaman erişir). */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ obsId: string }> }) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;
  try {
    const { obsId } = await params;

    const body = await readJsonBody(request);
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
    const parsed = observationBodySchema.safeParse(body.data);
    if (!parsed.success) return NextResponse.json({ error: zodError(parsed.error) }, { status: 400 });

    // Etiket ayıklandıktan sonra boş kalan metin (örn. "<b></b>") kaydedilmez.
    const text = stripHtmlTags(parsed.data.text);
    if (!text) return NextResponse.json({ error: "Gözlem boş olamaz" }, { status: 400 });

    const { count } = await prisma.studentObservation.updateMany({
      where: { id: obsId, therapistId: session.user.id },
      data: { text },
    });
    if (count === 0) return NextResponse.json({ error: "Gözlem bulunamadı" }, { status: 404 });

    const observation = await prisma.studentObservation.findUnique({
      where: { id: obsId },
      select: { id: true, text: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ observation });
  } catch (error) {
    logError("PATCH /studio/api/observations/[obsId]", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ obsId: string }> }) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;
  try {
    const { obsId } = await params;
    const { count } = await prisma.studentObservation.deleteMany({
      where: { id: obsId, therapistId: session.user.id },
    });
    if (count === 0) return NextResponse.json({ error: "Gözlem bulunamadı" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("DELETE /studio/api/observations/[obsId]", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
