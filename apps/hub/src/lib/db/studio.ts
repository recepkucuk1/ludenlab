import { PrismaClient } from "@/generated/studio/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Studio domain DB = Studio Supabase `public` (Therapist/Student/Card/Lesson/...).
 * Merkezi billing DB'sinden (lib/db.ts) AYRI. Runtime url = STUDIO_DATABASE_URL.
 */
const g = globalThis as unknown as { studioDb: PrismaClient | undefined };

function create() {
  const url = process.env.STUDIO_DATABASE_URL;
  const adapter = new PrismaPg({
    connectionString: url,
    ssl: url?.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const studioDb = g.studioDb ?? create();
if (process.env.NODE_ENV !== "production") g.studioDb = studioDb;
