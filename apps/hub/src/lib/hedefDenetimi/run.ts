import { DEFAULT_MODEL, definePrompt, type RunPromptResult, type TokenUsage } from "@ludenlab/ai";
import { DenetimHatasi, dogrula } from "./dogrula";
import { HEDEF_DENETIM_SYSTEM, kullaniciPromptu } from "./prompt";
import { type DenetimGirdisi, type DenetimSonucu } from "./schema";

/* SERVER-ONLY koşucu (spec §4.5). `definePrompt` Atölye araçlarıyla aynı yol; eval düzeneğinin `definePrompt`
   taklidi bu çağrıyı da yakalayabilir. API anahtarı yalnız çağrı anında okunur (modül yüklenirken değil). */

export const HEDEF_DENETIM_MODEL = DEFAULT_MODEL;
export const HEDEF_DENETIM_MAX_TOKENS = 900;

const prompt = definePrompt<DenetimGirdisi>({
  name: "hedef_denetimi",
  model: HEDEF_DENETIM_MODEL,
  temperature: 0.2,
  maxTokens: HEDEF_DENETIM_MAX_TOKENS,
  system: HEDEF_DENETIM_SYSTEM,
  user: kullaniciPromptu,
});

/** Metindeki ilk `{` … son `}` dilimini çözer (model önsöz/sonsöz yazarsa). */
export function jsonDilimi(text: string): unknown {
  const a = text.indexOf("{");
  const b = text.lastIndexOf("}");
  if (a < 0 || b < a) throw new DenetimHatasi("parse", "yanıtta JSON yok");
  try {
    return JSON.parse(text.slice(a, b + 1)) as unknown;
  } catch {
    throw new DenetimHatasi("parse", "yanıttaki JSON çözülemedi");
  }
}

export interface DenetimCiktisi {
  sonuc: DenetimSonucu;
  model: string;
  usage: TokenUsage;
}

export async function hedefDenetle(
  girdi: DenetimGirdisi,
  calistir: (g: DenetimGirdisi) => Promise<RunPromptResult> = (g) => prompt.run(g),
): Promise<DenetimCiktisi> {
  const r = await calistir(girdi);
  if (r.stopReason === "max_tokens") throw new DenetimHatasi("parse", "yanıt kesildi (max_tokens)");
  return { sonuc: dogrula(jsonDilimi(r.text), girdi), model: r.model, usage: r.usage };
}
