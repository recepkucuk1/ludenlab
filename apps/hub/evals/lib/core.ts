// apps/hub/evals/lib/core.ts
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";

/* Değerlendirme çekirdeği — API çağırmaz. Tipler, varyantlar, maliyet, jsonl, backoff. */

export const REPO_ROOT = path.resolve(import.meta.dirname, "../../../..");
export const FLOW_DIR = process.env.EVAL_FLOW ?? path.join(REPO_ROOT, ".claude/hillclimb/prompt-yukseltme");

export type Backend = "api" | "subagent";
/** Agent aracının model takma adları (çevrimdışı arka uç). */
export type AgentModel = "sonnet" | "haiku" | "opus";

export interface Variant {
  key: string;
  /** API modunda gönderilen model kimliği. */
  model: string;
  /** subagent modunda Agent aracına verilen takma ad. */
  agentModel: AgentModel;
  label: string;
  thinking?: "disabled" | "adaptive";
  effort?: "low" | "medium" | "high";
  tokenScale?: number;
}

export const VARIANTS: Record<string, Variant> = {
  baseline: { key: "baseline", model: "claude-sonnet-4-6", agentModel: "sonnet", label: "eski prompt · Sonnet" },
  v1: { key: "v1", model: "claude-sonnet-4-6", agentModel: "sonnet", label: "yeni prompt · Sonnet" },
  v2: {
    key: "v2",
    model: "claude-haiku-5-5",
    agentModel: "haiku",
    label: "yeni prompt · Haiku 5.5",
    thinking: "adaptive",
    effort: "medium",
    tokenScale: 1.3,
  },
};

export const JUDGE: { model: string; agentModel: AgentModel } = { model: "claude-opus-5", agentModel: "opus" };

/* ── Vaka ve fikstür tipleri ── */

export interface CaseDef<Body = Record<string, unknown>> {
  id: string;
  tags: string[];
  /** Bu vaka neyi sınıyor — hakem görevine ve rapora girer. */
  purpose: string;
  body: Body;
  /** Fikstür kimliği (fixtures/*.json anahtarı) ya da null (öğrencisiz). */
  student: string | null;
}

export interface StudioFixture {
  id: string;
  name: string;
  /** ISO tarih, ör. "2019-04-10". */
  birthDate: string;
  workArea: "speech" | "language" | "hearing";
  diagnosis: string | null;
  notes: string | null;
  aiProfile: string | null;
  recentCards: Array<{ title: string; toolType: string; difficulty: string; createdAt: string }>;
  lastSummary: { overallAssessment: string; nextSessionPlan: string; createdAt: string } | null;
  curriculumTitles: string[];
  completedGoalCodes: string[];
}

export interface AtolyeFixture {
  id: string;
  /** Ad Soyad — gerçek ad rolünde; prompt'a rumuz gider. */
  code: string;
  kademe: "okul_oncesi" | "ilkokul_1_4" | "ortaokul_5_8" | "lise_9_uzeri";
  yas: number | null;
  taniProfili: string[];
  guclukDuzeyi: "hafif" | "orta" | "belirgin" | null;
  gucluYonler: string | null;
  ilgiAlanlari: string | null;
  mebBolumler: string[];
  documents: Array<{ type: string; createdAt: string; content: string }>;
}

export type Fixture = StudioFixture | AtolyeFixture;

/* ── Adaptör sözleşmesi ── */

export interface CriterionDef {
  key: string;
  question: string;
}

export interface CheckResult {
  /** 0–1 arası puanlar; en az `talimat`, `dil_kurali`, `rumuz_yok`, `yasak_kalip` bulunur. */
  scores: Record<string, number>;
  details: Record<string, number | string | boolean>;
  /** Uzmanın materyali kullanmasını engelleyen sert hatalar (boşsa yok). */
  hard_fail: string[];
}

export interface InvokeResult {
  status: number;
  body: Record<string, unknown> | null;
}

export interface ToolAdapter<Body = Record<string, unknown>> {
  id: string;
  module: "studio" | "atolye";
  /** Adaptör dizini (cases.json buradan okunur). */
  dir: string;
  /** Gerçek route'u çalıştırır. `fixtureId` null ise öğrencisiz istek. */
  invoke(body: Body, fixtureId: string | null): Promise<InvokeResult>;
  /** Başarılı yanıt gövdesinden aracın çıktısını alır (ör. body.story, body.text). */
  extractOutput(resBody: Record<string, unknown>): unknown;
  /** Hakeme verilen görev tanımı (istek + öğrenci + amaç). */
  renderTask(c: CaseDef<Body>, fixture: Fixture | null): string;
  /** Uygulamanın uzmana gösterdiği son içeriği okunur metne çevirir. */
  renderForJudge(output: unknown): string;
  checks(args: { body: Body; output: unknown; rawText: string; alias: string | null }): CheckResult;
  /** 4 ortak ölçüt + araca özgü 1–2 ölçüt. */
  criteria: CriterionDef[];
  /** Hakem kontrolü için bilinen-jenerik aday (yasak kalıplarla bozulmuş kopya). */
  genericCandidate(output: unknown): unknown;
}

