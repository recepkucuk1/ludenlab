import { PrismaClient, type Prisma } from "@/generated/atolye/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Atölye KLİNİK DB = AYRI Supabase (ATOLYE_DATABASE_URL) + RLS. Studio/billing DB'sinden
 * İZOLE (çocuk verisi; ROADMAP kilitli karar). Runtime url = ATOLYE_DATABASE_URL.
 */
const g = globalThis as unknown as { atolyeDb: PrismaClient | undefined };

function create() {
  const url = process.env.ATOLYE_DATABASE_URL;
  const adapter = new PrismaPg({
    connectionString: url,
    ssl: url?.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const atolyeDb = g.atolyeDb ?? create();
if (process.env.NODE_ENV !== "production") g.atolyeDb = atolyeDb;

/**
 * RLS-kapsamlı sorgu — oturum açan uzmanın kimliğini transaction-local yazar
 * (`app.current_account_id`); klinik veriye erişen TÜM sorgular bundan geçmeli.
 */
export function withRls<T>(
  accountId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return atolyeDb.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_account_id', ${accountId}, true)`;
    return fn(tx);
  });
}
