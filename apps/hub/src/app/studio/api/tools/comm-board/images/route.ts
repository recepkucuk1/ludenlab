import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@studio/auth";
import { prisma } from "@studio/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { logError } from "@studio/lib/utils";
import { generateWordImage } from "@studio/lib/generateWordImage";

interface BoardCell {
  word?: string;
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
  cellIndexes: z.array(z.number().int().nonnegative()).optional(),
});

const CREDIT_PER_IMAGE = 1;

// İletişim panosu: her hücre için NESNE görseli (AAC sembolü; tek-nesne flashcard stili).
// Sosyal-hikaye görsel endpoint'iyle aynı desen, ama `cells` üzerinde + `generateWordImage`. Cache-hit ÜCRETSİZ.
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { allowed, retryAfter } = rateLimit(`comm-board-images:${session.user.id}`, 20);
    if (!allowed) return rateLimitResponse(retryAfter);

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Geçersiz istek" },
        { status: 400 },
      );
    }
    const { cardId, cellIndexes } = parsed.data;

    const card = await prisma.card.findFirst({
      where: { id: cardId, therapistId: session.user.id },
      select: { id: true, content: true, toolType: true },
    });
    if (!card) {
      return NextResponse.json({ error: "Kart bulunamadı" }, { status: 404 });
    }
    if (card.toolType !== "COMMUNICATION_BOARD") {
      return NextResponse.json({ error: "Bu araç yalnız iletişim panosu kartlarında çalışır" }, { status: 422 });
    }

    const content = card.content as { cells?: BoardCell[] } | null;
    const cells = content?.cells ?? [];

    // Plan: visualPrompt dolu + henüz görseli yok olan hücreler (index filtresi verilmişse onunla sınırlı).
    const wanted = cellIndexes && cellIndexes.length > 0 ? new Set(cellIndexes) : null;
    const targets: Array<{ index: number; word: string; visualPrompt: string }> = [];
    cells.forEach((c, i) => {
      if (wanted && !wanted.has(i)) return;
      const vp = typeof c.visualPrompt === "string" ? c.visualPrompt.trim() : "";
      if (vp && !c.imageUrl) targets.push({ index: i, word: c.word ?? "", visualPrompt: vp });
    });

    if (targets.length === 0) {
      return NextResponse.json({ results: [], creditsSpent: 0 });
    }

    const settled = await mapWithConcurrency(
      targets,
      6,
      (t) => generateWordImage({ word: t.word || t.visualPrompt, visualPrompt: t.visualPrompt }),
    );

    const successes: Array<{ index: number; imageUrl: string }> = [];
    const results: Array<{ index: number; imageUrl?: string; cacheHit?: boolean; error?: boolean }> = [];
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i]!;
      const r = settled[i]!;
      if (r.status === "fulfilled") {
        successes.push({ index: t.index, imageUrl: r.value.publicUrl });
        results.push({ index: t.index, imageUrl: r.value.publicUrl, cacheHit: r.value.cacheHit });
        console.log(`[image] tools/comm-board cell=${t.index} cacheHit=${r.value.cacheHit} therapist=${session.user.id}`);
      } else {
        logError("comm-board/images generateWordImage", r.reason);
        results.push({ index: t.index, error: true });
      }
    }

    if (successes.length === 0) {
      return NextResponse.json({ results, creditsSpent: 0 });
    }

    // SADECE gerçekten üretilen (cacheHit olmayan) görsel ücretlidir; cache'ten gelen ÜCRETSİZ.
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
            description: `İletişim panosu görseli (${generated} üretildi)`,
          },
        });
      }
      const freshCard = await db.card.findUnique({
        where: { id: cardId },
        select: { content: true },
      });
      const freshContent = freshCard?.content as { cells?: BoardCell[] } | null;
      const freshCells = (freshContent?.cells ?? []).slice();
      for (const s of successes) {
        freshCells[s.index] = { ...freshCells[s.index], imageUrl: s.imageUrl };
      }
      await db.card.update({
        where: { id: cardId },
        data: {
          content: ({ ...(freshContent ?? {}), cells: freshCells } as unknown) as Parameters<
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
    logError("POST /studio/api/tools/comm-board/images", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
