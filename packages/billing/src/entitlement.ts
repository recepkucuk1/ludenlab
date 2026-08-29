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

/**
 * Ödeme BAŞARISIZ olduktan sonra erişimin süreceği ek gün — "dunning" penceresi
 * (2026-08 denetimi #24).
 *
 * SORUN: `PAST_DUE` süresiz `warn` (erişim açık) veriyordu ve bu durumdan ÇIKIŞ yolu yoktu:
 * sweep cron'u PAST_DUE'ya bakmıyor, webhook ancak iyzico `cancelled/expired` gönderirse
 * durumu değiştiriyordu. Yani kartı kalıcı olarak başarısız olan bir hesap ücretli erişimini
 * SÜRESİZ sürdürüyordu (modül tarafında `planType` da hiç düşmüyordu).
 *
 * ÇÖZÜM: grace penceresi son ÖDENMİŞ dönemin sonundan itibaren sayılır. Pencere içinde
 * erişim + "ödeme güncelle" bandı sürer (müşteri kartını güncelleyebilsin); pencere dolunca
 * erişim kapanır. 7 gün, sektörde yaygın dunning süresidir ve tek başarısız çekim ile
 * kalıcı ödeme sorununu ayırt etmeye yeter.
 */
export const PAST_DUE_GRACE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** pg/Prisma Date döndürür; yine de string/number gelirse güvenle Date'e çevir (asla fırlatma). */
function toDate(v: Date | string | number | null | undefined): Date | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * PAST_DUE aboneliğin grace penceresi DOLDU mu? (dolduysa erişim kapanmalı)
 *
 * `currentPeriodEnd` YOKSA `true` döner (fail-closed): ACTIVE'e geçen her yol dönem sonunu
 * yazar, dolayısıyla "PAST_DUE + dönem sonu yok" = hiç başarılı tahsilat olmamış demektir.
 * Ödenmiş dönem kanıtı olmadan ücretli erişim verilmez.
 */
export function isPastDueExpired(
  currentPeriodEnd: Date | string | number | null | undefined,
  now: Date = new Date(),
): boolean {
  const end = toDate(currentPeriodEnd);
  if (!end) return true;
  return now.getTime() > end.getTime() + PAST_DUE_GRACE_DAYS * DAY_MS;
}

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
  now: Date = new Date(),
): Entitlement {
  if (!sub) return { active: false, access: "choose", status: "NONE", currentPeriodEnd: null };
  switch (sub.status) {
    case "ACTIVE":
    case "TRIAL":
      return { active: true, access: "allow", status: sub.status, currentPeriodEnd: sub.currentPeriodEnd };
    case "PAST_DUE":
      // Grace SÜRELİDİR (denetim #24): pencere içinde erişim sürer ama "ödeme güncelle"
      // bandı gösterilir (apex /odeme); pencere dolunca erişim kapanır.
      if (isPastDueExpired(sub.currentPeriodEnd, now)) {
        return { active: false, access: "choose", status: sub.status, currentPeriodEnd: sub.currentPeriodEnd };
      }
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
