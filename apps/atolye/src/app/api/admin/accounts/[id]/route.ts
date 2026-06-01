import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  deleteAccount,
  getAccountBasics,
  isAdmin,
  setAccountRole,
  setAccountSuspended,
} from "@/lib/admin";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

async function adminUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.role)) return null;
  return session.user.id;
}

function clientIp(req: Request): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

const patchSchema = z
  .object({
    role: z.enum(["practitioner", "admin"]).optional(),
    suspended: z.boolean().optional(),
  })
  .refine((d) => d.role !== undefined || d.suspended !== undefined, {
    message: "role veya suspended gerekli",
  });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await adminUserId();
  if (!me) return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  const { id } = await params;
  if (id === me)
    return NextResponse.json({ error: "Kendi hesabınızı değiştiremezsiniz." }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz veri." }, { status: 422 });

  const target = await getAccountBasics(id);
  if (!target) return NextResponse.json({ error: "Hesap bulunamadı." }, { status: 404 });

  const ip = clientIp(req);
  const { role, suspended } = parsed.data;

  if (role !== undefined && role !== target.role) {
    await setAccountRole(id, role);
    await recordAudit({
      actorId: me,
      action: "role.change",
      targetType: "account",
      targetId: id,
      diff: { from: target.role, to: role },
      ip,
    });
  }
  if (suspended !== undefined && suspended !== target.suspended) {
    await setAccountSuspended(id, suspended);
    await recordAudit({
      actorId: me,
      action: suspended ? "account.suspend" : "account.unsuspend",
      targetType: "account",
      targetId: id,
      diff: { email: target.email },
      ip,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await adminUserId();
  if (!me) return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  const { id } = await params;
  if (id === me) return NextResponse.json({ error: "Kendi hesabınızı silemezsiniz." }, { status: 400 });

  const target = await getAccountBasics(id);
  await deleteAccount(id);
  await recordAudit({
    actorId: me,
    action: "account.delete",
    targetType: "account",
    targetId: id,
    diff: { email: target?.email ?? null },
    ip: clientIp(req),
  });
  return NextResponse.json({ ok: true });
}
