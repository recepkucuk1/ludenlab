import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@studio/auth";
import { prisma } from "@studio/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { logError } from "@studio/lib/utils";
import { generateSceneImage } from "@studio/lib/generateWordImage";

interface StorySentence {
  type?: string;
  text?: string;
  visualPrompt?: string;
  imageUrl?: string;
}

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
  sentenceIndexes: z.array(z.number().int().nonnegative()).optional(),
});

const CREDIT_PER_IMAGE = 1;

// Sosyal hikaye: her cümle için SAHNE görseli üretir (hikâye-kitabı stili). İstemci üretimi kısa
// parçalara böler (timeout+rate-limit güvenli). Artikülasyon görsel endpoint'iyle aynı desen, ama
// `sentences` üzerinde çalışır ve `generateSceneImage` (scene stili) kullanır. Cache-hit ÜCRETSİZ.
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { allowed, retryAfter } = rateLimit(`social-story-images:${session.user.id}`, 20);
    if (!allowed) return rateLimitResponse(retryAfter);

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Geçersiz istek" },
        { status: 400 },
      );
    }
    const { cardId, sentenceIndexes } = parsed.data;

    const card = await prisma.card.findFirst({
      where: { id: cardId, therapistId: session.user.id },
      select: { id: true, content: true, toolType: true },
    });
    if (!card) {
      return NextResponse.json({ error: "Kart bulunamadı" }, { status: 404 });
    }
    if (card.toolType !== "SOCIAL_STORY") {
      return NextResponse.json({ error: "Bu araç yalnız sosyal hikaye kartlarında çalışır" }, { status: 422 });
    }

    const content = card.content as { sentences?: StorySentence[] } | null;
    const sentences = content?.sentences ?? [];

    // Plan: visualPrompt dolu + henüz görseli yok olan cümleler (index filtresi verilmişse onunla sınırlı).
    const wanted = sentenceIndexes && sentenceIndexes.length > 0 ? new Set(sentenceIndexes) : null;
    const targets: Array<{ index: number; visualPrompt: string }> = [];
    sentences.forEach((s, i) => {
      if (wanted && !wanted.has(i)) return;
      const vp = typeof s.visualPrompt === "string" ? s.visualPrompt.trim() : "";
      if (vp && !s.imageUrl) targets.push({ index: i, visualPrompt: vp });
    });

    if (targets.length === 0) {
      return NextResponse.json({ results: [], creditsSpent: 0 });
    }

    // Üretim — FLUX'ta PARALEL (concurrency=6, fal eşzamanlılık limiti altında). FluxProvider retry
    // ile geçici hataları maskeler. İstemci yine parçalara bölüp timeout'tan korur.
    const settled = await mapWithConcurrency(
      targets,
      6,
      (t) => generateSceneImage({ visualPrompt: t.visualPrompt }),
    );

    const successes: Array<{ index: number; imageUrl: string }> = [];
    const results: Array<{ index: number; imageUrl?: string; cacheHit?: boolean; error?: boolean }> = [];
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i]!;
      const r = settled[i]!;
      if (r.status === "fulfilled") {
        successes.push({ index: t.index, imageUrl: r.value.publicUrl });
        results.push({ index: t.index, imageUrl: r.value.publicUrl, cacheHit: r.value.cacheHit });
        console.log(`[image] tools/social-story sentence=${t.index} cacheHit=${r.value.cacheHit} therapist=${session.user.id}`);
      } else {
        logError("social-story/images generateSceneImage", r.reason);
        results.push({ index: t.index, error: true });
      }
    }

    if (successes.length === 0) {
      return NextResponse.json({ results, creditsSpent: 0 });
    }

    // SADECE gerçekten üretilen (cacheHit olmayan) sahne ücretlidir; cache'ten gelen ÜCRETSİZ.
    const generated = results.filter((r) => r.imageUrl && !r.cacheHit).length;
    const spend = generated * CREDIT_PER_IMAGE;
    const tx = await prisma.$transaction(async (db) => {
      const fresh = await db.therapist.findUnique({
        where: { id: session.user.id },
        select: { credits: true },
      });
      if (!fresh || fresh.credits < spend) {
        return { ok: false as const, credits: fresh?.credits ?? 0 };
      }
      const updated = spend > 0
        ? await db.therapist.update({
            where: { id: session.user.id },
            data: { credits: { decrement: spend } },
            select: { credits: true },
          })
        : fresh;
      if (spend > 0) {
        await db.creditTransaction.create({
          data: {
            therapistId: session.user.id,
            amount: spend,
            type: "SPEND",
            description: `Sosyal hikaye görseli (${generated} üretildi)`,
          },
        });
      }
      // Eşzamanlı aynı-kart isteklerinde içerik kaybını önlemek için content tx içinde taze okunur.
      const freshCard = await db.card.findUnique({
        where: { id: cardId },
        select: { content: true },
      });
      const freshContent = freshCard?.content as { sentences?: StorySentence[] } | null;
      const freshSentences = (freshContent?.sentences ?? []).slice();
      for (const s of successes) {
        freshSentences[s.index] = { ...freshSentences[s.index], imageUrl: s.imageUrl };
      }
      await db.card.update({
        where: { id: cardId },
        data: {
          content: ({ ...(freshContent ?? {}), sentences: freshSentences } as unknown) as Parameters<
            typeof prisma.card.create
          >[0]["data"]["content"],
        },
      });
      return { ok: true as const, credits: updated.credits };
    });

    if (!tx.ok) {
      return NextResponse.json({ error: "Yetersiz kredi", credits: tx.credits }, { status: 402 });
    }

    return NextResponse.json({ results, creditsSpent: spend, credits: tx.credits });
  } catch (error) {
    logError("POST /studio/api/tools/social-story/images", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
