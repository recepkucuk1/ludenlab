import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteSession, findConflict, updateSession, sessionSchema } from "@/lib/sessions";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const parsed = sessionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Form geçersiz." }, { status: 422 });
  if (await findConflict(session.user.id, parsed.data, id)) {
    return NextResponse.json({ error: "Bu saat aralığında çakışan bir seans var." }, { status: 409 });
  }
  const ok = await updateSession(session.user.id, id, parsed.data);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Seans bulunamadı." }, { status: 404 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const { id } = await params;
  const ok = await deleteSession(session.user.id, id);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Seans bulunamadı." }, { status: 404 });
}
