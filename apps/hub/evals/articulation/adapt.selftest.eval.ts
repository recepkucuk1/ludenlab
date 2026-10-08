import { describe, expect, it } from "vitest";
import { adaptParams } from "./evalContext";
import { VARIANTS } from "./lib";

/* Varyant uyarlaması doğru mu? (API yok) */
describe("adaptParams", () => {
  const base = () => ({ model: "x", max_tokens: 8000, temperature: 0.5, messages: [] });
  it("baseline isteğe dokunmaz", () => {
    const p = base();
    adaptParams(VARIANTS.baseline!, p);
    expect(p).toEqual(base());
  });
  it("Haiku 5.5 düşünme kapalı: temperature yok, thinking disabled, tavan ×1,3", () => {
    const p: Record<string, unknown> = base();
    adaptParams(VARIANTS.v1!, p);
    expect(p.temperature).toBeUndefined();
    expect(p.thinking).toEqual({ type: "disabled" });
    expect(p.max_tokens).toBe(10400);
    expect(p.output_config).toBeUndefined();
  });
  it("Haiku 5.5 düşünme açık: adaptive + effort medium, tavan ×1,6", () => {
    const p: Record<string, unknown> = base();
    adaptParams(VARIANTS.v2!, p);
    expect(p.temperature).toBeUndefined();
    expect(p.thinking).toEqual({ type: "adaptive" });
    expect(p.output_config).toEqual({ effort: "medium" });
    expect(p.max_tokens).toBe(12800);
  });
});
