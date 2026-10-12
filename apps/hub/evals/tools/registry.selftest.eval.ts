// apps/hub/evals/tools/registry.selftest.eval.ts
import "../mocks.setup";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { CaseDef } from "../lib/core";
import { resolveFixture } from "../lib/fixtures";
import { TOOL_IDS, loadAdapter } from "./registry";

/* Kayıt defteri bütünlüğü: 21 araç, her kimlik yüklenir ve kendi kimliğini taşır, her aracın vaka dosyası beklenen sayıda vaka içerir
   (artikülasyon 16, diğerleri 4) ve her vakanın fikstürü çözülür (öğrencisiz vaka `student: null`). */

describe("araç kayıt defteri", () => {
  it("21 araç (10 Studio + 11 Atölye), kimlikler benzersiz", () => {
    expect(TOOL_IDS).toHaveLength(21);
    expect(new Set(TOOL_IDS).size).toBe(TOOL_IDS.length);
    expect(TOOL_IDS.filter((id) => id.startsWith("studio/"))).toHaveLength(10);
    expect(TOOL_IDS.filter((id) => id.startsWith("atolye/"))).toHaveLength(11);
  });

  it.each(TOOL_IDS)("%s: yüklenir, kimlik/modül tutarlı; vaka sayısı beklenen; her vakanın fikstürü çözülür; vaka kimlikleri benzersiz", async (id) => {
    const adapter = await loadAdapter(id);
    expect(adapter.id).toBe(id);
    expect(id.startsWith(`${adapter.module}/`)).toBe(true);
    const cases = JSON.parse(readFileSync(path.join(adapter.dir, "cases.json"), "utf8")) as CaseDef[];
    expect(cases, id).toHaveLength(id === "studio/articulation" ? 16 : 4);
    expect(new Set(cases.map((c) => c.id)).size, id).toBe(cases.length);
    for (const c of cases) {
      const f = resolveFixture(adapter.module, c.student); // bilinmeyen fikstür config hatası fırlatır
      if (c.student) expect(f?.id, `${id}/${c.id}`).toBe(c.student);
      else expect(f, `${id}/${c.id}`).toBeNull();
    }
  });

  it("bilinmeyen kimlik anlaşılır hata verir", async () => {
    await expect(loadAdapter("atolye/yok")).rejects.toThrow(/Bilinmeyen EVAL_TOOL/);
  });
});
