import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/studio/client";
import { prisma } from "@studio/lib/db";
import { requireAdmin } from "@studio/lib/auth-helpers";
import { recordAudit } from "@studio/lib/audit";
import { getClientIp } from "@studio/lib/rateLimit";
import { logError } from "@studio/lib/utils";

/**
 * Abonelik manuel override.
 *
 * Kullanım: iyzico webhook'u kaçırdığında ya da yanlış state'e taktığında admin
 * elle DB durumunu düzeltir. Bu endpoint **iyzico'da değişiklik yapmaz** — yalnızca
 * yerel Subscription kaydını günceller. Plan değişikliği için bu endpoint
 * kullanılmaz; o ayrı (`/plan`) çünkü Therapist.planType + studentLimit + pdfEnabled
 * senkronizasyonu gerekir.
 *
 * Hedef: kullanıcının en son aboneliği (status fark etmez). Hiç sub yoksa 404 —
 * önce plan endpoint ile sub oluşturulmalı.
 */
const schema = z.object({
  status: z.enum(["ACTIVE", "CANCELLED", "EXPIRED", "PENDING"]).optional(),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).optional(),
  currentPeriodEnd: z.string().optional(),
  cancelledAt: z.string().nullable().optional(),
});

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
    const patch = parsed.data;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "En az bir alan gerekli" }, { status: 400 });
    }

    const sub = await prisma.subscription.findFirst({
      where: { therapistId: id },
      orderBy: { createdAt: "desc" },
    });
    if (!sub) {
      return NextResponse.json(
        { error: "Bu kullanıcının aboneliği yok. Önce plan atayın." },
        { status: 404 },
      );
    }

    const data: Prisma.SubscriptionUpdateInput = {};
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.billingCycle !== undefined) data.billingCycle = patch.billingCycle;

    if (patch.currentPeriodEnd !== undefined) {
      const d = new Date(patch.currentPeriodEnd);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: "Geçersiz currentPeriodEnd" }, { status: 400 });
      }
      data.currentPeriodEnd = d;
    }

    if (patch.cancelledAt !== undefined) {
      if (patch.cancelledAt === null) {
        data.cancelledAt = null;
      } else {
        const d = new Date(patch.cancelledAt);
        if (isNaN(d.getTime())) {
          return NextResponse.json({ error: "Geçersiz cancelledAt" }, { status: 400 });
        }
        data.cancelledAt = d;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const before = {
        status: sub.status,
        billingCycle: sub.billingCycle,
        currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
        cancelledAt: sub.cancelledAt?.toISOString() ?? null,
      };
      const updated = await tx.subscription.update({
        where: { id: sub.id },
        data,
        select: {
          id: true,
          status: true,
          billingCycle: true,
          currentPeriodEnd: true,
          cancelledAt: true,
          updatedAt: true,
        },
      });
      const after = {
        status: updated.status,
        billingCycle: updated.billingCycle,
        currentPeriodEnd: updated.currentPeriodEnd.toISOString(),
        cancelledAt: updated.cancelledAt?.toISOString() ?? null,
      };
      await recordAudit(
        {
          actorId: session.user.id,
          action: "subscription.override",
          targetType: "subscription",
          targetId: sub.id,
          diff: { therapistId: id, before, after },
          ip: getClientIp(request.headers),
        },
        tx,
      );
      return updated;
    });

    return NextResponse.json({ subscription: result });
  } catch (error) {
    logError("admin/subscription/override", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
