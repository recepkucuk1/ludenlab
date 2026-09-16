import type Anthropic from "@anthropic-ai/sdk";
import { adaptParams, als, runtime } from "./evalContext";
import { withBackoff } from "./lib";

/* `@studio/lib/anthropic` yerine geçen istemci. Route'un kurduğu isteği DEĞİŞTİRMEZ; yalnız
   model kimliğini varyanta çevirir (+ onaylı Sonnet 5 uyarlaması), yanıtı ve kullanımı vakaya
   kaydeder. Kendi yeniden denemesini sayabilmek için SDK'nın iç yeniden denemesi kapalıdır. */

function userText(p: Record<string, unknown>): string {
  const first = (p.messages as Array<{ content?: unknown }> | undefined)?.[0];
  return typeof first?.content === "string" ? first.content : "";
}

/** EVAL_DRY: API çağırmadan düzeneği uçtan uca sınamak için sahte ama kurala uygun/aykırı çıktı. */
function fakeDrill(prompt: string, mode: "good" | "bad" | "broken"): Record<string, unknown> | string {
  if (mode === "broken") return "Üzgünüm, bu isteği şu an üretemiyorum.";
  if (mode === "bad") {
    return { title: "", items: [{ word: "masa" }], expertNotes: "Hasta için ödül verin.", cueTypes: [], homeGuidance: "" };
  }
  const level = /Alıştırma seviyesi: (.+)/.exec(prompt)?.[1]?.trim();
  const sounds = (/Hedef ses\(ler\): (.+)/.exec(prompt)?.[1] ?? "/s/").split(",").map((s) => s.trim());
  const count = Number(/Kelime\/öğe sayısı: (\d+)/.exec(prompt)?.[1] ?? 10);
  const alias = /- Ad: ([^,\n]+)/.exec(prompt)?.[1]?.trim() ?? null;
  const bank = /EKLEME\/DEĞİŞTİRME: (.+)/.exec(prompt)?.[1]?.split(",").map((s) => s.trim()) ?? [];
  const letter = sounds[0]!.replace(/\//g, "");
  const notes = {
    title: "Deneme alıştırması",
    expertNotes: `${alias ?? "Öğrenci"} için ayna karşısında çalışın.`,
    cueTypes: ["Görsel (ayna)"],
    homeGuidance: "Günde beş dakika birlikte tekrar edin.",
  };
  let items: Record<string, unknown>[] = [];
  if (level === "İzole Ses") items = Array.from({ length: count }, () => ({ word: letter.repeat(3), targetSound: sounds[0] }));
  if (level === "Hece Düzeyi")
    items = Array.from({ length: count }, () => ({
      word: `${letter}a`,
      syllableType: "açık",
      exampleWord: `${letter}ama`,
      targetSound: sounds[0],
      position: "initial",
    }));
  if (level === "Cümle Düzeyi") items = bank.map((w) => ({ word: w, sentence: `${alias ?? "Ali"} bugün ${w} gördü.` }));
  if (level === "Bağlam İçi")
    items = bank.map((w) => ({ word: w, sentence: `Bir ${w} vardı. Herkes ona baktı. Sonra eve döndüler.` }));
  return { ...notes, items };
}

export const anthropicShim = {
  messages: {
    async create(params: Record<string, unknown>): Promise<Anthropic.Message> {
      const store = als.getStore();
      if (!store) throw new Error("eval: vaka bağlamı (AsyncLocalStorage) yok");
      const p = structuredClone(params);
      p.model = runtime.model;
      adaptParams(runtime.model, p);

      if (runtime.dry) {
        const fake = fakeDrill(userText(p), runtime.dry);
        const text = typeof fake === "string" ? fake : JSON.stringify(fake);
        const res = {
          id: "msg_dry",
          type: "message",
          role: "assistant",
          model: runtime.model,
          content: [{ type: "text", text, citations: null }],
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 1000, output_tokens: 500, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
        } as unknown as Anthropic.Message;
        store.calls.push({ request: p, response: res, latency_s: 0 });
        return res;
      }

      let started = Date.now();
      try {
        const res = await withBackoff(
          () => {
            started = Date.now();
            return runtime.client!.messages.create(p as unknown as Anthropic.MessageCreateParamsNonStreaming, {
              timeout: 300_000,
            });
          },
          store.retries,
          store.deadline,
        );
        store.calls.push({ request: p, response: res, latency_s: (Date.now() - started) / 1000 });
        return res;
      } catch (e) {
        store.apiError = e;
        throw e;
      }
    },
  },
};
