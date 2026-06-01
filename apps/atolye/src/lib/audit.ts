import { Prisma } from "@prisma/client";
import { prisma } from "./db";

/* Yönetsel işlem izi. recordAudit ASLA ana akışı bozmaz (hata yutulur, loglanır). */

export const AUDIT_LABEL: Record<string, string> = {
  "role.change": "Rol değiştirildi",
  "account.suspend": "Hesap askıya alındı",
  "account.unsuspend": "Askı kaldırıldı",
  "account.delete": "Hesap silindi",
};
export const auditLabel = (action: string): string => AUDIT_LABEL[action] ?? action;

export interface AuditInput {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  diff?: Prisma.InputJsonValue;
  ip?: string | null;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        diff: input.diff,
        ip: input.ip ?? null,
      },
    });
  } catch (e) {
    console.error("[audit] kaydedilemedi:", input.action, e);
  }
}

export async function listAudit(take = 100) {
  const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take });
  const actorIds = [...new Set(rows.map((r) => r.actorId).filter((x): x is string => !!x))];
  const actors = actorIds.length
    ? await prisma.account.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, email: true, name: true },
      })
    : [];
  const map = new Map(actors.map((a) => [a.id, a]));
  return rows.map((r) => ({ ...r, actor: r.actorId ? (map.get(r.actorId) ?? null) : null }));
}
