import Anthropic from "@anthropic-ai/sdk";

/** Studio ile aynı varsayılan model (maliyet-bilinçli). Gerektiğinde override edilir. */
export const DEFAULT_MODEL = "claude-sonnet-4-6";

let _client: Anthropic | null = null;

/** Tekil Claude client. `ANTHROPIC_API_KEY` env'inden anahtar okur. */
export function getClaude(apiKey: string | undefined = process.env.ANTHROPIC_API_KEY): Anthropic {
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY tanımlı değil — Claude client başlatılamıyor.");
  }
  if (!_client) {
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export interface RunPromptResult {
  text: string;
  model: string;
  usage: TokenUsage;
  stopReason: string | null;
}

export interface RunPromptOptions {
  system?: string;
  /** Büyük/tekrar kullanılan sistem promptlarını prompt-cache'le (varsayılan: açık). */
  cacheSystem?: boolean;
  messages: Anthropic.MessageParam[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/** Tek seferlik (stream'siz) mesaj çağrısı; metni + token kullanımını döndürür. */
export async function runPrompt(opts: RunPromptOptions): Promise<RunPromptResult> {
  const client = getClaude();
  const model = opts.model ?? DEFAULT_MODEL;

  const system: Anthropic.MessageCreateParams["system"] =
    opts.system === undefined
      ? undefined
      : opts.cacheSystem === false
        ? opts.system
        : [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }];

  const res = await client.messages.create({
    model,
    max_tokens: opts.maxTokens ?? 4096,
    temperature: opts.temperature,
    system,
    messages: opts.messages,
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  return {
    text,
    model,
    stopReason: res.stop_reason,
    usage: {
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
      cacheReadTokens: res.usage.cache_read_input_tokens ?? 0,
      cacheCreationTokens: res.usage.cache_creation_input_tokens ?? 0,
    },
  };
}
