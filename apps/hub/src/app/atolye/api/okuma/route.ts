import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/bodyLimit";
import { auth } from "@atolye/auth";
import { runToolStreaming } from "@atolye/lib/generate";
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

  // Gövde SAYARAK okunur (denetim #29): sınırsız gövde bellek + token maliyetiydi.
  const read = await readJsonBody(req);
  if (!read.ok) return NextResponse.json({ error: read.error }, { status: read.status });
  const body: unknown = read.data;

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

  // Uzun üretim SSE-heartbeat ile döner — Safari 60 sn zaman aşımına takılmaz.
  return runToolStreaming(session.user.id, {
    input: parsed.data,
    type: "okuma_akicilik_seti",
    generate: (safe) => generateOkuma(safe),
    logTag: "okuma",
    failMessage: "Set üretilemedi. Lütfen tekrar deneyin.",
  });
}
