import { Pool } from "pg";
import { readCentralEntitlement, type Entitlement } from "@ludenlab/billing";

/**
 * Merkezi billing DB (Studio Supabase, `billing` şeması) — SALT OKUMA (e-posta köprüsü).
 * atolye KENDİ klinik DB'sine (`ATOLYE_DATABASE_URL`) dokunmaz; bu AYRI bağlantı.
 * Tam SSO'dan önceki hafif model: atolye kullanıcısı → e-posta → merkezi Account → Subscription.
 * Prod öncesi: salt-okuma, least-privilege rol.
 */
let pool: Pool | null = null;
function centralPool(): Pool {
  if (!pool) {
    const url = process.env.CENTRAL_BILLING_DATABASE_URL ?? "";
    pool = new Pool({
      connectionString: url.replace(/[?&]schema=billing/, ""),
      ssl: url.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
      max: 2,
    });
  }
  return pool;
}

/** Bu e-postanın ATOLYE modülündeki merkezi abonelik durumu (allow/warn/choose). */
export async function centralEntitlement(email: string): Promise<Entitlement> {
  return readCentralEntitlement(
    (text, params) => centralPool().query(text, params),
    email,
    "ATOLYE",
  );
}
