/** Görsel üretim girdisi. */
export interface ImageGenerateInput {
  /** Modele giden nihai prompt (buildImagePrompt çıktısı). */
  prompt: string;
  /** Kare boyut; varsayılan "1024x1024". */
  size?: string;
}

/** Üretilen ham görsel. */
export interface ImageGenerateResult {
  bytes: Uint8Array;
  /** MIME tipi, ör. "image/png". */
  contentType: string;
  /** Üreten model kimliği. */
  model: string;
}

/** Sağlayıcı-bağımsız görsel üretici. Adapter'lar bunu uygular. */
export interface ImageProvider {
  /** Model kimliği (ör. "gpt-image-1-mini"). */
  readonly model: string;
  generate(input: ImageGenerateInput): Promise<ImageGenerateResult>;
}
