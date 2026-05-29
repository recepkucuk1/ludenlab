import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createCase } from "@/lib/cases";
import { KADEME_KEYS } from "@/lib/bep";

export const runtime = "nodejs";

const schema = z.object({
  code: z.string().trim().min(1, "Kod/rumuz gerekli").max(40),
  kademe: z.enum(KADEME_KEYS),
  notes: z.string().trim().max(4000).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Form geçersiz." }, { status: 422 });
  }
  const c = await createCase(session.user.id, parsed.data);
  return NextResponse.json({ ok: true, id: c.id });
}
