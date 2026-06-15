import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { logError } from "@/lib/utils";

/**
 * Per-user pdfEnabled override.
 *
 * pdfEnabled normalde plan'a bağlı (`PLAN_CONFIG[planType].pdfEnabled`); plan
 * değiştiğinde otomatik senkronize edilir. Bu endpoint admin'e plan'dan bağımsız
 * bir override imkanı verir — tipik kullanım: FREE plan'daki bir kullanıcıya
 * geçici olarak PDF açmak. Plan değişince override kaybolur (kasten — PLAN_CONFIG
 * değer otomatik gelir, admin gerekirse tekrar açar).
 */
const schema = z.object({ enabled: z.boolean() });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;

  try {
    const { id } = await params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }
    const { enabled } = parsed.data;

    const current = await prisma.therapist.findUnique({
      where: { id },
      select: { pdfEnabled: true },
    });
    if (!current) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }
    if (current.pdfEnabled === enabled) {
      return NextResponse.json({ user: { id, pdfEnabled: enabled } });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const t = await tx.therapist.update({
        where: { id },
        data: { pdfEnabled: enabled },
        select: { id: true, pdfEnabled: true },
      });
      await recordAudit(
        {
          actorId: session.user.id,
          action: "pdf.toggle",
          targetType: "therapist",
          targetId: id,
          diff: { from: current.pdfEnabled, to: enabled },
          ip: getClientIp(request.headers),
        },
        tx,
      );
      return t;
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    logError("admin/pdf-enabled", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
