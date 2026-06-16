import { NextResponse } from "next/server";
import { estimateCredits } from "@ludenlab/ai";
import { auth } from "@atolye/auth";
import { withCredits } from "@atolye/lib/credits";
import { okumaInputSchema } from "@atolye/lib/okuma";
import { generateOkuma } from "@atolye/lib/okuma-prompts";

export const runtime = "nodejs";
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

  const parsed = okumaInputSchema.safeParse(body);
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
    const charged = await withCredits(session.user.id, () => generateOkuma(parsed.data));
    if (!charged.ok) return NextResponse.json({ error: charged.error }, { status: charged.status });
    const result = charged.result;
    return NextResponse.json({
      text: result.text,
      model: result.model,
      credits: estimateCredits(result.model, result.usage),
      creditsLeft: charged.balance,
    });
  } catch (err) {
    console.error("[atolye/okuma] üretim hatası", err);
    return NextResponse.json(
      { error: "Set üretilemedi. Lütfen tekrar deneyin." },
      { status: 500 },
    );
  }
}
