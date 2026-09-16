import { describe, expect, it, vi } from "vitest";
import { registerPdfFonts } from "./pdfFonts";

describe("registerPdfFonts", () => {
  it("NotoSans'ı kaydeder ve kelimeleri bölmeyen heceleme callback'i kurar", () => {
    const Font = { register: vi.fn(), registerHyphenationCallback: vi.fn() };
    registerPdfFonts(Font as never, "https://x.test/fonts");

    expect(Font.register).toHaveBeenCalledWith(
      expect.objectContaining({ family: "NotoSans" }),
    );
    const cb = Font.registerHyphenationCallback.mock.calls[0][0] as (w: string) => string[];
    expect(cb("sakince")).toEqual(["sakince"]);
    expect(cb("olabilir")).toEqual(["olabilir"]);
  });
});
