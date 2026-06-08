import "dotenv/config";
import { defineConfig } from "prisma/config";

// Merkezi billing/identity DB = Studio Supabase'i, `billing` şeması.
// CLI (generate) bunu kullanır; DDL raw SQL ile (prisma/sql/*.sql) uygulanır —
// `prisma migrate`/`db push` YOK (bkz. ROADMAP Prisma drift notu).
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env["HUB_DATABASE_URL"],
  },
});
