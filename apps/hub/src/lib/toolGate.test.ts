import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * YAPISAL bekçi — "her AI aracı aynı kapıdan geçer" sözleşmesini dosya düzeyinde kilitler.
 *
 * 2026-08 denetiminde çocuk-PII rumuzu (#09), atomik kredi rezervasyonu (#22) ve sayarak
 * gövde okuma (#29) `createToolHandler` içinde TEK noktada çözülmüştü. Ama `weekly-plan`
 * rotası o ortak kapının DIŞINDA kaldığı için üç korumanın da dışındaydı ve bunu
 * yakalayacak test yoktu: iki denetim turu boyunca gözden kaçtı, gerçek çocuk adı aylarca
 * sağlayıcıya gitti. Davranış testleri bu sınıfı yakalayamaz — "kapsam dışı kalmayı"
 * ancak yapısal bir kural yakalar.
 *
 * Yeni bir araç rotası eklerken: ya `createToolHandler` kullan, ya da AI çağırmadığını
 * beyan edip aşağıdaki listeye gerekçesiyle ekle. İkisini de yapmadan test geçmez.
 */
const SRC = path.resolve(import.meta.dirname, "..");
const STUDIO_TOOLS = path.join(SRC, "app/studio/api/tools");
const ATOLYE_COMPONENTS = path.join(SRC, "modules/atolye/components");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

const toolRoutes = walk(STUDIO_TOOLS)
  .filter((p) => p.endsWith("route.ts"))
  .map((p) => ({
    rel: path.relative(STUDIO_TOOLS, p).split(path.sep).join("/"),
    src: readFileSync(p, "utf8"),
  }));

/** AI ÜRETMEYEN rotalar — ortak metin kapısının kapsamı dışında, gerekçesiyle. */
const AI_DISI_ROTALAR = new Map<string, string>([
  ["goal-tracker/[studentId]/route.ts", "hedef takibi CRUD — Claude çağırmaz"],
  ["goal-tracker/[studentId]/progress/route.ts", "ilerleme kaydı CRUD — Claude çağırmaz"],
]);

/** Görsel uçları kendi kredi/parti akışını yürütür — metin kapısının dışındadır. */
const gorselRotasiMi = (rel: string) => rel.endsWith("images/route.ts");

const aiRotalari = toolRoutes.filter(
  (r) => !AI_DISI_ROTALAR.has(r.rel) && !gorselRotasiMi(r.rel),
);

const atolyeAraclari = readdirSync(ATOLYE_COMPONENTS)
  .filter((f) => f.endsWith("Tool.tsx"))
  .map((f) => ({ f, src: readFileSync(path.join(ATOLYE_COMPONENTS, f), "utf8") }));

describe("araç kapısı", () => {
  it("bekçi boşa düşmesin: rotalar ve araç bileşenleri bulunuyor", () => {
    expect(toolRoutes.length).toBeGreaterThan(5);
    expect(aiRotalari.length).toBeGreaterThan(5);
    expect(atolyeAraclari.length).toBeGreaterThan(5);
  });

  it("hiçbir araç rotası Claude'u DOĞRUDAN çağırmaz", () => {
    const dogrudanCagiranlar = toolRoutes
      .filter((r) => r.src.includes("@studio/lib/anthropic"))
      .map((r) => r.rel);
    expect(dogrudanCagiranlar).toEqual([]);
  });

  it("her AI araç rotası ortak kapıdan (createToolHandler) geçer", () => {
    const kapiDisindakiler = aiRotalari
      .filter((r) => !r.src.includes("createToolHandler("))
      .map((r) => r.rel);
    expect(kapiDisindakiler).toEqual([]);
  });

  it("AI araç rotaları gövdeyi ham okumaz (kapı sayarak okur)", () => {
    const hamOkuyanlar = aiRotalari
      .filter((r) => r.src.includes("request.json()"))
      .map((r) => r.rel);
    expect(hamOkuyanlar).toEqual([]);
  });

  it("Atölye araç formlarında gönder butonu üretim sürerken kilitlenir", () => {
    const kilitsizler = atolyeAraclari
      .filter((c) => !c.src.includes("disabled={loading}"))
      .map((c) => c.f);
    expect(kilitsizler).toEqual([]);
  });
});
