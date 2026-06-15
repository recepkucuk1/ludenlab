import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cancelSubscription } from "@/lib/iyzico";
import { recordAudit } from "@/lib/audit";

/**
 * Daily cron — finalises pending subscription cancellations.
 *
 * Cancellations in this app are deferred (see /api/subscription/cancel) so
 * the user can undo them at any time before period-end. This cron is the
 * piece that actually tells iyzico to stop recurring billing and downgrades
 * the user.
 *
 * Schedule (Hostinger hPanel → Cron Jobs, daily at 04:00 TR):
 *
 *   0 4 * * *  curl -sS -X POST \
 *     https://ludenlab.com/api/cron/subscription-cleanup \
 *     -H "Authorization: Bearer $CRON_SECRET"
 *
 * Two phases run on every invocation:
 *
 *   PHASE 1 — iyzico notify (currentPeriodEnd within next 24h):
 *     We call iyzico's cancelSubscription so the renewal that would happen
 *     at period-end is suppressed. Therapist is NOT downgraded yet — they
 *     keep paid access until currentPeriodEnd.
 *
 *   PHASE 2 — downgrade (currentPeriodEnd has passed):
 *     We also call iyzico cancel (idempotent — covers the case where Phase 1
 *     didn't run for whatever reason), then mark status = EXPIRED and flip
 *     Therapist to FREE.
 *
 * Idempotent: rerunning processes nothing because Phase 2 sets status to
 * EXPIRED, which excludes the row from future queries.
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const provided = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;

  if (!expected) {
    console.error("[cron] CRON_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + ONE_DAY_MS);

  // ── PHASE 1: iyzico-notify subs whose period ends within next 24h ────────
  const phase1Targets = await prisma.subscription.findMany({
    where: {
      status: "CANCELLED",
      cancelledAt: { not: null },
      currentPeriodEnd: { gt: now, lte: in24h },
      iyzicoSubscriptionRef: { not: null },
    },
    select: { id: true, iyzicoSubscriptionRef: true },
  });

  const phase1Results = await Promise.all(
    phase1Targets.map(async (sub) => {
      try {
        const r = await cancelSubscription(sub.iyzicoSubscriptionRef!);
        const ok = r.status === "success" || isAlreadyCancelledError(r.errorMessage);
        if (!ok) console.error("[cron P1] iyzico cancel failed", sub.id, r);
        return { id: sub.id, ok, error: ok ? undefined : r.errorMessage };
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error("[cron P1] exception", sub.id, message);
        return { id: sub.id, ok: false, error: message };
      }
    }),
  );

  // ── PHASE 2: downgrade subs whose period has ended ───────────────────────
  const phase2Targets = await prisma.subscription.findMany({
    where: {
      status: "CANCELLED",
      currentPeriodEnd: { lte: now },
      iyzicoSubscriptionRef: { not: null },
    },
    select: { id: true, therapistId: true, iyzicoSubscriptionRef: true },
  });

  const phase2Results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const sub of phase2Targets) {
    try {
      // Belt-and-suspenders: also call iyzico cancel here (idempotent)
      // in case Phase 1 was skipped (e.g. user cancelled within 24h of
      // period-end and the cron run before that didn't catch them).
      const r = await cancelSubscription(sub.iyzicoSubscriptionRef!);
      const ok = r.status === "success" || isAlreadyCancelledError(r.errorMessage);
      if (!ok) {
        console.error("[cron P2] iyzico cancel failed, skipping downgrade", sub.id, r);
        phase2Results.push({ id: sub.id, ok: false, error: r.errorMessage });
        continue;
      }

      await prisma.$transaction(async (tx) => {
        await tx.subscription.update({
          where: { id: sub.id },
          data: { status: "EXPIRED" },
        });
        await tx.therapist.update({
          where: { id: sub.therapistId },
          data: {
            planType: "FREE",
            studentLimit: 2,
            pdfEnabled: false,
          },
        });
      });

      phase2Results.push({ id: sub.id, ok: true });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[cron P2] exception", sub.id, message);
      phase2Results.push({ id: sub.id, ok: false, error: message });
    }
  }

  // Heartbeat — admin System Health "son cron çalışması"nı bu kayıttan okur.
  // Faz başına sayım yeter; başarısızlık detayını sunucu loglarında bırakıyoruz.
  await recordAudit({
    actorId: null,
    action: "cron.subscription-cleanup",
    targetType: "system",
    targetId: "cron",
    diff: {
      timestamp: now.toISOString(),
      phase1: {
        considered: phase1Targets.length,
        ok: phase1Results.filter((r) => r.ok).length,
        failed: phase1Results.filter((r) => !r.ok).length,
      },
      phase2: {
        considered: phase2Targets.length,
        ok: phase2Results.filter((r) => r.ok).length,
        failed: phase2Results.filter((r) => !r.ok).length,
      },
    },
  });

  return NextResponse.json({
    timestamp: now.toISOString(),
    phase1: {
      considered: phase1Targets.length,
      ok: phase1Results.filter((r) => r.ok).length,
      failed: phase1Results.filter((r) => !r.ok).length,
      results: phase1Results,
    },
    phase2: {
      considered: phase2Targets.length,
      ok: phase2Results.filter((r) => r.ok).length,
      failed: phase2Results.filter((r) => !r.ok).length,
      results: phase2Results,
    },
  });
}

function isAlreadyCancelledError(msg?: string): boolean {
  if (!msg) return false;
  return /(already|zaten|cancel|iptal)/i.test(msg);
}
