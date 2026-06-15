import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/utils";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { z } from "zod";

const spendSchema = z.object({
  amount: z.number().int().positive().max(1000),
  description: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { allowed, retryAfter } = rateLimit(`credits-spend:${session.user.id}`, 10);
    if (!allowed) return rateLimitResponse(retryAfter);

    const parsed = spendSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz istek" }, { status: 400 });
    }
    const { amount, description } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const therapist = await tx.therapist.findUnique({
        where: { id: session.user.id },
        select: { credits: true },
      });

      if (!therapist || therapist.credits < amount) {
        return { ok: false as const, credits: therapist?.credits ?? 0 };
      }

      const updated = await tx.therapist.update({
        where: { id: session.user.id },
        data: { credits: { decrement: amount } },
        select: { credits: true },
      });

      await tx.creditTransaction.create({
        data: {
          therapistId: session.user.id,
          amount,
          type: "SPEND",
          description,
        },
      });

      return { ok: true as const, credits: updated.credits };
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: "Yetersiz kredi", credits: result.credits },
        { status: 402 }
      );
    }

    return NextResponse.json({ credits: result.credits });
  } catch (error) {
    logError("POST /api/credits/spend", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
