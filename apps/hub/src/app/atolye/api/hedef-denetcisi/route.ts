// apps/hub/src/app/atolye/api/hedef-denetcisi/route.ts
import { NextResponse } from "next/server";
import { pickAlias, pseudonymizeDeep, rehydrateText, type NameMapping } from "@ludenlab/ai";
import { readJsonBody } from "@/lib/bodyLimit";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { trGunBaslangici } from "@/lib/trZaman";
import { HEDEF_DENETIM_GUNLUK, HEDEF_DENETIM_SINIR_METNI, denetimToMarkdown, dizgileriDonustur, temizle } from "@/lib/hedefDenetimi";
import { DenetimHatasi } from "@/lib/hedefDenetimi/dogrula";
import { hedefDenetle } from "@/lib/hedefDenetimi/run";
import { auth } from "@atolye/auth";
import { saveDocument } from "@atolye/lib/cases";
import { prisma } from "@atolye/lib/db";
import { HEDEF_DENETIM_DOC_TYPE, hedefDenetcisiInputSchema, kademeYasMetni } from "@atolye/lib/hedef-denetcisi";
import { mebToPrompt } from "@atolye/lib/meb-program";
import { logUsage } from "@atolye/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

/* Hedef denetçisi (spec §6.1). KREDİ DÜŞMEZ: `withCredits`/`runTool` kullanılmaz; koruma dakikalık hız sınırı +
   günlük sınır (kayıtlı `hedef_denetim` dokümanı sayımı, TR günü; sayım patlarsa açık sayılır — asistan ilkesi).
   ÇOCUK PII KAPISI runTool ile aynı: ad → rumuz, hedef metnindeki ad da temizlenir; çıktı dizgileri geri çevrilir.
   Hedef metni hiçbir log satırına yazılmaz. Yanıt düz JSON (çağrı 5–10 sn; SSE gerekmez). */

const DAKIKALIK = 6;

async function bugunkuSayim(accountId: string): Promise<number> {
  try {
    return await prisma.generatedDocument.count({
      where: { type: HEDEF_DENETIM_DOC_TYPE, createdAt: { gte: trGunBaslangici() }, case: { ownerId: accountId } },
    });
  } catch (e) {
    console.warn("[atolye/hedef-denetcisi] günlük sayım yapılamadı, açık sayıldı", e);
    return 0;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Bu işlem için giriş yapmalısınız." }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Sunucu yapılandırması eksik (ANTHROPIC_API_KEY)." }, { status: 503 });
  }
  const accountId = session.user.id;

  const read = await readJsonBody(req);
  if (!read.ok) return NextResponse.json({ error: read.error }, { status: read.status });
  const parsed = hedefDenetcisiInputSchema.safeParse(read.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Form geçersiz.", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 422 },
    );
  }
  const input = parsed.data;

  const rl = rateLimit(`hedef-denetim:${accountId}`, DAKIKALIK);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

  const sayim = await bugunkuSayim(accountId);
  if (sayim >= HEDEF_DENETIM_GUNLUK) {
    return NextResponse.json({ error: HEDEF_DENETIM_SINIR_METNI, code: "DAILY_CAP" }, { status: 429 });
  }

  const map: NameMapping = { real: input.rumuz, alias: pickAlias(input.rumuz, { scope: accountId }) };
  const safe = { ...pseudonymizeDeep(input, [map]), rumuz: map.alias };
  const hedef = temizle(safe.hedef);
  const meb = input.mebHedefKod ? mebToPrompt({ hedefKod: input.mebHedefKod, davranisKodlari: input.mebDavranisKodlari }) : null;

  try {
    const { sonuc: rumuzlu, model, usage } = await hedefDenetle({
      hedef,
      baglam: { kademeYas: kademeYasMetni(input.kademe, input.yas), meb: meb ?? undefined },
    });
    const sonuc = dizgileriDonustur(rumuzlu, (s) => rehydrateText(s, [map]));
    await logUsage(accountId, model, usage); // admin maliyet görünümü; bakiye değişmez

    let docId: string | null = null;
    let caseId: string | null = null;
    try {
      const saved = await saveDocument(accountId, {
        code: input.rumuz,
        kademe: input.kademe,
        type: HEDEF_DENETIM_DOC_TYPE,
        content: denetimToMarkdown(temizle(input.hedef), sonuc),
        model,
        credits: 0,
        mebHedefKod: input.mebHedefKod,
        mebDavranisKodlari: input.mebDavranisKodlari,
      });
      docId = saved.docId;
      caseId = saved.caseId;
    } catch (err) {
      console.error("[atolye/hedef-denetcisi] doküman kaydı başarısız", err);
    }
    const kalan = Math.max(0, HEDEF_DENETIM_GUNLUK - (sayim + 1));
    return NextResponse.json({ sonuc, docId, caseId, kalan });
  } catch (err) {
    if (err instanceof DenetimHatasi) {
      console.warn("[atolye/hedef-denetcisi] denetim çözülemedi:", err.message);
      return NextResponse.json({ error: "Denetim üretilemedi. Tekrar deneyin." }, { status: 502 });
    }
    console.error("[atolye/hedef-denetcisi] denetim hatası", err);
    return NextResponse.json({ error: "Denetim yapılamadı. Tekrar deneyin." }, { status: 500 });
  }
}
