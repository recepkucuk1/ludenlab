import OpenAI from "openai";
import type { ImageProvider, ImageGenerateInput, ImageGenerateResult } from "../types";

/**
 * OpenAI GPT Image 1 Mini adapter. gpt-image-1 ailesi yanıtı b64_json döner.
 * `quality: "low"` maliyet-bilinçli varsayılan (POC'ta ayarlanabilir).
 */
export class OpenAIImageProvider implements ImageProvider {
  readonly model = "gpt-image-1-mini";
  private client: OpenAI;

  constructor(apiKey: string | undefined = process.env.OPENAI_API_KEY) {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY tanımlı değil — OpenAIImageProvider başlatılamıyor.");
    }
    this.client = new OpenAI({ apiKey });
  }

  async generate(input: ImageGenerateInput): Promise<ImageGenerateResult> {
    const res = await this.client.images.generate({
      model: this.model,
      prompt: input.prompt,
      size: input.size ?? "1024x1024",
      quality: "low",
    });

    const b64 = res.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error("OpenAI görsel döndürmedi (b64_json boş).");
    }

    return {
      bytes: new Uint8Array(Buffer.from(b64, "base64")),
      contentType: "image/png",
      model: this.model,
    };
  }
}
