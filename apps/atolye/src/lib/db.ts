import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.ATOLYE_DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * RLS-kapsamlı sorgu. Oturum açan uzmanın kimliğini transaction-local olarak
 * yazar (`app.current_account_id`), böylece RLS politikaları yalnız o uzmanın
 * klinik verisini görür. Klinik veriye erişen TÜM sorgular bundan geçmeli.
 */
export function withRls<T>(
  accountId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_account_id', ${accountId}, true)`;
    return fn(tx);
  });
}
