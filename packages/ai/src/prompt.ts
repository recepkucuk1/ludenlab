import { runPrompt, type RunPromptResult } from "./client";

/**
 * Tipli prompt tanımı. Domain modülleri (ör. Atölye BEP) bunu kullanarak
 * yeniden kullanılabilir, test edilebilir prompt'lar tanımlar.
 */
export interface PromptDef<TInput> {
  name: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** Sistem promptunu cache'le (büyük, sabit sistem promptları için; varsayılan açık). */
  cacheSystem?: boolean;
  system: string | ((input: TInput) => string);
  user: (input: TInput) => string;
}

export interface CompiledPrompt<TInput> {
  def: PromptDef<TInput>;
  run(input: TInput): Promise<RunPromptResult>;
}

export function definePrompt<TInput>(def: PromptDef<TInput>): CompiledPrompt<TInput> {
  return {
    def,
    run(input: TInput): Promise<RunPromptResult> {
      const system = typeof def.system === "function" ? def.system(input) : def.system;
      return runPrompt({
        system,
        cacheSystem: def.cacheSystem ?? true,
        model: def.model,
        maxTokens: def.maxTokens,
        temperature: def.temperature,
        messages: [{ role: "user", content: def.user(input) }],
      });
    },
  };
}
