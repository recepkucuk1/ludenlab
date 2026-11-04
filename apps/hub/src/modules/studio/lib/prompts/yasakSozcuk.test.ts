// apps/hub/src/modules/studio/lib/prompts/yasakSozcuk.test.ts
import { describe, expect, it } from "vitest";
import { yasakSozcukDenetimi } from "./iskelet";

/* `promptIddialari`'ndan ayrıştırılan yasak sözcük taraması (Faz 0): Atölye sistem prompt'u da aynı
   denetimden geçer (`atolye-system.test.ts`). Pencere ve şema denetimi burada yok. */
describe("yasakSozcukDenetimi", () => {
  it("temiz metinde hata atmaz (hastane, fizyoterapist, öğrenci/uzman serbest)", () => {
    expect(() => yasakSozcukDenetimi("Öğrenci ve uzman; hastane randevusu; fizyoterapist görüşü.")).not.toThrow();
  });
  it("'hasta' ve 'terapist' çekimli biçimleriyle yakalanır; hata iletisi sözcüğü ve bağlamı söyler", () => {
    expect(() => yasakSozcukDenetimi("Hastanın adı yazılır.")).toThrow(/'hasta'/);
    expect(() => yasakSozcukDenetimi("Konuşma terapisti okur.")).toThrow(/'terapist'/);
  });
  it("tırnaklı anış serbesttir", () => {
    expect(() => yasakSozcukDenetimi('"hasta/terapist" yerine "öğrenci/uzman" de.')).not.toThrow();
  });
});
