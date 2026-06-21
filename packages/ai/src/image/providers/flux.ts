import { fal } from "@fal-ai/client";
import type { ImageProvider, ImageGenerateInput, ImageGenerateResult } from "../types";
import { withRetry } from "../retry";

/**
 * fal.ai Flux schnell adapter. Sonuç bir görsel URL'i döner; byte'lara çevirmek için fetch edilir.
 *
 * Geçici hatalar `withRetry` ile maskelenir (üstel backoff): fal.ai bakiye-kilit flicker'ı
 * (kredi eklendikten hemen sonra/marjinal bakiyede aralıklı "User is locked" 403'ü), ağ blip'i,
 * 5xx. `fal.subscribe`'da yerleşik retry yok — OpenAIProvider'daki `maxRetries:4`'ün karşılığı.
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
    // 6 deneme + üstel backoff (~25s): bakiye auto-recharge anı / fal hıçkırığı gibi geçici
    // hataları aşmak için (paralel üretimde bir pencerede birden çok düşmeyi tek tek kurtarır).
    const bytes = await withRetry(() => this.generateOnce(input.prompt), { attempts: 6 });
    return { bytes, contentType: "image/png", model: this.model };
  }

  /** Tek deneme: üret → URL → byte. Geçici hata fırlatırsa withRetry tekrar dener. */
  private async generateOnce(prompt: string): Promise<Uint8Array> {
    const result = await fal.subscribe(this.model, {
      input: { prompt, image_size: "square_hd", num_images: 1 },
    });

    const url = (result.data as { images?: { url?: string }[] })?.images?.[0]?.url;
    if (!url) {
      throw new Error("Flux görsel döndürmedi (url boş).");
    }

    const resp = await fetch(url);
    return new Uint8Array(await resp.arrayBuffer());
  }
}
