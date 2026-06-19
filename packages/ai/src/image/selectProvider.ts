import type { ImageProvider } from "./types";
import { OpenAIImageProvider } from "./providers/openai";
import { FluxProvider } from "./providers/flux";

type Env = Record<string, string | undefined>;

/** `IMAGE_PROVIDER` env'ine göre görsel sağlayıcısını döndürür (varsayılan: openai). */
export function selectProvider(env: Env = process.env): ImageProvider {
  const provider = env.IMAGE_PROVIDER ?? "openai";
  switch (provider) {
    case "openai":
      return new OpenAIImageProvider(env.OPENAI_API_KEY);
    case "flux":
      return new FluxProvider(env.FAL_KEY);
    default:
      throw new Error(`Bilinmeyen IMAGE_PROVIDER: "${provider}" (openai | flux bekleniyor).`);
  }
}
