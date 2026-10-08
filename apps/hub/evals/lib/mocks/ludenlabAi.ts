// apps/hub/evals/lib/mocks/ludenlabAi.ts
import type Anthropic from "@anthropic-ai/sdk";
import { createMessage } from "../shim";

/* `@ludenlab/ai` `definePrompt`'un shim'e giden sürümü. `packages/ai/src/prompt.ts`'teki
   `run` ile aynı isteği kurar (sistem önbellek bloğu, mesaj, tavan, sıcaklık) — yalnız taşıma değişir. */

interface PromptDefLike<T> {
  name: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  cacheSystem?: boolean;
  system: string | ((input: T) => string);
  user: (input: T) => string;
}

export function definePromptViaShim<T>(def: PromptDefLike<T>) {
  return {
    def,
    async run(input: T) {
      const system = typeof def.system === "function" ? def.system(input) : def.system;
      const params = {
        model: def.model ?? "claude-sonnet-4-6",
        max_tokens: def.maxTokens ?? 4096,
        temperature: def.temperature,
        system: def.cacheSystem === false ? system : [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: def.user(input) }],
      };
      const res = await createMessage(params);
      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return {
        text,
        model: res.model,
        stopReason: res.stop_reason,
        usage: {
          inputTokens: res.usage.input_tokens,
          outputTokens: res.usage.output_tokens,
          cacheReadTokens: res.usage.cache_read_input_tokens ?? 0,
          cacheCreationTokens: res.usage.cache_creation_input_tokens ?? 0,
        },
      };
    },
  };
}
