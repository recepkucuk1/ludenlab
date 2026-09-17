import { describe, expect, it, vi } from "vitest";
import { PDF_FONT_STACK, PDF_MONO_STACK, registerPdfFonts } from "./pdfFonts";

const fakeFont = () => ({
  register: vi.fn(),
  registerHyphenationCallback: vi.fn(),
  registerEmojiSource: vi.fn(),
});

describe("registerPdfFonts", () => {
  it("NotoSans'ı kaydeder ve kelimeleri bölmeyen heceleme callback'i kurar", () => {
    const Font = fakeFont();
    registerPdfFonts(Font as never, "https://x.test/fonts");

    expect(Font.register).toHaveBeenCalledWith(
      expect.objectContaining({ family: "NotoSans" }),
    );
    const cb = Font.registerHyphenationCallback.mock.calls[0][0] as (w: string) => string[];
    expect(cb("sakince")).toEqual(["sakince"]);
    expect(cb("olabilir")).toEqual(["olabilir"]);
  });

  it("NotoSans'ta olmayan ok/simge glifleri için yedek fontları kaydeder", () => {
    const Font = fakeFont();
    registerPdfFonts(Font as never, "https://x.test/fonts");

    const families = Font.register.mock.calls.map((c) => c[0].family);
    for (const fam of [...PDF_FONT_STACK, ...PDF_MONO_STACK]) expect(families).toContain(fam);
    expect(PDF_FONT_STACK[0]).toBe("NotoSans");
    // Kod blokları Courier (WinAnsi) kullanırsa ş/ğ/ı ve → bozulur.
    expect(PDF_MONO_STACK).not.toContain("Courier");
  });

  it("emojileri görsel olarak gömmek için emoji kaynağı kaydeder", () => {
    const Font = fakeFont();
    registerPdfFonts(Font as never, "https://x.test/fonts");

    expect(Font.registerEmojiSource).toHaveBeenCalledWith(
      expect.objectContaining({ format: "png", url: expect.stringMatching(/^https:\/\/.+\/$/) }),
    );
  });
});
