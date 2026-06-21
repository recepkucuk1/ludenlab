import { describe, it, expect } from "vitest";
import { soundToLetter } from "./wordBank";

describe("soundToLetter", () => {
  it("/k/ → k", () => expect(soundToLetter("/k/")).toBe("k"));
  it("/ş/ → ş (Türkçe küçük harf korunur)", () => expect(soundToLetter("/Ş/")).toBe("ş"));
  it("slash'sız da çalışır", () => expect(soundToLetter("z")).toBe("z"));
  it("boşlukları kırpar", () => expect(soundToLetter(" /r/ ")).toBe("r"));
});
