import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { logError } from "@/lib/utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;

  try {
    const { id } = await params;

    if (id === session.user.id) {
      return NextResponse.json({ error: "Kendi rolünüzü değiştiremezsiniz" }, { status: 400 });
    }

    const current = await prisma.therapist.findUnique({ where: { id }, select: { role: true } });
    if (!current) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

    const newRole = current.role === "admin" ? "user" : "admin";

    const updated = await prisma.$transaction(async (tx) => {
      const therapist = await tx.therapist.update({
        where: { id },
        data: { role: newRole },
        select: { id: true, role: true },
      });
      await recordAudit(
        {
          actorId:    session.user.id,
          action:     "role.change",
          targetType: "therapist",
          targetId:   id,
          diff:       { from: current.role, to: newRole },
          ip:         getClientIp(request.headers),
        },
        tx,
      );
      return therapist;
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    logError("admin/role", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
