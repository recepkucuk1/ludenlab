import { NextResponse } from "next/server";
import { auth } from "@atolye/auth";
import { runTool } from "@atolye/lib/generate";
import { veliMektubuInputSchema } from "@atolye/lib/veli-mektubu";
import { generateVeliMektubu } from "@atolye/lib/veli-mektubu-prompts";

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

  const parsed = veliMektubuInputSchema.safeParse(body);
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
      type: "veli_mektubu",
      generate: () => generateVeliMektubu(parsed.data),
    });
    if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status });
    return NextResponse.json(out.data);
  } catch (err) {
    console.error("[atolye/veli-mektubu] üretim hatası", err);
    return NextResponse.json(
      { error: "Mektup üretilemedi. Lütfen tekrar deneyin." },
      { status: 500 },
    );
  }
}
