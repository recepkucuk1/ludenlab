// apps/hub/src/lib/prompts/yasakSozcuk.test.ts
import { describe, expect, it } from "vitest";
import { yasakSozcukDenetimi } from "./yasakSozcuk";

/* Yasak sözcük taraması (Faz 0): Studio'nun `promptIddialari`'ndan ayrıştırıldı, Atölye sistem prompt'u da aynı
   denetimden geçer (`atolye-system.test.ts`). Pencere ve şema denetimi burada yok. */
describe("yasakSozcukDenetimi", () => {
  it("temiz metinde hata atmaz (hastane, fizyoterapist, öğrenci/uzman serbest)", () => {
    expect(() => yasakSozcukDenetimi("Öğrenci ve uzman; hastane randevusu; fizyoterapist görüşü.")).not.toThrow();
  });
  it("'hasta' ve 'terapist' çekimli biçimleriyle yakalanır; hata iletisi sözcüğü ve bağlamı söyler", () => {
    expect(() => yasakSozcukDenetimi("Hastanın adı yazılır.")).toThrow(
      /'hasta' sözcüğünü kullanıyor: "…hastanın adı yazılır\.…"/,
    );
    expect(() => yasakSozcukDenetimi("Konuşma terapisti okur.")).toThrow(
      /'terapist' sözcüğünü kullanıyor: "…konuşma terapisti okur\.…"/,
    );
  });
  it("bağlam sözcüğün iki yanında ±30 karakterle kırpılır", () => {
    const uzun = "x".repeat(50) + " hasta " + "y".repeat(50);
    expect(() => yasakSozcukDenetimi(uzun)).toThrow(
      `prompt 'hasta' sözcüğünü kullanıyor: "…${"x".repeat(29)} hasta ${"y".repeat(29)}…"`,
    );
  });
  it("tırnaklı anış serbesttir", () => {
    expect(() => yasakSozcukDenetimi('"hasta/terapist" yerine "öğrenci/uzman" de.')).not.toThrow();
  });
});
