import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";
import { grantCredits, revokeCredits } from "@/lib/credits";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { logError } from "@/lib/utils";

/**
 * Admin bulk operations.
 *
 * Tek endpoint, action ile yönlendirme — UI tarafı kolay (tek fetch URL'i),
 * API tarafı her action için audit ile ledger tutar. Self-id otomatik filtre
 * edilir; admin kendi hesabını yanlışlıkla askıya alamaz.
 *
 * Action listesi:
 *   - suspend / unsuspend: Therapist.suspended toggle
 *   - grant-credits / revoke-credits: kişi başına amount uygula
 *
 * Plan değişikliği bilerek dışarıda — Subscription + studentLimit + pdfEnabled
 * senkronu komplike, tek tek `/plan` üzerinden yapılmalı.
 */
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("suspend"),
    ids: z.array(z.string().min(1)).min(1).max(500),
  }),
  z.object({
    action: z.literal("unsuspend"),
    ids: z.array(z.string().min(1)).min(1).max(500),
  }),
  z.object({
    action: z.literal("grant-credits"),
    ids: z.array(z.string().min(1)).min(1).max(500),
    amount: z.number().int().min(1).max(100000),
  }),
  z.object({
    action: z.literal("revoke-credits"),
    ids: z.array(z.string().min(1)).min(1).max(500),
    amount: z.number().int().min(1).max(100000),
    reason: z.string().min(2).max(200).optional(),
  }),
]);

export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;

  const { allowed, retryAfter } = rateLimit(`admin:bulk:${session.user.id}`, 10);
  if (!allowed) return rateLimitResponse(retryAfter);

  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }
    const input = parsed.data;
    const ip = getClientIp(request.headers);

    // Self-id otomatik filtre — yanlış kazaen askıya almayı engelle
    const targetIds = input.ids.filter((id) => id !== session.user.id);
    if (targetIds.length === 0) {
      return NextResponse.json({ error: "Geçerli hedef yok (kendi hesabınız hariç)" }, { status: 400 });
    }

    if (input.action === "suspend" || input.action === "unsuspend") {
      const nextSuspended = input.action === "suspend";
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.therapist.updateMany({
          where: { id: { in: targetIds }, suspended: !nextSuspended },
          data: { suspended: nextSuspended },
        });
        await recordAudit(
          {
            actorId: session.user.id,
            action: nextSuspended ? "user.bulk-suspend" : "user.bulk-unsuspend",
            targetType: "therapist",
            targetId: "*bulk*",
            diff: { ids: targetIds, count: updated.count, requested: input.ids.length },
            ip,
          },
          tx,
        );
        return updated;
      });
      return NextResponse.json({ ok: true, affected: result.count, requested: targetIds.length });
    }

    if (input.action === "grant-credits") {
      const successes: string[] = [];
      const failures: Array<{ id: string; error: string }> = [];
      // Sıralı işliyoruz — her grant kendi mini-transaction'ında. 500 sınırı için
      // toplam latency kabul edilebilir; paralel yapmak DB connection pool'u zorlar.
      for (const id of targetIds) {
        try {
          await prisma.$transaction(async (tx) => {
            await grantCredits(id, input.amount, "Toplu admin grant'ı", tx);
            await recordAudit(
              {
                actorId: session.user.id,
                action: "credits.bulk-grant",
                targetType: "therapist",
                targetId: id,
                diff: { amount: input.amount },
                ip,
              },
              tx,
            );
          });
          successes.push(id);
        } catch (e) {
          failures.push({ id, error: e instanceof Error ? e.message : String(e) });
        }
      }
      return NextResponse.json({ ok: true, affected: successes.length, failures });
    }

    if (input.action === "revoke-credits") {
      const description = input.reason
        ? `Toplu admin geri alımı: ${input.reason}`
        : "Toplu admin geri alımı";
      const successes: string[] = [];
      const skipped: Array<{ id: string; credits: number }> = [];
      const failures: Array<{ id: string; error: string }> = [];
      for (const id of targetIds) {
        try {
          const r = await prisma.$transaction(async (tx) => {
            const result = await revokeCredits(id, input.amount, description, tx);
            if (result.ok) {
              await recordAudit(
                {
                  actorId: session.user.id,
                  action: "credits.bulk-revoke",
                  targetType: "therapist",
                  targetId: id,
                  diff: { amount: input.amount, reason: input.reason ?? null },
                  ip,
                },
                tx,
              );
            }
            return result;
          });
          if (r.ok) successes.push(id);
          else skipped.push({ id, credits: r.credits });
        } catch (e) {
          failures.push({ id, error: e instanceof Error ? e.message : String(e) });
        }
      }
      return NextResponse.json({ ok: true, affected: successes.length, skipped, failures });
    }

    return NextResponse.json({ error: "Bilinmeyen aksiyon" }, { status: 400 });
  } catch (error) {
    logError("admin/users/bulk", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
