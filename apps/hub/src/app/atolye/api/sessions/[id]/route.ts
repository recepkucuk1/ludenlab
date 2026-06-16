import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  cancelOccurrence,
  deleteSession,
  findConflict,
  sessionSchema,
  updateSession,
  upsertException,
} from "@atolye/lib/sessions";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const { id } = await params;
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");
  const date = url.searchParams.get("date");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const parsed = sessionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Form geçersiz." }, { status: 422 });

  // Tekrar eden seansın TEK occurrence'ı → exception (override), seriyi etkilemez
  if (scope === "this" && date) {
    const ok = await upsertException(session.user.id, id, date, {
      title: parsed.data.title,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      status: parsed.data.status ?? null,
      note: parsed.data.note ?? null,
    });
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Seans bulunamadı." }, { status: 404 });
  }

  // Tüm seri / tek seferlik → tam güncelleme (çakışma kontrollü)
  if (await findConflict(session.user.id, parsed.data, id)) {
    return NextResponse.json({ error: "Bu saat aralığında çakışan bir seans var." }, { status: 409 });
  }
  const ok = await updateSession(session.user.id, id, parsed.data);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Seans bulunamadı." }, { status: 404 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const { id } = await params;
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");
  const date = url.searchParams.get("date");

  // Tekrar eden seansın tek occurrence'ını iptal et (seriyi silmeden)
  if (scope === "this" && date) {
    const ok = await cancelOccurrence(session.user.id, id, date);
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Seans bulunamadı." }, { status: 404 });
  }

  const ok = await deleteSession(session.user.id, id);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Seans bulunamadı." }, { status: 404 });
}
