// apps/hub/src/components/UmamiScript.test.ts
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UmamiScript } from "./UmamiScript";

const yol = { value: null as string | null };
vi.mock("next/navigation", () => ({ usePathname: () => yol.value }));
vi.mock("next/script", () => ({
  default: (p: Record<string, unknown>) =>
    createElement("script", { "data-src": String(p.src), "data-website-id": String(p["data-website-id"]) }),
}));

/* Token'lı veli yolu üçüncü tarafa (Umami) gitmesin — spec 2026-11-05 §8. Bu bileşen tek bekçi. */
describe("UmamiScript", () => {
  const render = () => renderToStaticMarkup(createElement(UmamiScript, { websiteId: "w1", scriptUrl: "https://u.example/s.js" }));

  it("/veli/<token> yolunda hiçbir şey basmaz", () => {
    yol.value = "/veli/AbCdEfGhIjKlMnOpQrStUvWxYz012345";
    expect(render()).toBe("");
  });
  it("diğer yollarda script'i basar", () => {
    yol.value = "/studio/students";
    expect(render()).toContain('data-website-id="w1"');
    expect(render()).toContain("https://u.example/s.js");
  });
  it("pathname null (ilk render) ise script'i basar", () => {
    yol.value = null;
    expect(render()).toContain('data-website-id="w1"');
  });
});
