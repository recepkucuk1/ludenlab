import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@studio/lib/db";
import { requireAdmin } from "@studio/lib/auth-helpers";
import { grantCredits } from "@studio/lib/credits";
import { recordAudit } from "@studio/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { logError } from "@studio/lib/utils";
import { checkAdminGrantAllowance } from "@studio/lib/adminGrantLimit";

const schema = z.object({
  amount: z.number().int().min(1).max(100000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;

  try {
    const { id } = await params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Geçersiz miktar" }, { status: 400 });

    const { amount } = parsed.data;

    // Kendine hak verme yok (2026-09 denetimi #20) — toplu uçta zaten filtreleniyordu.
    if (id === session.user.id) {
      return NextResponse.json({ error: "Kendi hesabınıza hak ekleyemezsiniz." }, { status: 400 });
    }
    const allowance = await checkAdminGrantAllowance(session.user.id, amount);
    if (!allowance.ok) {
      return NextResponse.json(
        { error: `Günlük hak verme tavanı aşılıyor (kalan: ${allowance.remaining}).` },
        { status: 429 },
      );
    }

    // Grant + audit tek transaction — denetim kaydı her zaman eşlik etsin.
    const result = await prisma.$transaction(async (tx) => {
      const grant = await grantCredits(id, amount, "Admin tarafından eklendi", tx);
      await recordAudit(
        {
          actorId:    session.user.id,
          action:     "credits.grant",
          targetType: "therapist",
          targetId:   id,
          diff:       { amount, newBalance: grant.newBalance },
          ip:         getClientIp(request.headers),
        },
        tx,
      );
      return grant;
    });

    return NextResponse.json({
      user: { id, credits: result.newBalance },
    });
  } catch (error) {
    logError("admin/credits", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
