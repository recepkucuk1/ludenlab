import { NextResponse } from "next/server";
import { auth } from "@atolye/auth";
import { runToolStreaming } from "@atolye/lib/generate";
import { bepInputSchema } from "@atolye/lib/bep";
import { generateBep } from "@atolye/lib/bep-prompts";

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

  // Uzun üretim SSE-heartbeat ile döner — Safari 60 sn zaman aşımına takılmaz.
  return runToolStreaming(session.user.id, {
    input: parsed.data,
    type: "bep_hedef",
    generate: () => generateBep(parsed.data),
    logTag: "bep",
    failMessage: "Taslak üretilemedi. Lütfen tekrar deneyin.",
  });
}
