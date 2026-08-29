import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@studio/auth";
import { prisma } from "@studio/lib/db";
import { refundCredits, reserveCredits } from "@studio/lib/credits";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { streamingJson } from "@/lib/streamingJson";
import { logError } from "@studio/lib/utils";
import { image } from "@ludenlab/ai";
import { generateWordImage } from "@studio/lib/generateWordImage";

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i]!) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

const bodySchema = z.object({
  cardId: z.string().min(1),
  itemIndexes: z.array(z.number().int().nonnegative()).optional(),
});

// Görsel partisi tek ÜRETİM sayılır: parti başına 1 hak (tümü cache-hit ise 0 — ücretsiz).

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // İstemci toplu üretimi 3'erli kısa parçalara böler (timeout+rate-limit güvenli); bir
    // alıştırma birden çok istek üretir. Limit 20/dk — kötüye kullanım yine kredi ile sınırlı.
    const { allowed, retryAfter } = rateLimit(`articulation-images:${session.user.id}`, 20);
    if (!allowed) return rateLimitResponse(retryAfter);

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Geçersiz istek" },
        { status: 400 },
      );
    }
    const { cardId, itemIndexes } = parsed.data;

    // Ownership + içerik
    const card = await prisma.card.findFirst({
      where: { id: cardId, therapistId: session.user.id },
      select: { id: true, content: true, toolType: true },
    });
    if (!card) {
      return NextResponse.json({ error: "Kart bulunamadı" }, { status: 404 });
    }

    if (card.toolType !== "ARTICULATION_DRILL") {
      return NextResponse.json({ error: "Bu araç yalnız artikülasyon kartlarında çalışır" }, { status: 422 });
    }

    const content = card.content as { items?: image.PlannableItem[] } | null;
    const items = content?.items ?? [];
    const plan = image.planImageGeneration(items, itemIndexes);

    if (plan.targets.length === 0) {
      return NextResponse.json({ results: [], creditsSpent: 0, skipped: plan.skipped });
    }

    // ── KREDİ REZERVASYONU (2026-08 denetimi #22) ──
    // Eskiden yalnız ön-kontrol vardı: kontrol ile düşüm arasındaki pencerede eşzamanlı
    // istekler AYNI bakiyeyi görüyordu → hepsi görsel üretiyor (fal.ai/OpenAI faturası bize),
    // sonunda yalnız biri düşebiliyordu. Parti başına 1 hak artık ÜRETİMDEN ÖNCE atomik
    // rezerve edilir. Ücretsiz çıkan parti (tümü önbellekten / hiç üretilemeyen) aşağıda
    // İADE edilir — "cache-hit ücretsiz" kuralı korunur.
    const RESERVE_DESC = "Artikülasyon görsel üretimi";
    const reserved = await reserveCredits(session.user.id, 1, RESERVE_DESC);
    if (!reserved) {
      return NextResponse.json(
        { error: "Üretim hakkınız tükendi. Yeni dönem başında yenilenir; dilerseniz planınızı yükseltebilirsiniz." },
        { status: 402 },
      );
    }

    // Üretim — FLUX'ta PARALEL (concurrency=6). fal.ai eşzamanlılık limiti son-4-hafta krediye
    // bağlı ($10 → 10 concurrent); 6 < 10 güvenli, ~5x hız. İstemci yine parçalara bölüp
    // timeout'tan korur. Geçici hatalar (bakiye auto-recharge anı, fal hıçkırığı) FluxProvider
    // withRetry(6 deneme, üstel backoff ~25s) ile maskelenir.
    // (Eski "seri" gerekçesi OpenAI Tier-1 dakika-duvarı içindi; FLUX'ta öyle bir duvar yok.)
    // Görsel partisi 60 sn'yi aşabilir — SSE-heartbeat içinde koşar; Safari'nin
    // sessizlik zaman aşımı ping'lerle atlatılır (bkz. @/lib/streamingJson).
    return streamingJson(async () => {
      let held = true; // rezervasyon henüz harcamaya dönüşmedi
      try {
        const settled = await mapWithConcurrency(
          plan.targets,
          6,
          (t) => generateWordImage({ word: t.word, visualPrompt: t.visualPrompt }),
        );

        // Sonuçları işle: başarılıları kaydet, cacheHit logla.
        const successes: Array<{ index: number; imageUrl: string }> = [];
        const results: Array<{ index: number; word: string; imageUrl?: string; cacheHit?: boolean; error?: boolean }> = [];
        let succeeded = 0;
        for (let i = 0; i < plan.targets.length; i++) {
          const t = plan.targets[i]!;
          const r = settled[i]!;
          if (r.status === "fulfilled") {
            succeeded++;
            successes.push({ index: t.index, imageUrl: r.value.publicUrl });
            results.push({ index: t.index, word: t.word, imageUrl: r.value.publicUrl, cacheHit: r.value.cacheHit });
            // Telemetri: operatör cache oranını/marjı görür (logUsage token-merkezli; burada console).
            console.log(`[image] tools/articulation word="${t.word}" cacheHit=${r.value.cacheHit} therapist=${session.user.id}`);
          } else {
            logError("articulation/images generateWordImage", r.reason);
            results.push({ index: t.index, word: t.word, error: true });
          }
        }

        if (succeeded === 0) {
          // Tek görsel bile üretilemedi → rezerve edilen hak iade edilir.
          held = false;
          await refundCredits(session.user.id, 1, `${RESERVE_DESC} — iade (görsel üretilemedi)`);
          return { status: 200, body: { results, creditsSpent: 0, skipped: plan.skipped } };
        }

        // SADECE gerçekten ÜRETİLEN görsel ücretlidir; cache'ten gelen (cacheHit) ÜCRETSİZ —
        // banka kelimeleri ön-üretildi, yalnız DB lookup var. Hepsi cache-hit ise spend=0 ve
        // aşağıda rezervasyon İADE edilir (net etki: eskisiyle aynı, ama yarışa kapalı).
        const generated = results.filter((r) => r.imageUrl && !r.cacheHit).length;
        const spend = generated > 0 ? 1 : 0;
        // Kredi düşümü BURADA DEĞİL — üretimden önce rezerve edildi (denetim #22).
        // Bu transaction yalnız kart içeriğini günceller; patlarsa aşağıdaki catch iade eder.
        await prisma.$transaction(async (db) => {
          // Eşzamanlı aynı-kart isteklerinde içerik kaybını önlemek için content tx içinde taze okunur.
          const freshCard = await db.card.findUnique({
            where: { id: cardId },
            select: { content: true },
          });
          const freshContent = freshCard?.content as { items?: image.PlannableItem[] } | null;
          const freshItems = (freshContent?.items ?? []).slice();
          for (const s of successes) {
            freshItems[s.index] = { ...freshItems[s.index], imageUrl: s.imageUrl };
          }
          await db.card.update({
            where: { id: cardId },
            data: {
              // Prisma Json alanı `object` kabul etmez; toolHandler.ts'teki cast desenini izle.
              // `as unknown as ...` iki adımlı cast: Record<string,unknown> → InputJsonValue arasındaki
              // tip boşluğunu doldurur (toolHandler.ts'te aiContent: Record<string,unknown> aynı nedene
              // dayanarak çalışır — burada spread obje aynı desene uyar).
              content: ({ ...(freshContent ?? {}), items: freshItems } as unknown) as Parameters<
                typeof prisma.card.create
              >[0]["data"]["content"],
            },
          });
        });

        // Kart güncellendi → ücretlendirme BURADA netleşir. Hiçbir görsel gerçekten
        // üretilmediyse (tümü önbellekten) parti ücretsizdir → rezervasyon iade edilir.
        held = false;
        if (spend === 0) {
          await refundCredits(session.user.id, 1, `${RESERVE_DESC} — iade (tümü önbellekten)`);
        }
        const after = await prisma.therapist.findUnique({
          where: { id: session.user.id },
          select: { credits: true },
        });

        return { status: 200, body: { results, creditsSpent: spend, credits: after?.credits ?? 0, skipped: plan.skipped } };
      } catch (error) {
        // Üretim/kayıt tamamlanamadı → rezerve edilen hak geri verilir.
        if (held) await refundCredits(session.user.id, 1, `${RESERVE_DESC} — iade (üretim tamamlanamadı)`);
        logError("POST /studio/api/tools/articulation/images", error);
        return { status: 500, body: { error: "Bir hata oluştu" } };
      }
    });
  } catch (error) {
    logError("POST /studio/api/tools/articulation/images", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
