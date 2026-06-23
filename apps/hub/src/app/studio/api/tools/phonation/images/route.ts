import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@studio/auth";
import { prisma } from "@studio/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { logError } from "@studio/lib/utils";
import { generateWordImage } from "@studio/lib/generateWordImage";

interface ImgItem {
  name?: string;
  word?: string;
  visualPrompt?: string;
  imageUrl?: string;
}
interface PhonationContent {
  grid?: { cells?: ImgItem[] } | null;
  objects?: ImgItem[] | null;
  wordChain?: ImgItem[] | null;
}

type Kind = "object" | "cell" | "chain";

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
});

const CREDIT_PER_IMAGE = 1;

function collectTargets(content: PhonationContent | null) {
  const targets: Array<{ kind: Kind; index: number; word: string; visualPrompt: string }> = [];
  const push = (kind: Kind, arr: ImgItem[] | null | undefined) => {
    (arr ?? []).forEach((it, i) => {
      const vp = typeof it.visualPrompt === "string" ? it.visualPrompt.trim() : "";
      if (vp && !it.imageUrl) targets.push({ kind, index: i, word: it.word ?? it.name ?? "", visualPrompt: vp });
    });
  };
  push("object", content?.objects);
  push("cell", content?.grid?.cells);
  push("chain", content?.wordChain);
  return targets;
}

// Sesletim: somut kelime/nesnelere (objects + grid.cells + wordChain) NESNE görseli üretir
// (resimli oyun). Sağlayıcı FLUX (önce Flux denenecek politikası). Cache-hit ÜCRETSİZ.
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { allowed, retryAfter } = rateLimit(`phonation-images:${session.user.id}`, 20);
    if (!allowed) return rateLimitResponse(retryAfter);

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Geçersiz istek" },
        { status: 400 },
      );
    }
    const { cardId } = parsed.data;

    const card = await prisma.card.findFirst({
      where: { id: cardId, therapistId: session.user.id },
      select: { id: true, content: true, toolType: true },
    });
    if (!card) {
      return NextResponse.json({ error: "Kart bulunamadı" }, { status: 404 });
    }
    if (card.toolType !== "PHONATION_ACTIVITY") {
      return NextResponse.json({ error: "Bu araç yalnız sesletim aktivitesi kartlarında çalışır" }, { status: 422 });
    }

    const targets = collectTargets(card.content as PhonationContent | null);

    if (targets.length === 0) {
      return NextResponse.json({ results: [], creditsSpent: 0 });
    }

    const settled = await mapWithConcurrency(
      targets,
      6,
      (t) => generateWordImage({ word: t.word || t.visualPrompt, visualPrompt: t.visualPrompt }),
    );

    const successes: Array<{ kind: Kind; index: number; imageUrl: string }> = [];
    const results: Array<{ kind: Kind; index: number; imageUrl?: string; cacheHit?: boolean; error?: boolean }> = [];
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i]!;
      const r = settled[i]!;
      if (r.status === "fulfilled") {
        successes.push({ kind: t.kind, index: t.index, imageUrl: r.value.publicUrl });
        results.push({ kind: t.kind, index: t.index, imageUrl: r.value.publicUrl, cacheHit: r.value.cacheHit });
        console.log(`[image] tools/phonation ${t.kind}=${t.index} cacheHit=${r.value.cacheHit} therapist=${session.user.id}`);
      } else {
        logError("phonation/images generateWordImage", r.reason);
        results.push({ kind: t.kind, index: t.index, error: true });
      }
    }

    if (successes.length === 0) {
      return NextResponse.json({ results, creditsSpent: 0 });
    }

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
            description: `Sesletim görseli (${generated} üretildi)`,
          },
        });
      }
      const freshCard = await db.card.findUnique({
        where: { id: cardId },
        select: { content: true },
      });
      const freshContent = (freshCard?.content as PhonationContent | null) ?? {};
      const objects = (freshContent.objects ?? []).slice();
      const cells = (freshContent.grid?.cells ?? []).slice();
      const chain = (freshContent.wordChain ?? []).slice();
      for (const s of successes) {
        if (s.kind === "object") objects[s.index] = { ...objects[s.index], imageUrl: s.imageUrl };
        else if (s.kind === "cell") cells[s.index] = { ...cells[s.index], imageUrl: s.imageUrl };
        else chain[s.index] = { ...chain[s.index], imageUrl: s.imageUrl };
      }
      const nextContent = {
        ...freshContent,
        ...(freshContent.objects ? { objects } : {}),
        ...(freshContent.grid ? { grid: { ...freshContent.grid, cells } } : {}),
        ...(freshContent.wordChain ? { wordChain: chain } : {}),
      };
      await db.card.update({
        where: { id: cardId },
        data: {
          content: (nextContent as unknown) as Parameters<
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
    logError("POST /studio/api/tools/phonation/images", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
