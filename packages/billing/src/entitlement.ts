/* ============================================================
   Abonelik durumu → erişim kararı (DB-AGNOSTİK, saf fonksiyon).
   Consumer (hub ya da modül) DB'den Subscription'ı okur → bunu çağırır.
   Böylece erişim mantığı tek yerde; her modül aynı kararı verir.
   ============================================================ */

export type EntitlementStatus =
  | "PENDING"
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "EXPIRED";

/** allow: tam erişim · warn: erişim + "ödeme güncelle" bandı · choose: plan seçimine yolla */
export type EntitlementAccess = "allow" | "warn" | "choose";

export interface Entitlement {
  active: boolean; // erişim var mı (allow | warn)
  access: EntitlementAccess;
  status: EntitlementStatus | "NONE";
  currentPeriodEnd: Date | null;
}

/** Subscription durumu → erişim kararı. (Durum webhook ile güncel tutulur — otoriter.) */
export function resolveEntitlement(
  sub: { status: EntitlementStatus; currentPeriodEnd: Date | null } | null,
): Entitlement {
  if (!sub) return { active: false, access: "choose", status: "NONE", currentPeriodEnd: null };
  switch (sub.status) {
    case "ACTIVE":
    case "TRIAL":
      return { active: true, access: "allow", status: sub.status, currentPeriodEnd: sub.currentPeriodEnd };
    case "PAST_DUE":
      // grace: erişim sürer ama "ödeme güncelle" bandı gösterilir (apex /odeme).
      return { active: true, access: "warn", status: sub.status, currentPeriodEnd: sub.currentPeriodEnd };
    default: // PENDING | CANCELED | EXPIRED
      return { active: false, access: "choose", status: sub.status, currentPeriodEnd: sub.currentPeriodEnd };
  }
}

/**
 * Modüllerin merkezi entitlement'ı OKUMASI için (e-posta köprüsü, direct central-DB read).
 * `query` = pg-uyumlu `(text, params) => { rows }`; modül kendi pg client'ının query'sini verir
 * (paket pg'ye bağımlı değil — DI). SQL `billing` şeması-qualified → search_path bağımsız.
 * Modül kullanıcısını e-posta ile merkezi Account'a, oradan Subscription'a bağlar.
 */
export async function readCentralEntitlement(
  query: (
    text: string,
    params: unknown[],
  ) => Promise<{ rows: Array<{ status: EntitlementStatus; currentPeriodEnd: Date | null }> }>,
  email: string,
  module: "STUDIO" | "ATOLYE" | "BRYTAKIP",
): Promise<Entitlement> {
  const { rows } = await query(
    `SELECT s."status", s."currentPeriodEnd"
       FROM billing."Account" a
       JOIN billing."Subscription" s
         ON s."accountId" = a."id" AND s."module"::text = $2
      WHERE a."email" = $1
      ORDER BY s."createdAt" DESC
      LIMIT 1`,
    [email.toLowerCase().trim(), module],
  );
  return resolveEntitlement(rows[0] ?? null);
}
