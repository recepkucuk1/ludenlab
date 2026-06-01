import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { saveDocument } from "@/lib/cases";

export const runtime = "nodejs";

const schema = z.object({
  code: z.string().trim().min(1, "Öğrenci adı gerekli").max(120),
  kademe: z.string().trim().min(1).max(40),
  type: z.string().trim().min(1).max(40),
  content: z.string().min(1).max(40000),
  model: z.string().trim().max(60).default("claude-sonnet-4-6"),
  credits: z.coerce.number().int().min(0).default(0),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bu işlem için giriş yapmalısınız." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Geçersiz veri.",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 422 },
    );
  }

  try {
    const res = await saveDocument(session.user.id, parsed.data);
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    console.error("[atolye/cases/save] hata", err);
    return NextResponse.json({ error: "Kaydedilemedi. Lütfen tekrar deneyin." }, { status: 500 });
  }
}