export const ORTAK_OLCUTLER: CriterionDef[] = [
  {
    key: "ozgulluk",
    question:
      "Öneriler profildeki somut verilere (yaş, tanı, güçlü yön, ilgi alanı, geçmiş çalışmalar, uzman notu) açıkça bağlı mı; bu öğrenci için mi yazılmış, yoksa herhangi bir öğrenciye yapıştırılabilir mi?",
  },
  {
    key: "klinik_derinlik",
    question:
      "Uzman bu materyali olduğu gibi seansta kullanabilir mi? Öneriler kanıt temelli, somut ve uygulanabilir mi; kalıp cümle (ör. 'çok duyulu yaklaşım kullanın') yerine ne yapılacağı yazıyor mu; klinik hata var mı?",
  },
  {
    key: "bicim_butce",
    question:
      "İstenen yapı tam mı (tüm alanlar/bölümler dolu); gereksiz uzunluk ya da tekrar var mı; yazdırılabilir, okunur mu?",
  },
  {
    key: "dil_etik",
    question:
      "'hasta' yerine 'öğrenci', 'terapist' yerine 'uzman'; ödül/puan/çıkartma önerisi yok; tıbbi tanı cümlesi yok; damgalamayan dil; öğrenciden yalnız verilen adla bahsediliyor mu?",
  },
];

/* ── Maliyet ── */

export interface UsageLike {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

/** USD / 1M token (girdi, çıktı). Önbellek yazma 1.25×, okuma 0.1× girdi. */
const PRICES: Array<[prefix: string, input: number, output: number]> = [
  ["claude-sonnet-4-6", 3, 15],
  ["claude-haiku-5-5", 0.1, 0.5],
  ["claude-sonnet-5-5", 2, 10],
  ["claude-sonnet-5", 2, 10],
  ["claude-opus-5-5", 4, 20],
  ["claude-opus-5", 5, 25],
];

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

/* ── Hata, backoff, timeout ── */

/** Değerlendirme düzeneğinin hatası. Ad bilerek JS'in yerleşik hata global'lerinden biri DEĞİL:
    öyle olsaydı içe aktarmayı unutan dosya yine derlenir, `instanceof` sessizce yanlış sınıfa bakardı. */
export class HarnessError extends Error {
  constructor(
    message: string,
    public failureClass: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "HarnessError";
  }
}

export async function withBackoff<T>(
  fn: () => Promise<T>,
  retry: { count: number },
  deadline = Infinity,
  tries = 5,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    if (Date.now() >= deadline) throw new HarnessError("süre tavanı denemeden önce aşıldı", "timeout");
    try {
      return await fn();
    } catch (e) {
      if (e instanceof HarnessError && e.failureClass === "pending") throw e; // bekleyen istek yeniden denenmez
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
    timer = setTimeout(() => reject(new HarnessError(`${label}: ${seconds} sn tavanı aşıldı`, "timeout")), seconds * 1000);
  });
  try {
    return await Promise.race([promise, ceiling]);
  } finally {
    clearTimeout(timer);
  }
}

/* ── jsonl ── */

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

/** ANTHROPIC_API_KEY — ortamda yoksa yalnız bu anahtar apps/hub/.env'den okunur. */
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

export function servedModelMatches(requested: string, served: string | undefined): boolean {
  if (!served || served === requested) return true;
  const base = requested.replace(/-latest$|-0$/, "");
  if (!served.startsWith(base)) return false;
  return /^[-@](\d{8}|\d{4}-\d{2}-\d{2})$/.test(served.slice(base.length));
}

/** Route'un SSE-heartbeat yanıtını (ya da düz JSON'u) `{status, body}`'ye çevirir. */
export function parseSse(text: string, httpStatus: number): InvokeResult {
  if (!text.startsWith("data:")) {
    try {
      return { status: httpStatus, body: JSON.parse(text) as Record<string, unknown> };
    } catch {
      return { status: httpStatus, body: null };
    }
  }
  for (const chunk of text.split("\n\n")) {
    const line = chunk.trim();
    if (!line.startsWith("data:")) continue;
    const evt = JSON.parse(line.slice(5).trim()) as { type: string; status?: number; body?: Record<string, unknown> };
    if (evt.type === "result") return { status: evt.status ?? 599, body: evt.body ?? null };
  }
  return { status: 599, body: null };
}

export const WORK_AREA_TR: Record<string, string> = { speech: "Konuşma", language: "Dil", hearing: "İşitme" };
export const KADEME_TR: Record<string, string> = {
  okul_oncesi: "Okul öncesi (4–6 yaş)",
  ilkokul_1_4: "İlkokul (1–4. sınıf)",
  ortaokul_5_8: "Ortaokul (5–8. sınıf)",
  lise_9_uzeri: "Lise (9. sınıf ve üzeri)",
};
