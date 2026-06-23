import { NextResponse } from "next/server";
import { auth } from "@atolye/auth";
import { deleteDocument, getDocument } from "@atolye/lib/cases";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const { id } = await params;
  const doc = await getDocument(session.user.id, id);
  if (!doc) return NextResponse.json({ error: "Doküman bulunamadı." }, { status: 404 });
  return NextResponse.json({
    id: doc.id,
    type: doc.type,
    content: doc.content,
    model: doc.model,
    credits: doc.credits,
    createdAt: doc.createdAt.toISOString(),
    caseId: doc.case.id,
    code: doc.case.code,
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const { id } = await params;
  const ok = await deleteDocument(session.user.id, id);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Doküman bulunamadı." }, { status: 404 });
}
