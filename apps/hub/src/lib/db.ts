import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { pgSsl } from "@/lib/dbSsl";

/**
 * Merkezi billing/identity DB = Studio Supabase'i, `billing` ŞEMASI.
 * adapter-pg + { schema: "billing" } → tüm sorgular `billing.*` olarak nitelenir;
 * Studio'nun `public` tabloları GÖRÜNMEZ/DOKUNULMAZ. Şema DDL'i prisma/sql/*.sql
 * ile (raw, pg) uygulanır — prisma migrate/db push YOK.
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createClient() {
  const url = process.env.HUB_DATABASE_URL;
  const adapter = new PrismaPg(
    { connectionString: url, ssl: pgSsl(url) },
    { schema: "billing" },
  );
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
