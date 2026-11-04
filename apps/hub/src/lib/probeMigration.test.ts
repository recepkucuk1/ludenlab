// apps/hub/src/lib/probeMigration.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/* Ölçüm probu migration'ı (spec 2026-11-04 §4): hesap silme `therapist.deleteMany` ile siler ve tabloları
   saymaz → yeni tablolar Therapist/Student FK'lerinde ON DELETE CASCADE taşımak ZORUNDA. RLS deny-all,
   idempotent (IF NOT EXISTS) — 0019 ile aynı kalıp. */
const SQL = readFileSync(path.resolve(import.meta.dirname, "../../prisma/sql/0020_probe.sql"), "utf8");

describe("0020_probe.sql", () => {
  it("iki tabloyu idempotent oluşturur", () => {
    expect(SQL).toContain('CREATE TABLE IF NOT EXISTS public."ProbeSeries"');
    expect(SQL).toContain('CREATE TABLE IF NOT EXISTS public."ProbeRun"');
  });
  it("hesap/öğrenci silmede CASCADE: ProbeSeries→Student, ProbeSeries→Therapist, ProbeRun→ProbeSeries, ProbeRun→Therapist", () => {
    for (const ad of ["ProbeSeries_studentId_fkey", "ProbeSeries_therapistId_fkey", "ProbeRun_seriesId_fkey", "ProbeRun_therapistId_fkey"]) {
      const i = SQL.indexOf(ad);
      expect(i, ad).toBeGreaterThan(-1);
      expect(SQL.slice(i, i + 260), ad).toMatch(/ON DELETE CASCADE/);
    }
  });
  it("RLS iki tabloda açık; indeksler var", () => {
    expect(SQL).toContain('ALTER TABLE public."ProbeSeries" ENABLE ROW LEVEL SECURITY');
    expect(SQL).toContain('ALTER TABLE public."ProbeRun" ENABLE ROW LEVEL SECURITY');
    expect(SQL).toContain('"ProbeSeries_studentId_active_idx"');
    expect(SQL).toContain('"ProbeRun_seriesId_date_idx"');
  });
});
