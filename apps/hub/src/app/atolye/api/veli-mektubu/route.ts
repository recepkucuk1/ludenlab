import { NextResponse } from "next/server";
import { auth } from "@atolye/auth";
import { runToolStreaming } from "@atolye/lib/generate";
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

  // Uzun üretim SSE-heartbeat ile döner — Safari 60 sn zaman aşımına takılmaz.
  return runToolStreaming(session.user.id, {
    input: parsed.data,
    type: "veli_mektubu",
    generate: () => generateVeliMektubu(parsed.data),
    logTag: "veli-mektubu",
    failMessage: "Mektup üretilemedi. Lütfen tekrar deneyin.",
  });
}
