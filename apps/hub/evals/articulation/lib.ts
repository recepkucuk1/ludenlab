import { appendFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";

/* Değerlendirme düzeneğinin ortak yardımcıları (API çağırmaz). */

export const REPO_ROOT = path.resolve(import.meta.dirname, "../../../..");
export const FLOW_DIR = process.env.EVAL_FLOW ?? path.join(REPO_ROOT, ".claude/hillclimb/articulation");

/** Varyant → model. Varyant dizin adları rapor sözleşmesi gereği baseline / v<N>. */
export interface Variant {
  model: string;
  label: string;
  /** Düşünme: "disabled" (kapalı) | "adaptive" (açık, effort ile). Belirtilmezse isteğe dokunulmaz. */
  thinking?: "disabled" | "adaptive";
  effort?: "low" | "medium" | "high";
  /** max_tokens çarpanı (yeni tokenizer ~%30 fazla sayar; düşünme açıkken pay bırakılır). */
  tokenScale?: number;
}

export const VARIANTS: Record<string, Variant> = {
  baseline: { model: "claude-sonnet-4-6", label: "Sonnet 4.6 (canlı)" },
  v1: { model: "claude-haiku-5-5", label: "Haiku 5.5 · düşünme kapalı", thinking: "disabled", tokenScale: 1.3 },
  v2: { model: "claude-haiku-5-5", label: "Haiku 5.5 · düşünme açık (medium)", thinking: "adaptive", effort: "medium", tokenScale: 1.6 },
};

export const JUDGE_MODEL = "claude-opus-5";

/** USD / 1M token (girdi, çıktı). Önbellek yazma 1.25×, okuma 0.1× girdi. */
const PRICES: Array<[prefix: string, input: number, output: number]> = [
  ["claude-sonnet-4-6", 3, 15],
  ["claude-haiku-5-5", 0.1, 0.5],
  ["claude-haiku-4-5", 1, 5],
  ["claude-sonnet-5", 2, 10],
  ["claude-opus-5", 5, 25],
  ["claude-opus-4-8", 5, 25],
];

export interface UsageLike {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

export function costUsd(model: string | undefined, u: UsageLike | undefined | null): number | null {
  if (!model || !u) return null;
  const p = PRICES.find(([prefix]) => model.startsWith(prefix));
  if (!p) return null;
  const [, pin, pout] = p;
  return (
    ((u.input_tokens ?? 0) * pin +
      (u.output_tokens ?? 0) * pout +
      (u.cache_creation_input_tokens ?? 0) * pin * 1.25 +
      (u.cache_read_input_tokens ?? 0) * pin * 0.1) /
    1_000_000
  );
}

export function sumUsage(list: Array<UsageLike | undefined>): UsageLike {
  const out = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
  for (const u of list) {
    if (!u) continue;
    out.input_tokens += u.input_tokens ?? 0;
    out.output_tokens += u.output_tokens ?? 0;
    out.cache_creation_input_tokens += u.cache_creation_input_tokens ?? 0;
    out.cache_read_input_tokens += u.cache_read_input_tokens ?? 0;
  }
  return out;
}

export class EvalError extends Error {
  constructor(
    message: string,
    public failureClass: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

/** 429 / 529 / 5xx için titreşimli üstel bekleme. Deneme sayısı `retry.count`'a yazılır. */
export async function withBackoff<T>(
  fn: () => Promise<T>,
  retry: { count: number },
  deadline = Infinity,
  tries = 5,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    if (Date.now() >= deadline) throw new EvalError("süre tavanı denemeden önce aşıldı", "timeout");
    try {
      return await fn();
    } catch (e) {
      const status = (e as { status?: number })?.status;
      const transient =
        status === 429 ||
        status === 529 ||
        (typeof status === "number" && status >= 500 && status < 600) ||
        /overloaded|rate.?limit|ECONNRESET|socket hang up|fetch failed/i.test(String((e as Error)?.message ?? ""));
      if (!transient || attempt >= tries - 1) throw e;
      const delay = Math.min(60_000, 1000 * 2 ** attempt) * (0.5 + Math.random());
      if (Date.now() + delay >= deadline) throw e;
      retry.count++;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

export async function withTimeout<T>(promise: Promise<T>, seconds: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const ceiling = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new EvalError(`${label}: ${seconds} sn tavanı aşıldı`, "timeout")), seconds * 1000);
  });
  try {
    return await Promise.race([promise, ceiling]);
  } finally {
    clearTimeout(timer);
  }
}

/** Yarım kalmış son satırı ayır (çökme sonrası iki satırın birleşmesini önler). */
export function isolateTornLine(file: string): void {
  if (!existsSync(file)) return;
  const buf = readFileSync(file);
  if (buf.length && buf[buf.length - 1] !== 0x0a) appendFileSync(file, "\n");
}

export function appendJsonl(file: string, row: unknown): void {
  appendFileSync(file, JSON.stringify(row) + "\n");
}

export function readJsonl<T = Record<string, unknown>>(file: string): T[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .flatMap((l) => {
      try {
        return [JSON.parse(l) as T];
      } catch {
        return [];
      }
    });
}

/** ANTHROPIC_API_KEY — ortamda yoksa yalnız bu anahtar apps/hub/.env'den okunur (diğer sırlar yüklenmez). */
export function loadApiKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const envFile = path.resolve(import.meta.dirname, "../../.env");
  const line = existsSync(envFile)
    ? readFileSync(envFile, "utf8").split("\n").find((l) => l.startsWith("ANTHROPIC_API_KEY="))
    : undefined;
  const key = line?.slice("ANTHROPIC_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
  if (!key) throw new Error("ANTHROPIC_API_KEY bulunamadı");
  return key;
}

/** İstenen model ile yanıtı veren model aynı mı? (alias → tarihli sürüm çözümü kabul edilir) */
export function servedModelMatches(requested: string, served: string | undefined): boolean {
  if (!served || served === requested) return true;
  const base = requested.replace(/-latest$|-0$/, "");
  if (!served.startsWith(base)) return false;
  return /^[-@](\d{8}|\d{4}-\d{2}-\d{2})$/.test(served.slice(base.length));
}

export const LEVEL_TR: Record<string, string> = {
  isolated: "İzole ses",
  syllable: "Hece",
  word: "Kelime",
  sentence: "Cümle",
  contextual: "Bağlam",
};
export const POSITION_TR: Record<string, string> = { initial: "başta", medial: "ortada", final: "sonda" };
export const WORK_AREA_TR: Record<string, string> = { speech: "Konuşma", language: "Dil", hearing: "İşitme" };
