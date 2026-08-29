import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@studio/auth";
import { prisma } from "@studio/lib/db";
import { refundCredits, reserveCredits } from "@studio/lib/credits";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { streamingJson } from "@/lib/streamingJson";
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

// Görsel partisi tek ÜRETİM sayılır: parti başına 1 hak (tümü cache-hit ise 0 — ücretsiz).

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

    // ÖN-KREDİ KAPISI (2026-08 güvenlik denetimi #05): üretim ÜCRETLİ bir dış çağrıdır
    // (OpenAI/fal). Kontrol eskiden üretimden SONRA yapıldığı için 0 haklı bir kullanıcı
    // faturayı operatöre yazdırıp 402 alıyor, ikinci çağrıda aynı görselleri cache'ten
    // ÜCRETSİZ topluyordu. Artık tek görsel bile üretmeden önce hak doğrulanır.
    // (Desen: tools/articulation/images — parti başına 1 hak; tümü cache-hit ise düşülmez.)
    // ── KREDİ REZERVASYONU (2026-08 denetimi #22) ──
    // Eskiden yalnız ön-kontrol vardı: kontrol ile düşüm arasındaki pencerede eşzamanlı
    // istekler AYNI bakiyeyi görüyordu → hepsi görsel üretiyor (fal.ai/OpenAI faturası bize),
    // sonunda yalnız biri düşebiliyordu. Parti başına 1 hak artık ÜRETİMDEN ÖNCE atomik
    // rezerve edilir. Ücretsiz çıkan parti (tümü önbellekten / hiç üretilemeyen) aşağıda
    // İADE edilir — "cache-hit ücretsiz" kuralı korunur.
    const RESERVE_DESC = "Sesletim görseli";
    const reserved = await reserveCredits(session.user.id, 1, RESERVE_DESC);
    if (!reserved) {
      return NextResponse.json(
        { error: "Üretim hakkınız tükendi. Yeni dönem başında yenilenir; dilerseniz planınızı yükseltebilirsiniz." },
        { status: 402 },
      );
    }

    // Görsel partisi 60 sn'yi aşabilir — SSE-heartbeat içinde koşar; Safari'nin
    // sessizlik zaman aşımı ping'lerle atlatılır (bkz. @/lib/streamingJson).
    return streamingJson(async () => {
      let held = true; // rezervasyon henüz harcamaya dönüşmedi
      try {
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
          // Tek görsel bile üretilemedi → rezerve edilen hak iade edilir.
          held = false;
          await refundCredits(session.user.id, 1, `${RESERVE_DESC} — iade (görsel üretilemedi)`);
          return { status: 200, body: { results, creditsSpent: 0 } };
        }

        // SADECE gerçekten ÜRETİLEN görsel ücretlidir; cache'ten gelen (cacheHit) ÜCRETSİZ —
        // banka kelimeleri ön-üretildi, yalnız DB lookup var. Hepsi cache-hit ise spend=0 ve
        // aşağıda rezervasyon İADE edilir (net etki: eskisiyle aynı, ama yarışa kapalı).
        const generated = results.filter((r) => r.imageUrl && !r.cacheHit).length;
        const spend = generated > 0 ? 1 : 0;
        // Kredi düşümü BURADA DEĞİL — üretimden önce rezerve edildi (denetim #22).
        // Bu transaction yalnız kart içeriğini günceller; patlarsa aşağıdaki catch iade eder.
        await prisma.$transaction(async (db) => {
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

        return { status: 200, body: { results, creditsSpent: spend, credits: after?.credits ?? 0 } };
      } catch (error) {
        // Üretim/kayıt tamamlanamadı → rezerve edilen hak geri verilir.
        if (held) await refundCredits(session.user.id, 1, `${RESERVE_DESC} — iade (üretim tamamlanamadı)`);
        logError("POST /studio/api/tools/phonation/images", error);
        return { status: 500, body: { error: "Bir hata oluştu" } };
      }
    });
  } catch (error) {
    logError("POST /studio/api/tools/phonation/images", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
