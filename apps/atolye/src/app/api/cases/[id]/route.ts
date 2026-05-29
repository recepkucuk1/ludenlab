import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { updateCase, deleteCase } from "@/lib/cases";
import { KADEME_KEYS } from "@/lib/bep";

export const runtime = "nodejs";

const patchSchema = z.object({
  code: z.string().trim().min(1).max(40).optional(),
  kademe: z.enum(KADEME_KEYS).optional(),
  notes: z.string().trim().max(4000).optional(),
});

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
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Form geçersiz." }, { status: 422 });
  const ok = await updateCase(session.user.id, id, parsed.data);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Vaka bulunamadı." }, { status: 404 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const { id } = await params;
  const ok = await deleteCase(session.user.id, id);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Vaka bulunamadı." }, { status: 404 });
}
