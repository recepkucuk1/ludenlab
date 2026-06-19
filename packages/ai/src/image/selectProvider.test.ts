import { describe, it, expect } from "vitest";
import { selectProvider } from "./selectProvider";

describe("selectProvider", () => {
  it("varsayılan olarak OpenAI seçer", () => {
    const p = selectProvider({ OPENAI_API_KEY: "test-key" });
    expect(p.model).toBe("gpt-image-1-mini");
  });

  it("IMAGE_PROVIDER=flux için Flux seçer", () => {
    const p = selectProvider({ IMAGE_PROVIDER: "flux", FAL_KEY: "test-key" });
    expect(p.model).toBe("fal-ai/flux/schnell");
  });

  it("bilinmeyen provider için hata fırlatır", () => {
    expect(() => selectProvider({ IMAGE_PROVIDER: "midjourney" })).toThrow(/IMAGE_PROVIDER/);
  });
});
