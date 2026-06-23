import { NextResponse } from "next/server";
import { auth } from "@atolye/auth";
import { runTool } from "@atolye/lib/generate";
import { ilerlemeCizelgesiInputSchema } from "@atolye/lib/ilerleme-cizelgesi";
import { generateIlerlemeCizelgesi } from "@atolye/lib/ilerleme-cizelgesi-prompts";

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

  const parsed = ilerlemeCizelgesiInputSchema.safeParse(body);
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
    const out = await runTool(session.user.id, {
      input: parsed.data,
      type: "ilerleme_cizelgesi",
      generate: () => generateIlerlemeCizelgesi(parsed.data),
    });
    if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status });
    return NextResponse.json(out.data);
  } catch (err) {
    console.error("[atolye/ilerleme-cizelgesi] üretim hatası", err);
    return NextResponse.json(
      { error: "Çizelge üretilemedi. Lütfen tekrar deneyin." },
      { status: 500 },
    );
  }
}
