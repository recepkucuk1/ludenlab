import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Merkezi billing/identity DB = Studio Supabase'i, `billing` ŞEMASI.
 * adapter-pg + { schema: "billing" } → tüm sorgular `billing.*` olarak nitelenir;
 * Studio'nun `public` tabloları GÖRÜNMEZ/DOKUNULMAZ. Şema DDL'i prisma/sql/*.sql
 * ile (raw, pg) uygulanır — prisma migrate/db push YOK.
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createClient() {
  const url = process.env.HUB_DATABASE_URL;
  // Supabase pooler özel CA → TLS aç, zinciri doğrulama (atolye reçetesi).
  const useSsl = url?.includes("supabase.com");
  const adapter = new PrismaPg(
    { connectionString: url, ssl: useSsl ? { rejectUnauthorized: false } : undefined },
    { schema: "billing" },
  );
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
