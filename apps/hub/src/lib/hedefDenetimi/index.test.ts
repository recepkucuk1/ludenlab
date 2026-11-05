import { describe, expect, it } from "vitest";

describe("index (istemci-güvenli yüzey)", () => {
  it("server-only dışa aktarımlar yok", async () => {
    const keys = Object.keys(await import("./index"));
    for (const k of ["hedefDenetle", "HEDEF_DENETIM_SYSTEM", "kullaniciPromptu"]) expect(keys).not.toContain(k);
  });
});
