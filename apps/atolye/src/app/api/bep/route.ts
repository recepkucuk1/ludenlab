import { NextResponse } from "next/server";
import { estimateCredits } from "@ludenlab/ai";
import { auth } from "@/auth";
import { bepInputSchema } from "@/lib/bep";
import { generateBep } from "@/lib/bep-prompts";

export const runtime = "nodejs";
// Hostinger Node app'te no-op; serverless platformlarda üretim süresi tamponu.
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bu işlem için giriş yapmalısınız." }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Sunucu yapılandırması eksik (ANTHROPIC_API_KEY)." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const parsed = bepInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Form geçersiz.",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 422 },
    );
  }

  try {
    const result = await generateBep(parsed.data);
    return NextResponse.json({
      text: result.text,
      credits: estimateCredits(result.model, result.usage),
    });
  } catch (err) {
    console.error("[atolye/bep] üretim hatası", err);
    return NextResponse.json(
      { error: "Taslak üretilemedi. Lütfen tekrar deneyin." },
      { status: 500 },
    );
  }
}
