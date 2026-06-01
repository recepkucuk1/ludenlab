import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { deleteAccount, isAdmin, setAccountRole } from "@/lib/admin";

export const runtime = "nodejs";

/** Admin oturumundaki kullanıcı id'si, yetkisizse null. */
async function adminUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.role)) return null;
  return session.user.id;
}

const patchSchema = z.object({ role: z.enum(["practitioner", "admin"]) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await adminUserId();
  if (!me) return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  const { id } = await params;
  if (id === me) return NextResponse.json({ error: "Kendi rolünüzü değiştiremezsiniz." }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz rol." }, { status: 422 });

  await setAccountRole(id, parsed.data.role);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await adminUserId();
  if (!me) return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  const { id } = await params;
  if (id === me) return NextResponse.json({ error: "Kendi hesabınızı silemezsiniz." }, { status: 400 });

  await deleteAccount(id);
  return NextResponse.json({ ok: true });
}
