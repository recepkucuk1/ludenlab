import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { PLAN_CONFIG } from "@/lib/plans";
import { logError } from "@/lib/utils";

const schema = z.object({
  planType:     z.enum(["FREE", "PRO", "ADVANCED", "ENTERPRISE"]),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).default("YEARLY"),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;

  try {
    const { id } = await params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });

    const { planType, billingCycle } = parsed.data;
    const config = PLAN_CONFIG[planType];

    const [plan, currentTherapist] = await Promise.all([
      prisma.plan.findFirst({ where: { type: planType } }),
      prisma.therapist.findUnique({
        where: { id },
        select: { planType: true, studentLimit: true, pdfEnabled: true },
      }),
    ]);

    if (!plan) {
      return NextResponse.json(
        { error: "Plan kataloğunda bu tür yok — seed.ts çalıştırıldı mı?" },
        { status: 500 },
      );
    }
    if (!currentTherapist) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    const periodEnd = new Date();
    if (billingCycle === "YEARLY") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Therapist + Subscription + audit tek transaction içinde — yarım güncelleme
    // sonucu tutarsız bir kullanıcı durumu ya da eksik denetim kaydı kalmasın.
    const updated = await prisma.$transaction(async (tx) => {
      const therapist = await tx.therapist.update({
        where: { id },
        data: {
          planType,
          studentLimit: config.studentLimit,
          pdfEnabled:   config.pdfEnabled,
        },
        select: { id: true, planType: true, studentLimit: true, pdfEnabled: true },
      });

      const existing = await tx.subscription.findFirst({
        where: { therapistId: id, status: "ACTIVE" },
        select: { id: true },
      });

      if (existing) {
        await tx.subscription.update({
          where: { id: existing.id },
          data: { planId: plan.id, status: "ACTIVE", billingCycle, currentPeriodEnd: periodEnd },
        });
      } else {
        await tx.subscription.create({
          data: { therapistId: id, planId: plan.id, status: "ACTIVE", billingCycle, currentPeriodEnd: periodEnd },
        });
      }

      await recordAudit(
        {
          actorId:    session.user.id,
          action:     "plan.update",
          targetType: "therapist",
          targetId:   id,
          diff:       {
            from: currentTherapist.planType,
            to:   planType,
            billingCycle,
            currentPeriodEnd: periodEnd.toISOString(),
          },
          ip: getClientIp(request.headers),
        },
        tx,
      );

      return therapist;
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    logError("admin/plan", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
