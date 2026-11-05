// apps/hub/src/app/atolye/api/hedef-denetcisi/route.ts
import { NextResponse } from "next/server";
import { pickAlias, pseudonymizeText, rehydrateText, type NameMapping } from "@ludenlab/ai";
import { readJsonBody } from "@/lib/bodyLimit";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { trGunBaslangici } from "@/lib/trZaman";
import { HEDEF_DENETIM_GUNLUK, HEDEF_DENETIM_SINIR_METNI, alintiGecerli, denetimToMarkdown, dizgileriDonustur, temizle } from "@/lib/hedefDenetimi";
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

  // ÇOCUK PII: önce görünmez/bidi karakterleri sök, SONRA rumuzla ("Ar\u00ADda" aliastan sonra "Arda"ya dönmesin).
  const gercekHedef = temizle(input.hedef);
  if (!gercekHedef) {
    return NextResponse.json({ error: "Form geçersiz.", issues: [{ path: "hedef", message: "Hedef boş olamaz" }] }, { status: 422 });
  }

  const rl = rateLimit(`hedef-denetim:${accountId}`, DAKIKALIK);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter);
  // 24 saatlik bellek-içi maliyet tavanı (silme döngüsü / başarısız kayıt / açık sayım); kullanıcıya görünen sınır 10/gün.
  const gun = rateLimit(`hedef-denetim-gun:${accountId}`, HEDEF_DENETIM_GUNLUK * 2, 86_400_000);
  if (!gun.allowed) return NextResponse.json({ error: HEDEF_DENETIM_SINIR_METNI, code: "DAILY_CAP" }, { status: 429 });

  const sayim = await bugunkuSayim(accountId);
  if (sayim >= HEDEF_DENETIM_GUNLUK) {
    return NextResponse.json({ error: HEDEF_DENETIM_SINIR_METNI, code: "DAILY_CAP" }, { status: 429 });
  }

  const map: NameMapping = { real: input.rumuz, alias: pickAlias(input.rumuz, { scope: accountId }) };
  const hedef = pseudonymizeText(gercekHedef, [map]);
  const meb = input.mebHedefKod ? mebToPrompt({ hedefKod: input.mebHedefKod, davranisKodlari: input.mebDavranisKodlari }) : null;

  try {
    const { sonuc: rumuzlu, model, usage } = await hedefDenetle({
      hedef,
      baglam: { kademeYas: kademeYasMetni(input.kademe, input.yas), meb: meb ?? undefined },
    });
    const sonuc = dizgileriDonustur(rumuzlu, (s) => rehydrateText(s, [map]));
    // Alıntı, kullanıcının yazdığı hedefin parçası kalmalı: tam ad yerine hedefte geçen ad parçası dene.
    const parcalar = input.rumuz.split(/\s+/).filter(Boolean);
    const parcaAdaylari = parcalar.length >= 2 ? parcalar : [];
    for (const k of Object.keys(sonuc.bilesenler) as (keyof typeof sonuc.bilesenler)[]) {
      const a = rumuzlu.bilesenler[k].alinti;
      if (!a) continue;
      const adaylar = [rehydrateText(a, [map]), ...parcaAdaylari.map((p) => rehydrateText(a, [{ real: p, alias: map.alias }]))];
      sonuc.bilesenler[k].alinti = adaylar.find((c) => alintiGecerli(gercekHedef, c)) ?? adaylar[0]!;
    }
    await logUsage(accountId, model, usage); // admin maliyet görünümü; bakiye değişmez

    let docId: string | null = null;
    let caseId: string | null = null;
    try {
      const saved = await saveDocument(accountId, {
        code: input.rumuz,
        kademe: input.kademe,
        type: HEDEF_DENETIM_DOC_TYPE,
        content: denetimToMarkdown(gercekHedef, sonuc),
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
    const kalan = Math.max(0, HEDEF_DENETIM_GUNLUK - (docId ? sayim + 1 : sayim));
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
