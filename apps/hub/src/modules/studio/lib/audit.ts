import type { Prisma } from "@/generated/studio/client";
import { prisma } from "@studio/lib/db";
import { logError } from "@studio/lib/utils";

/**
 * Admin eylemleri ve ödeme webhook'ları için değiştirilmez denetim kaydı.
 *
 * Kayıt akışın bir yan etkisidir — kaydetme başarısız olursa ana işlem
 * kesilmez. Hata loglanır ve siz ön tarafa başarılı durumu göndermeye devam
 * edersiniz. (Prod'da bu loglar üzerinden alert kurulmalı.)
 *
 * `tx` parametresi verilirse aynı transaction içine yazılır — iyzico webhook
 * gibi "ya hep ya hiç" olması gereken akışlarda kritik.
 */
export type AuditInput = {
  /** İşlemi yapan terapist ID'si. Sistem/webhook kaynaklıysa null. */
  actorId: string | null;
  /** Nokta-ayrılmış kısa eylem kodu — örn. "plan.update", "credits.grant". */
  action: string;
  /** Etkilenen varlık türü — örn. "therapist", "subscription". */
  targetType: string;
  /** Etkilenen kayıt ID'si. */
  targetId: string;
  /** Önceki ve yeni değerler, opsiyonel. Hassas alan yazma. */
  diff?: Record<string, unknown>;
  /** İstemci IP'si, opsiyonel. */
  ip?: string | null;
};

export async function recordAudit(
  input: AuditInput,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const client = tx ?? prisma;
  try {
    await client.auditLog.create({
      data: {
        actorId:    input.actorId,
        action:     input.action,
        targetType: input.targetType,
        targetId:   input.targetId,
        diff:       (input.diff ?? null) as Prisma.InputJsonValue,
        ip:         input.ip ?? null,
      },
    });
  } catch (error) {
    // Audit yazım hatası ana akışı kesmemeli — sadece logla.
    // Transaction içindeysek bu hata transaction'ı rollback ettirmek isteyebilir;
    // o zaman caller tx'i geçmemeli veya throw'u kabul etmeli.
    logError("recordAudit", error);
    if (tx) throw error; // Transaction invariant'ını bozmayalım.
  }
}
