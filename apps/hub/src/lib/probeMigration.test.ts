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
    for (const [ad, tablo] of [
      ["ProbeSeries_studentId_fkey", "Student"],
      ["ProbeSeries_therapistId_fkey", "Therapist"],
      ["ProbeRun_seriesId_fkey", "ProbeSeries"],
      ["ProbeRun_therapistId_fkey", "Therapist"],
    ] as const) {
      const re = new RegExp(`CONSTRAINT "${ad}"\\s+FOREIGN KEY \\("\\w+"\\) REFERENCES public\\."${tablo}"\\("id"\\) ON DELETE CASCADE`);
      expect(SQL, ad).toMatch(re);
    }
  });
  it("RLS iki tabloda açık; indeksler var", () => {
    expect(SQL).toContain('ALTER TABLE public."ProbeSeries" ENABLE ROW LEVEL SECURITY');
    expect(SQL).toContain('ALTER TABLE public."ProbeRun" ENABLE ROW LEVEL SECURITY');
    expect(SQL).toContain('"ProbeSeries_studentId_active_idx"');
    expect(SQL).toContain('"ProbeRun_seriesId_date_idx"');
  });
  it("aktif-anahtar kısmi tekil indeksi var (eşzamanlı çift aktif seriyi DB engeller)", () => {
    expect(SQL).toContain('"ProbeSeries_active_key_uidx"');
    expect(SQL).toContain('WHERE "active"');
  });
});
