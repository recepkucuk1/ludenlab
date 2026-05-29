import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSession, listSessions, sessionSchema } from "@/lib/sessions";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "from/to gerekli." }, { status: 400 });
  const sessions = await listSessions(session.user.id, from, to);
  return NextResponse.json({ sessions });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const parsed = sessionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Form geçersiz." }, { status: 422 });
  const s = await createSession(session.user.id, parsed.data);
  return NextResponse.json({ ok: true, id: s.id });
}
