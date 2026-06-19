import { fal } from "@fal-ai/client";
import type { ImageProvider, ImageGenerateInput, ImageGenerateResult } from "../types";

/**
 * fal.ai Flux schnell adapter (POC alternatifi). Sonuç bir görsel URL'i döner;
 * byte'lara çevirmek için fetch edilir.
 */
export class FluxProvider implements ImageProvider {
  readonly model = "fal-ai/flux/schnell";

  constructor(apiKey: string | undefined = process.env.FAL_KEY) {
    if (!apiKey) {
      throw new Error("FAL_KEY tanımlı değil — FluxProvider başlatılamıyor.");
    }
    fal.config({ credentials: apiKey });
  }

  async generate(input: ImageGenerateInput): Promise<ImageGenerateResult> {
    const result = await fal.subscribe(this.model, {
      input: { prompt: input.prompt, image_size: "square_hd", num_images: 1 },
    });

    const url = (result.data as { images?: { url?: string }[] })?.images?.[0]?.url;
    if (!url) {
      throw new Error("Flux görsel döndürmedi (url boş).");
    }

    const resp = await fetch(url);
    const bytes = new Uint8Array(await resp.arrayBuffer());
    return { bytes, contentType: "image/png", model: this.model };
  }
}
