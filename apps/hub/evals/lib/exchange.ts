// apps/hub/evals/lib/exchange.ts
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { HarnessError, type AgentModel } from "./core";

/* Çevrimdışı arka ucun dosya protokolü.
   İstek:  <dir>/<key>.<role>.request.json  (makine; `hash` = içerik özeti)  +  <key>.<role>.request.md  (alt-ajan okur)
   Yanıt:  <dir>/<key>.<role>.response.txt  (alt-ajan yazar; modelin HAM metni, kod çiti yok)

   - md körleştirilmiştir: anahtar ve model yalnız json'da; metin <system>/<user>(/<output_schema>) bloklarında.
   - Yanıt yalnız json'daki `hash` bugünkü isteğin özetiyle aynıysa geçerlidir. İstek değişince eski yanıt
     `<base>.response.stale-<eskiHash>.txt` olur; boş yanıt `<base>.response.empty.txt` olarak kenara alınır. */

export type ExchangeRole = "gen" | "judge";

export interface ExchangeRequest {
  key: string;
  role: ExchangeRole;
  agentModel: AgentModel;
  model: string;
  system: string;
  user: string;
  max_tokens: number;
  /** Varsa yapılandırılmış çıktı şeması (JSON Schema); md'de <output_schema> bloğu olur. */
  schema?: unknown;
}

export class PendingError extends HarnessError {
  constructor(public key: string) {
    super(`bekliyor: ${key}`, "pending");
    this.name = "PendingError";
  }
}

function basePath(dir: string, key: string, role: ExchangeRole): string {
  return path.join(dir, `${key}.${role}`);
}

export function requestPaths(dir: string, key: string, role: ExchangeRole) {
  const base = basePath(dir, key, role);
  return { json: `${base}.request.json`, md: `${base}.request.md`, response: `${base}.response.txt` };
}

/** İsteğin modele giden içeriğinin özeti (sha256'nın ilk 12 hex'i). Anahtar/rol/agentModel dahil değil. */
export function requestHash(req: ExchangeRequest): string {
  const payload = JSON.stringify({
    model: req.model,
    system: req.system,
    user: req.user,
    max_tokens: req.max_tokens,
    schema: req.schema ?? null,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 12);
}

const CLOSING_TAGS = ["</system>", "</user>", "</output_schema>"];

export function renderRequestMarkdown(req: ExchangeRequest): string {
  if (CLOSING_TAGS.some((t) => req.system.includes(t) || req.user.includes(t))) {
    throw new HarnessError("istek metni kapanış etiketi içeriyor", "exchange_guard");
  }
  const lines = [
    "# EVAL İSTEĞİ",
    `Rol: ${req.role}`,
    "",
    "<system>",
    req.system,
    "</system>",
    "",
    "<user>",
    req.user,
    "</user>",
  ];
  if ((req.schema ?? null) !== null) {
    lines.push(
      "",
      "<output_schema>",
      "Yanıt yalnız bu JSON Schema'ya uyan TEK bir JSON nesnesi olsun; başka hiçbir şey yazma.",
      JSON.stringify(req.schema, null, 2),
      "</output_schema>",
    );
  }
  return lines.join("\n") + "\n";
}

/** json'da kayıtlı `hash`; dosya yoksa, bozuksa ya da alan yoksa undefined. */
function storedHash(jsonPath: string): string | undefined {
  if (!existsSync(jsonPath)) return undefined;
  try {
    const h = (JSON.parse(readFileSync(jsonPath, "utf8")) as { hash?: unknown }).hash;
    return typeof h === "string" ? h : undefined;
  } catch {
    return undefined;
  }
}

/** İsteği yazar. Aynı içerik zaten yazılıysa dokunmaz; içerik değiştiyse eski yanıtı bayat diye kenara alır. */
export function writeRequest(dir: string, req: ExchangeRequest): void {
  mkdirSync(dir, { recursive: true });
  const p = requestPaths(dir, req.key, req.role);
  const hash = requestHash(req);
  const oldHash = storedHash(p.json);
  if (oldHash === hash) return;
  const md = renderRequestMarkdown(req); // koruma yan etkilerden ÖNCE patlasın
  if (existsSync(p.response)) {
    renameSync(p.response, `${basePath(dir, req.key, req.role)}.response.stale-${oldHash ?? "unknown"}.txt`);
  }
  writeFileSync(p.json, JSON.stringify({ ...req, hash }, null, 2) + "\n");
  writeFileSync(p.md, md);
}

/** Bu isteğin yanıt metni (baştaki BOM atılmış). json yoksa / hash tutmuyorsa / yanıt yoksa ya da boşsa null. */
export function readResponse(dir: string, req: ExchangeRequest): string | null {
  const p = requestPaths(dir, req.key, req.role);
  if (storedHash(p.json) !== requestHash(req)) return null;
  if (!existsSync(p.response)) return null;
  const text = readFileSync(p.response, "utf8");
  if (!text.trim()) {
    // Yeniden görevlendirilen alt-ajan yanıt dosyasını serbestçe yazabilsin diye boş dosyayı kenara al.
    renameSync(p.response, `${basePath(dir, req.key, req.role)}.response.empty.txt`);
    return null;
  }
  return text.replace(/^\uFEFF/, "");
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
