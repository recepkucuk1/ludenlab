import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { revokeCredits } from "@/lib/credits";
import { recordAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { logError } from "@/lib/utils";

/**
 * Admin refund / kredi geri alma. `grantCredits`'in simetrik karşılığı.
 * Yanlış grant'ı, suistimal edilmiş krediyi ya da test bakiyesini geri çeker.
 *
 * Ayrı endpoint (mevcut `/credits` POST'u "ekle" için) — audit action de ayrı
 * (`credits.revoke`) ki ledger okurken yön net görünsün. Yetersiz bakiyede 400
 * döner; sessizce clamp etmek audit'i bulanıklaştırır.
 */
const schema = z.object({
  amount: z.number().int().min(1).max(100000),
  reason: z.string().min(2).max(200).optional(),
});

export async function POST(
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
      return NextResponse.json({ error: "Geçersiz miktar" }, { status: 400 });
    }
    const { amount, reason } = parsed.data;
    const description = reason ? `Admin tarafından geri alındı: ${reason}` : "Admin tarafından geri alındı";

    const result = await prisma.$transaction(async (tx) => {
      const r = await revokeCredits(id, amount, description, tx);
      if (!r.ok) {
        return { ok: false as const, credits: r.credits };
      }
      await recordAudit(
        {
          actorId: session.user.id,
          action: "credits.revoke",
          targetType: "therapist",
          targetId: id,
          diff: { amount, newBalance: r.newBalance, reason: reason ?? null },
          ip: getClientIp(request.headers),
        },
        tx,
      );
      return { ok: true as const, newBalance: r.newBalance };
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: `Yetersiz bakiye (mevcut ${result.credits})`, credits: result.credits },
        { status: 400 },
      );
    }

    return NextResponse.json({ user: { id, credits: result.newBalance } });
  } catch (error) {
    logError("admin/credits/revoke", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
