import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/* Veli bağlantısı migration'ı (spec 2026-11-05 §4). Hesap/öğrenci silme CASCADE'e dayanır (0020 dersi: kısıt bazlı
   regex, pencere değil). Mevcut tabloya sütun eklediği için deploy sırası ZORUNLU: önce SQL, sonra kod. */
const RAW = readFileSync(path.resolve(import.meta.dirname, "../../prisma/sql/0021_parent_link.sql"), "utf8");
/* `--` satır yorumları atılır: yorumlanmış bir ifade testi geçirmesin. */
const SQL = RAW.replace(/^\s*--.*$/gm, "");

describe("0021_parent_link.sql", () => {
  it("ParentLink idempotent; iki FK CASCADE; token unique; öğrenci başına tek aktif; RLS", () => {
    expect(SQL).toContain('CREATE TABLE IF NOT EXISTS public."ParentLink"');
    for (const [ad, kolon, tablo] of [["ParentLink_studentId_fkey", "studentId", "Student"], ["ParentLink_therapistId_fkey", "therapistId", "Therapist"]] as const) {
      const re = new RegExp(`CONSTRAINT "${ad}"\\s+FOREIGN KEY \\("${kolon}"\\) REFERENCES public\\."${tablo}"\\("id"\\) ON DELETE CASCADE`);
      expect(SQL, ad).toMatch(re);
    }
    expect(SQL).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS "ParentLink_token_key"\s+ON public\."ParentLink" \("token"\)/);
    expect(SQL).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS "ParentLink_student_active_uidx"\s+ON public\."ParentLink" \("studentId"\)\s+WHERE "active";/);
    expect(SQL).toContain('ALTER TABLE public."ParentLink" ENABLE ROW LEVEL SECURITY');
  });
  it("StudentObservation'a source (DEFAULT 'therapist') ve meta sütunları idempotent eklenir", () => {
    expect(SQL).toMatch(/ALTER TABLE public\."StudentObservation" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'therapist'/);
    expect(SQL).toMatch(/ALTER TABLE public\."StudentObservation" ADD COLUMN IF NOT EXISTS "meta" JSONB/);
    expect(SQL).toContain('"StudentObservation_studentId_source_createdAt_idx"');
  });
});
