import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@atolye/auth";
import { getAccountBasics, isAdmin } from "@atolye/lib/admin";
import { prisma } from "@atolye/lib/db";
import { recordAudit } from "@atolye/lib/audit";
import { deleteAccountEverywhere } from "@/lib/accountDeletion";

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

  // Değişiklik ve denetim kaydı TEK işlemde (2026-09 denetimi #20): eskiden audit değişiklikten
  // SONRA ve best-effort yazılıyordu — kayıt düşerse iz bırakmayan bir yetki değişikliği kalırdı.
  await prisma.$transaction(async (tx) => {
    if (role !== undefined && role !== target.role) {
      await tx.account.update({ where: { id }, data: { role } });
      await tx.auditLog.create({
        data: {
          actorId: me,
          action: "role.change",
          targetType: "account",
          targetId: id,
          diff: { from: target.role, to: role },
          ip,
        },
      });
    }
    if (suspended !== undefined && suspended !== target.suspended) {
      await tx.account.update({ where: { id }, data: { suspended } });
      await tx.auditLog.create({
        data: {
          actorId: me,
          action: suspended ? "account.suspend" : "account.unsuspend",
          targetType: "account",
          targetId: id,
          diff: { email: target.email },
          ip,
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await adminUserId();
  if (!me) return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  const { id } = await params;
  if (id === me) return NextResponse.json({ error: "Kendi hesabınızı silemezsiniz." }, { status: 400 });

  const target = await getAccountBasics(id);
  if (!target?.email) return NextResponse.json({ error: "Hesap bulunamadı." }, { status: 404 });

  // TAM SİLME (denetim #03): eskiden yalnız atölye satırı siliniyordu — merkezi hesap,
  // kart referansı ve TCKN kalıyor, kullanıcı tekrar girince self-heal diriltiyordu.
  // Artık iyzico aboneliği iptal edilir → fatura kimliği saklanır → 3 DB'den silinir.
  const result = await deleteAccountEverywhere(target.email, { deletedBy: "admin", actorId: me });
  if (!result.ok) {
    const status = result.reason === "not_found" ? 404 : 502;
    return NextResponse.json({ error: result.message }, { status });
  }

  await recordAudit({
    actorId: me,
    action: "account.delete",
    targetType: "account",
    targetId: id,
    diff: {
      email: target.email,
      silinen: result.deleted,
      not: "Payment kayıtları VUK gereği KORUNDU (invoiceSnapshot'a kimlik kopyalandı).",
    },
    ip: clientIp(req),
  });
  return NextResponse.json({ ok: true, deleted: result.deleted });
}
