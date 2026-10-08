// apps/hub/evals/lib/exchange.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { EvalError, type AgentModel } from "./core";

/* Çevrimdışı arka ucun dosya protokolü.
   İstek:  <dir>/<key>.<role>.request.json  (makine)  +  <key>.<role>.request.md  (alt-ajan okur)
   Yanıt:  <dir>/<key>.<role>.response.txt  (alt-ajan yazar; modelin HAM metni, kod çiti yok) */

export type ExchangeRole = "gen" | "judge";

export interface ExchangeRequest {
  key: string;
  role: ExchangeRole;
  agentModel: AgentModel;
  model: string;
  system: string;
  user: string;
  max_tokens: number;
  /** Yalnız hakem: JSON Schema. */
  schema?: unknown;
}

export class PendingError extends EvalError {
  constructor(public key: string) {
    super(`bekliyor: ${key}`, "pending");
  }
}

export function requestPaths(dir: string, key: string, role: ExchangeRole) {
  const base = path.join(dir, `${key}.${role}`);
  return { json: `${base}.request.json`, md: `${base}.request.md`, response: `${base}.response.txt` };
}

export function renderRequestMarkdown(req: ExchangeRequest): string {
  const lines = [
    `# EVAL İSTEĞİ ${req.key}`,
    `Rol: ${req.role} · Model: ${req.model}`,
    "",
    "## SİSTEM TALİMATI",
    req.system,
    "",
    "## KULLANICI MESAJI",
    req.user,
  ];
  if (req.role === "judge" && req.schema) {
    lines.push("", "## ÇIKTI ŞEMASI", "Yanıt yalnız bu JSON Schema'ya uyan TEK bir JSON nesnesi olsun; başka hiçbir şey yazma.", "```json", JSON.stringify(req.schema, null, 2), "```");
  }
  return lines.join("\n") + "\n";
}

/** İstek dosyaları yoksa yazar (varsa dokunmaz — yeniden koşuda içerik aynıdır). */
export function writeRequest(dir: string, req: ExchangeRequest): void {
  mkdirSync(dir, { recursive: true });
  const p = requestPaths(dir, req.key, req.role);
  if (!existsSync(p.json)) writeFileSync(p.json, JSON.stringify(req, null, 2));
  if (!existsSync(p.md)) writeFileSync(p.md, renderRequestMarkdown(req));
}

/** Yanıt metni; dosya yoksa ya da boşsa null. */
export function readResponse(dir: string, key: string, role: ExchangeRole): string | null {
  const p = requestPaths(dir, key, role);
  if (!existsSync(p.response)) return null;
  const text = readFileSync(p.response, "utf8");
  return text.trim() ? text : null;
}

/** Türkçe metin için kaba token tahmini (Sonnet 4.6 tokenizer'ına yakın: ~3,2 karakter/token). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.2);
}

export function messageFromText(text: string, model: string, inputTokens: number): Anthropic.Message {
  return {
    id: "msg_subagent",
    type: "message",
    role: "assistant",
    model,
    content: [{ type: "text", text, citations: null }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: inputTokens,
      output_tokens: estimateTokens(text),
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  } as unknown as Anthropic.Message;
}
