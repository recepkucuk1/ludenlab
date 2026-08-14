import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@studio/lib/db";
import { generateStudentProfile } from "@studio/lib/generateProfile";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { streamingJson } from "@/lib/streamingJson";
import { checkCredits, deductCredits } from "@studio/lib/credits";
import { CREDIT_COSTS } from "@studio/lib/plans";
import { requireAuth, requireStudentOwnership } from "@studio/lib/auth-helpers";
import { logError } from "@studio/lib/utils";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAuth();
  if (gate instanceof NextResponse) return gate;
  const { session } = gate;

  const { allowed, retryAfter } = rateLimit(`ai-profile:${session.user.id}`, 3);
  if (!allowed) return rateLimitResponse(retryAfter);

  try {
    const { id } = await params;

    const ownership = await requireStudentOwnership(id, session.user.id);
    if (ownership instanceof NextResponse) return ownership;

    // Hızlı kredi ön kontrolü — UX için, gerçek kilit transaction içinde.
    const creditCheck = await checkCredits(session.user.id, "ai_profile");
    if (!creditCheck.ok) {
      return NextResponse.json(
        {
          error: `Üretim hakkınız tükendi. Yeni dönemde yenilenir; dilerseniz planınızı yükseltin.`,
        },
        { status: 403 },
      );
    }

    // Yavaş kısım (uzun Claude çağrısı + commit) SSE-heartbeat içinde koşar —
    // Safari'nin 60 sn zaman aşımı ping'lerle atlatılır (bkz. @/lib/streamingJson).
    return streamingJson(async () => {
      try {
        // AI çağrısı — uzun sürer, transaction dışında yapılmalı.
        const aiProfile = await generateStudentProfile(id, session.user.id);

        // Yazma + kredi düşümünü tek transaction içinde koşturuyoruz:
        // AI çıktısı kaydedilirse kredi kesin olarak düşer, düşemezse yazım da
        // geri alınır — bu sayede "AI çalıştı ama kredi düşemedi" yarış durumu
        // kaldırılıyor (eski kod bunu bilerek loglayıp yutuyordu).
        await prisma.$transaction(async (tx) => {
          const result = await deductCredits(session.user.id, "ai_profile", tx);
          if (!result.ok) throw new Error("INSUFFICIENT_CREDITS");

          await tx.student.update({
            where: { id },
            data: { aiProfile },
          });
        });

        return { status: 200, body: { success: true, aiProfile } };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "INSUFFICIENT_CREDITS"
        ) {
          return {
            status: 403,
            body: {
              error: "Üretim hakkınız tükendi. AI profil oluşturulamadı.",
            },
          };
        }
        logError("POST /studio/api/students/[id]/ai-profile", error);
        return { status: 500, body: { error: "Bir hata oluştu" } };
      }
    });
  } catch (error) {
    logError("POST /studio/api/students/[id]/ai-profile", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
