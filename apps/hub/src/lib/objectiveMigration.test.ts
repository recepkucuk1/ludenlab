import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/* Hedef denetçisi 1c-B (spec §5.2): StudentProgress'e üç sütun. Mevcut tabloya sütun eklediği için deploy sırası
   ZORUNLU: önce SQL, sonra kod. `--` yorumları atılır: yorumlanmış ifade testi geçirmesin. */
const RAW = readFileSync(path.resolve(import.meta.dirname, "../../prisma/sql/0022_objective.sql"), "utf8");
const SQL = RAW.replace(/^\s*--.*$/gm, "");

describe("0022_objective.sql", () => {
  it("üç sütun idempotent eklenir; tablo oluşturulmaz; indeks yok", () => {
    expect(SQL).toMatch(/ALTER TABLE public\."StudentProgress" ADD COLUMN IF NOT EXISTS "objective" TEXT;/);
    expect(SQL).toMatch(/ALTER TABLE public\."StudentProgress" ADD COLUMN IF NOT EXISTS "objectiveAudit" JSONB;/);
    expect(SQL).toMatch(/ALTER TABLE public\."StudentProgress" ADD COLUMN IF NOT EXISTS "objectiveAuditedAt" TIMESTAMP\(3\);/);
    expect(SQL).not.toMatch(/CREATE TABLE/);
    expect(SQL).not.toMatch(/CREATE (UNIQUE )?INDEX/);
  });
  it("başlık yorumu deploy sırasını ve geri almayı söyler", () => {
    expect(RAW).toContain("DEPLOY SIRASI: ÖNCE bu SQL, SONRA kod");
    expect(RAW).toMatch(/GERİ ALMA: ALTER TABLE public\."StudentProgress" DROP COLUMN "objectiveAuditedAt", DROP COLUMN "objectiveAudit", DROP COLUMN "objective";/);
  });
});
