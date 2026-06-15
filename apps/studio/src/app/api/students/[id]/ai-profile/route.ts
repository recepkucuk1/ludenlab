import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateStudentProfile } from "@/lib/generateProfile";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { checkCredits, deductCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/plans";
import { requireAuth, requireStudentOwnership } from "@/lib/auth-helpers";
import { logError } from "@/lib/utils";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
          error: `Yetersiz kredi. Mevcut krediniz: ${creditCheck.credits}. AI profil için ${CREDIT_COSTS.ai_profile} kredi gereklidir.`,
        },
        { status: 403 },
      );
    }

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

    return NextResponse.json({ success: true, aiProfile });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
      return NextResponse.json(
        { error: "Yetersiz kredi. AI profil oluşturulamadı." },
        { status: 403 },
      );
    }
    logError("POST /api/students/[id]/ai-profile", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
