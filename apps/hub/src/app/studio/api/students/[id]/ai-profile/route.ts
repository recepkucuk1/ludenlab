import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@studio/lib/db";
import { generateStudentProfile } from "@studio/lib/generateProfile";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { streamingJson } from "@/lib/streamingJson";
import { refundCreditsFor, reserveCreditsFor } from "@studio/lib/credits";
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

    // ── KREDİ REZERVASYONU (2026-08 denetimi #22) ──
    // Ön-kontrol ile düşüm ayrı olduğunda eşzamanlı istekler aynı bakiyeyi görüp hepsi
    // Claude'u çağırabiliyordu. Hak artık pahalı çağrıdan ÖNCE atomik rezerve edilir;
    // üretim tamamlanamazsa iade edilir.
    const reserved = await reserveCreditsFor(session.user.id, "ai_profile");
    if (!reserved) {
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
      let held = true; // rezervasyon henüz harcamaya dönüşmedi
      try {
        // AI çağrısı — uzun sürer, transaction dışında yapılmalı.
        const aiProfile = await generateStudentProfile(id, session.user.id);

        await prisma.student.update({ where: { id }, data: { aiProfile } });

        held = false; // üretim tamamlandı → rezervasyon gerçek harcama oldu
        return { status: 200, body: { success: true, aiProfile } };
      } catch (error) {
        // Üretim yok → rezerve edilen hak geri verilir.
        if (held) await refundCreditsFor(session.user.id, "ai_profile", "üretim tamamlanamadı");
        logError("POST /studio/api/students/[id]/ai-profile", error);
        return { status: 500, body: { error: "Bir hata oluştu" } };
      }
    });
  } catch (error) {
    logError("POST /studio/api/students/[id]/ai-profile", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
