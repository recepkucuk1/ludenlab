import { NextResponse } from "next/server";
import { auth } from "@atolye/auth";
import { updateCase, deleteCase } from "@atolye/lib/cases";
import { studentPatchSchema } from "@atolye/lib/student";

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
  const parsed = studentPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Form geçersiz.",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 422 },
    );
  }
  const ok = await updateCase(session.user.id, id, parsed.data);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Öğrenci bulunamadı." }, { status: 404 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const { id } = await params;
  const ok = await deleteCase(session.user.id, id);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Öğrenci bulunamadı." }, { status: 404 });
}
