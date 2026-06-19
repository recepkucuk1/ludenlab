import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@studio/auth";
import { prisma } from "@studio/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { logError } from "@studio/lib/utils";
import { image } from "@ludenlab/ai";
import { generateWordImage } from "@studio/lib/generateWordImage";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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

const CREDIT_PER_IMAGE = 1;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { allowed, retryAfter } = rateLimit(`articulation-images:${session.user.id}`, 4);
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

    // Kredi ön-kontrol (en fazla hedef sayısı kadar gerekecek)
    const therapist = await prisma.therapist.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    });
    const needed = plan.targets.length * CREDIT_PER_IMAGE;
    if (!therapist || therapist.credits < needed) {
      return NextResponse.json(
        { error: `Yetersiz kredi. Gerekli: ${needed}, Mevcut: ${therapist?.credits ?? 0}` },
        { status: 402 },
      );
    }

    // Üretim — seri (concurrency=1) + 1200ms ara-gecikme; Tier-1 rate-limit koruyucu.
    const settled = await mapWithConcurrency(
      plan.targets,
      1,
      async (t) => {
        const r = await generateWordImage({ word: t.word, visualPrompt: t.visualPrompt });
        await sleep(1200);
        return r;
      },
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
      return NextResponse.json({ results, creditsSpent: 0, skipped: plan.skipped });
    }

    // Atomik: kredi (başarılı sayı kadar) + content güncelle. Başarısız üretim ücretsiz.
    const spend = succeeded * CREDIT_PER_IMAGE;
    const tx = await prisma.$transaction(async (db) => {
      const fresh = await db.therapist.findUnique({
        where: { id: session.user.id },
        select: { credits: true },
      });
      if (!fresh || fresh.credits < spend) {
        return { ok: false as const, credits: fresh?.credits ?? 0 };
      }
      const updated = await db.therapist.update({
        where: { id: session.user.id },
        data: { credits: { decrement: spend } },
        select: { credits: true },
      });
      await db.creditTransaction.create({
        data: {
          therapistId: session.user.id,
          amount: spend,
          type: "SPEND",
          description: `Artikülasyon görsel üretimi (${succeeded} görsel)`,
        },
      });
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
      return { ok: true as const, credits: updated.credits };
    });

    if (!tx.ok) {
      // Görseller üretildi (cache'te kalıcı) ama kredi yetmedi → karta yazılmadı, ücret alınmadı.
      return NextResponse.json({ error: "Yetersiz kredi", credits: tx.credits }, { status: 402 });
    }

    return NextResponse.json({ results, creditsSpent: spend, credits: tx.credits, skipped: plan.skipped });
  } catch (error) {
    logError("POST /studio/api/tools/articulation/images", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
