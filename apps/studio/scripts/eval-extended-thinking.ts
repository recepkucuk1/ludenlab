/**
 * Extended thinking A/B ölçümü.
 *
 *   npx tsx scripts/eval-extended-thinking.ts
 *
 * Her senaryo için iki varyant üretir:
 *   A) Baseline  — temperature 0.4, thinking yok
 *   B) Thinking  — temperature 1.0, extended thinking budget 2000 token
 *
 * Ardından Sonnet 4.6'yı "judge" olarak kullanarak 5 boyutta skorlar. Pozisyon
 * bias'ını kırmak için senaryoların yarısında A/B swap edilir.
 *
 * Çıktılar:
 *   - Konsol tablosu
 *   - scripts/eval-results/run-<timestamp>.json (ham sonuçlar)
 *
 * Not: Gerçek API çağrıları yapar, ANTHROPIC_API_KEY gerekir. Maliyet tahmini
 * ~$0.50-1.00 (8 senaryo × (2 generate + 1 judge) = 24 çağrı).
 */

import { config as loadEnv } from "dotenv";
import { existsSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

// Env loader: worktree .env yoksa ana repo .env'inden yükle. Claude Code
// session'ından gelen ANTHROPIC_BASE_URL'i de temizliyoruz ki SDK doğrudan
// resmi API'ye gitsin.
const __dirname = dirname(fileURLToPath(import.meta.url));
const candidateEnvs = [
  resolve(process.cwd(), ".env"),
  resolve(__dirname, "../.env"),
  resolve(__dirname, "../../../../.env"), // worktree → main repo
];
for (const p of candidateEnvs) {
  if (existsSync(p)) {
    loadEnv({ path: p, override: true });
    console.log(`env loaded: ${p}`);
    break;
  }
}
delete process.env.ANTHROPIC_BASE_URL;
import {
  CARD_SYSTEM_PROMPT,
  CARD_TOOL,
  buildCardPrompt,
  type CardCategory,
  type Difficulty,
  type AgeGroup,
  type StudentContext,
} from "../src/lib/prompts";

const MODEL = "claude-sonnet-4-6";
const THINKING_BUDGET = 2000;
const MAX_TOKENS_BASELINE = 4096;
const MAX_TOKENS_THINKING = 6144; // thinking budget + çıktı için

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Scenarios ───────────────────────────────────────────────────────────────

type Scenario = {
  name: string;
  category: CardCategory;
  difficulty: Difficulty;
  ageGroup: AgeGroup;
  focusArea?: string;
  curriculumGoalText?: string;
  studentContext?: StudentContext;
};

const SCENARIOS: Scenario[] = [
  {
    name: "speech-easy-3-6-no-student",
    category: "speech",
    difficulty: "easy",
    ageGroup: "3-6",
    focusArea: "/s/ sesi izole üretimi",
  },
  {
    name: "speech-medium-7-12-with-student",
    category: "speech",
    difficulty: "medium",
    ageGroup: "7-12",
    focusArea: "/r/ sesi kelime düzeyi",
    studentContext: {
      name: "Ayşe",
      ageYears: 9,
      workArea: "speech",
      diagnosis: "Artikülasyon bozukluğu",
      notes: "/s/ ve /ş/ sesleri edinildi. /r/ sesinde izole düzeyde başarılı.",
      aiProfile: null,
      recentCards: [
        { title: "/r/ sesi izole üretim oyunu", difficulty: "easy", createdAt: new Date() },
        { title: "/r/ sesi heceler", difficulty: "easy", createdAt: new Date() },
      ],
      completedGoalCodes: ["1.0", "1.1"],
    },
  },
  {
    name: "language-hard-13-18-with-curriculum",
    category: "language",
    difficulty: "hard",
    ageGroup: "13-18",
    focusArea: "anlatı becerileri - sebep-sonuç ilişkileri",
    curriculumGoalText:
      "- 3.2: Karmaşık cümlelerde sebep-sonuç bağlaçlarını kullanır (Dil Gelişimi Modülü)",
  },
  {
    name: "language-medium-3-6-asd",
    category: "language",
    difficulty: "medium",
    ageGroup: "3-6",
    focusArea: "kelime dağarcığı - yiyecekler",
    studentContext: {
      name: "Can",
      ageYears: 5,
      workArea: "language",
      diagnosis: "Otizm Spektrum Bozukluğu (düzey 1)",
      notes: "Görsel destek çok işe yarıyor. Rutine bağlı. Göz teması sınırlı.",
      aiProfile: null,
      recentCards: [
        { title: "Meyve adlandırma oyunu", difficulty: "easy", createdAt: new Date() },
      ],
      completedGoalCodes: [],
    },
  },
  {
    name: "hearing-easy-adult",
    category: "hearing",
    difficulty: "easy",
    ageGroup: "adult",
    focusArea: "gürültüde konuşma anlama",
  },
  {
    name: "hearing-medium-7-12-ci",
    category: "hearing",
    difficulty: "medium",
    ageGroup: "7-12",
    focusArea: "işitsel hafıza - üç öğe",
    studentContext: {
      name: "Elif",
      ageYears: 10,
      workArea: "hearing",
      diagnosis: "Bilateral koklear implant (sağ 2 yaş, sol 4 yaş)",
      notes: "İki öğeli komutları başarılı. Sessiz ortamda dört öğeye çıkabildi.",
      aiProfile: null,
      recentCards: [
        { title: "İki öğeli komut takibi", difficulty: "easy", createdAt: new Date() },
        { title: "İki öğeli komut - görsel desteksiz", difficulty: "medium", createdAt: new Date() },
      ],
      completedGoalCodes: ["2.0", "2.1"],
    },
  },
  {
    name: "speech-hard-adult-fluency",
    category: "speech",
    difficulty: "hard",
    ageGroup: "adult",
    focusArea: "akıcılık - telefon konuşması pekiştirme",
  },
  {
    name: "language-easy-7-12-adhd",
    category: "language",
    difficulty: "easy",
    ageGroup: "7-12",
    focusArea: "dinleme-anlama kısa paragraf",
    studentContext: {
      name: "Efe",
      ageYears: 8,
      workArea: "language",
      diagnosis: "DEHB",
      notes: "Dikkat süresi kısa. Kısa ve çeşitli görevler etkili.",
      aiProfile: null,
      recentCards: [],
      completedGoalCodes: [],
    },
  },
];

// ─── Generation ──────────────────────────────────────────────────────────────

type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

type GenResult = {
  card: Record<string, unknown>;
  latencyMs: number;
  usage: Usage;
  stopReason: string | null;
  variant: "baseline" | "thinking";
};

async function generateCard(
  scenario: Scenario,
  variant: "baseline" | "thinking",
): Promise<GenResult> {
  const userPrompt = buildCardPrompt({
    category: scenario.category,
    difficulty: scenario.difficulty,
    ageGroup: scenario.ageGroup,
    focusArea: scenario.focusArea,
    curriculumGoalText: scenario.curriculumGoalText,
    studentContext: scenario.studentContext,
  });

  const start = Date.now();

  const base: Anthropic.Messages.MessageCreateParamsNonStreaming = {
    model: MODEL,
    max_tokens: variant === "thinking" ? MAX_TOKENS_THINKING : MAX_TOKENS_BASELINE,
    system: [
      {
        type: "text",
        text: CARD_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [CARD_TOOL],
    // Extended thinking ile forced tool (tool/any) uyumsuz — sadece "auto"
    // çalışıyor. Adil karşılaştırma için baseline da "auto" kullanıyor.
    // System prompt modelin emit_card'ı çağırmasını zaten şart koşuyor.
    tool_choice: { type: "auto" },
    messages: [{ role: "user", content: userPrompt }],
  };

  const params =
    variant === "thinking"
      ? {
          ...base,
          temperature: 1.0, // thinking için zorunlu
          thinking: { type: "enabled" as const, budget_tokens: THINKING_BUDGET },
        }
      : { ...base, temperature: 0.4 };

  const message = await anthropic.messages.create(params);
  const latencyMs = Date.now() - start;

  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`[${scenario.name}/${variant}] emit_card çağrılmadı`);
  }

  return {
    card: toolUse.input as Record<string, unknown>,
    latencyMs,
    usage: message.usage as Usage,
    stopReason: message.stop_reason,
    variant,
  };
}

// ─── Judge ───────────────────────────────────────────────────────────────────

const JUDGE_TOOL: Anthropic.Messages.Tool = {
  name: "submit_verdict",
  description: "İki öğrenme kartını karşılaştır ve beş boyutta skorla.",
  input_schema: {
    type: "object",
    properties: {
      scores_a: {
        type: "object",
        properties: {
          clinical_accuracy: { type: "integer", minimum: 1, maximum: 10 },
          target_precision: { type: "integer", minimum: 1, maximum: 10 },
          pedagogical_depth: { type: "integer", minimum: 1, maximum: 10 },
          specificity: { type: "integer", minimum: 1, maximum: 10 },
          motivation_compliance: { type: "integer", minimum: 1, maximum: 10 },
        },
        required: [
          "clinical_accuracy",
          "target_precision",
          "pedagogical_depth",
          "specificity",
          "motivation_compliance",
        ],
      },
      scores_b: {
        type: "object",
        properties: {
          clinical_accuracy: { type: "integer", minimum: 1, maximum: 10 },
          target_precision: { type: "integer", minimum: 1, maximum: 10 },
          pedagogical_depth: { type: "integer", minimum: 1, maximum: 10 },
          specificity: { type: "integer", minimum: 1, maximum: 10 },
          motivation_compliance: { type: "integer", minimum: 1, maximum: 10 },
        },
        required: [
          "clinical_accuracy",
          "target_precision",
          "pedagogical_depth",
          "specificity",
          "motivation_compliance",
        ],
      },
      overall_winner: { type: "string", enum: ["A", "B", "tie"] },
      rationale: {
        type: "string",
        description: "Kararın kısa gerekçesi (2-4 cümle).",
      },
    },
    required: ["scores_a", "scores_b", "overall_winner", "rationale"],
  },
};

const JUDGE_SYSTEM = `Sen kıdemli bir konuşma-dil-işitme terapisti ve klinik eğitim süpervizörüsün. Sana aynı bağlam için üretilmiş İKİ öğrenme kartı verilecek (Kart A ve Kart B). Tarafsız ol, hangi pozisyonda olduklarından bağımsız olarak yalnızca içeriğe bak.

Beş boyutta 1-10 arasında puanla:

1. **clinical_accuracy** — terimler, kanıta dayalı teknikler, gelişim hiyerarşisi doğru mu? (yanlış bilgi → 1, örnek verecek kadar doğru → 10)
2. **target_precision** — verilen odak alanına/müfredat hedefine DOĞRUDAN hizmet ediyor mu? (jenerik → 1, hedefe kilitli → 10)
3. **pedagogical_depth** — adımlar spesifik mi, ipucu hiyerarşisi var mı, scaffolding var mı? (yüzeysel → 1, profesyonel derinlikte → 10)
4. **specificity** — bağlama özgü mü, yoksa "copy-paste" jenerik mi? Öğrenci bilgisi verildiyse kullanılmış mı? (jenerik → 1, kişiselleştirilmiş → 10)
5. **motivation_compliance** — yıldız/rozet/çıkartma/ödül tablosu gibi DIŞSAL ödül var mı? (dışsal ödül kullanıldı → 1-3, tamamen içsel motivasyon → 10)

Ardından overall_winner olarak "A", "B" veya "tie" seç. Kararı submit_verdict aracı ile ver, serbest metin yazma.`;

type JudgeScores = {
  clinical_accuracy: number;
  target_precision: number;
  pedagogical_depth: number;
  specificity: number;
  motivation_compliance: number;
};

type JudgeVerdict = {
  scores_a: JudgeScores;
  scores_b: JudgeScores;
  overall_winner: "A" | "B" | "tie";
  rationale: string;
};

async function judge(
  scenario: Scenario,
  cardA: Record<string, unknown>,
  cardB: Record<string, unknown>,
): Promise<JudgeVerdict> {
  const contextLines: string[] = [
    `Kategori: ${scenario.category}`,
    `Zorluk: ${scenario.difficulty}`,
    `Yaş grubu: ${scenario.ageGroup}`,
  ];
  if (scenario.focusArea) contextLines.push(`Odak alan: ${scenario.focusArea}`);
  if (scenario.curriculumGoalText)
    contextLines.push(`Müfredat hedefi:\n${scenario.curriculumGoalText}`);
  if (scenario.studentContext) {
    const s = scenario.studentContext;
    contextLines.push(
      `Öğrenci: ${s.name}, ${s.ageYears} yaş, tanı: ${s.diagnosis ?? "—"}, not: ${s.notes ?? "—"}`,
    );
    if (s.recentCards.length > 0) {
      contextLines.push(
        `Son kartlar: ${s.recentCards.map((c) => `"${c.title}"`).join(", ")}`,
      );
    }
    if (s.completedGoalCodes.length > 0) {
      contextLines.push(`Tamamlanmış hedefler: ${s.completedGoalCodes.join(", ")}`);
    }
  }

  const userPrompt = `# BAĞLAM
${contextLines.join("\n")}

# KART A
\`\`\`json
${JSON.stringify(cardA, null, 2)}
\`\`\`

# KART B
\`\`\`json
${JSON.stringify(cardB, null, 2)}
\`\`\`

Şimdi submit_verdict aracını çağır.`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    temperature: 0.2, // judge tutarlılık için düşük
    system: JUDGE_SYSTEM,
    tools: [JUDGE_TOOL],
    tool_choice: { type: "tool", name: "submit_verdict" },
    messages: [{ role: "user", content: userPrompt }],
  });

  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`[${scenario.name}] judge verdict dönmedi`);
  }
  return toolUse.input as JudgeVerdict;
}

// ─── Runner ──────────────────────────────────────────────────────────────────

type ScenarioResult = {
  scenario: string;
  baseline: GenResult;
  thinking: GenResult;
  swapped: boolean;
  verdict: JudgeVerdict;
  normalized: {
    winner_variant: "baseline" | "thinking" | "tie";
    scores_baseline: JudgeScores;
    scores_thinking: JudgeScores;
  };
};

function totalScore(s: JudgeScores): number {
  return (
    s.clinical_accuracy +
    s.target_precision +
    s.pedagogical_depth +
    s.specificity +
    s.motivation_compliance
  );
}

async function runScenario(scenario: Scenario, index: number): Promise<ScenarioResult> {
  console.log(`\n[${index + 1}/${SCENARIOS.length}] ${scenario.name}`);

  // Paralel olarak iki varyantı üret
  console.log("  → üretim (baseline + thinking paralel)...");
  const [baseline, thinkingGen] = await Promise.all([
    generateCard(scenario, "baseline"),
    generateCard(scenario, "thinking"),
  ]);
  console.log(
    `    baseline: ${baseline.latencyMs}ms, out=${baseline.usage.output_tokens}tok`,
  );
  console.log(
    `    thinking: ${thinkingGen.latencyMs}ms, out=${thinkingGen.usage.output_tokens}tok`,
  );

  // Pozisyon swap — çift index'te thinking A konumunda, tek index'te baseline A
  const swapped = index % 2 === 1;
  const cardA = swapped ? thinkingGen.card : baseline.card;
  const cardB = swapped ? baseline.card : thinkingGen.card;

  console.log(`  → judge (A=${swapped ? "thinking" : "baseline"})...`);
  const verdict = await judge(scenario, cardA, cardB);

  // A/B → baseline/thinking normalize
  const scores_baseline = swapped ? verdict.scores_b : verdict.scores_a;
  const scores_thinking = swapped ? verdict.scores_a : verdict.scores_b;
  const winner_variant: "baseline" | "thinking" | "tie" =
    verdict.overall_winner === "tie"
      ? "tie"
      : (verdict.overall_winner === "A") !== swapped
        ? "baseline"
        : "thinking";

  console.log(
    `    winner: ${winner_variant} | baseline=${totalScore(scores_baseline)}/50 thinking=${totalScore(scores_thinking)}/50`,
  );

  return {
    scenario: scenario.name,
    baseline,
    thinking: thinkingGen,
    swapped,
    verdict,
    normalized: { winner_variant, scores_baseline, scores_thinking },
  };
}

// ─── Reporting ───────────────────────────────────────────────────────────────

function pad(s: string | number, n: number): string {
  return String(s).padEnd(n);
}

function report(results: ScenarioResult[]) {
  console.log("\n" + "═".repeat(100));
  console.log("SONUÇLAR — senaryo başına");
  console.log("═".repeat(100));
  console.log(
    pad("senaryo", 38) +
      pad("winner", 12) +
      pad("base(50)", 10) +
      pad("think(50)", 11) +
      pad("base ms", 10) +
      pad("think ms", 10),
  );
  console.log("─".repeat(100));

  for (const r of results) {
    const baseTotal = totalScore(r.normalized.scores_baseline);
    const thinkTotal = totalScore(r.normalized.scores_thinking);
    console.log(
      pad(r.scenario, 38) +
        pad(r.normalized.winner_variant, 12) +
        pad(baseTotal, 10) +
        pad(thinkTotal, 11) +
        pad(r.baseline.latencyMs, 10) +
        pad(r.thinking.latencyMs, 10),
    );
  }

  // Aggregates
  const N = results.length;
  const avgScore = (pick: "baseline" | "thinking") =>
    results.reduce(
      (sum, r) => sum + totalScore(r.normalized[`scores_${pick}`]),
      0,
    ) / N;
  const avgLatency = (pick: "baseline" | "thinking") =>
    results.reduce((sum, r) => sum + r[pick].latencyMs, 0) / N;

  const wins = { baseline: 0, thinking: 0, tie: 0 };
  for (const r of results) wins[r.normalized.winner_variant]++;

  // Per-dimension averages
  const dims: (keyof JudgeScores)[] = [
    "clinical_accuracy",
    "target_precision",
    "pedagogical_depth",
    "specificity",
    "motivation_compliance",
  ];
  const avgDim = (variant: "baseline" | "thinking", dim: keyof JudgeScores) =>
    results.reduce((sum, r) => sum + r.normalized[`scores_${variant}`][dim], 0) / N;

  console.log("\n" + "═".repeat(100));
  console.log("ÖZET");
  console.log("═".repeat(100));
  console.log(
    `Kazanma oranı:   baseline=${wins.baseline}/${N}   thinking=${wins.thinking}/${N}   tie=${wins.tie}/${N}`,
  );
  console.log(
    `Ortalama skor:   baseline=${avgScore("baseline").toFixed(2)}/50   thinking=${avgScore("thinking").toFixed(2)}/50   Δ=${(avgScore("thinking") - avgScore("baseline")).toFixed(2)}`,
  );
  console.log(
    `Ortalama latency: baseline=${avgLatency("baseline").toFixed(0)}ms   thinking=${avgLatency("thinking").toFixed(0)}ms   (+${(avgLatency("thinking") - avgLatency("baseline")).toFixed(0)}ms)`,
  );

  console.log("\nBoyut başına ortalama (1-10):");
  console.log(pad("boyut", 24) + pad("baseline", 12) + pad("thinking", 12) + "Δ");
  console.log("─".repeat(60));
  for (const d of dims) {
    const b = avgDim("baseline", d);
    const t = avgDim("thinking", d);
    console.log(
      pad(d, 24) + pad(b.toFixed(2), 12) + pad(t.toFixed(2), 12) + (t - b >= 0 ? "+" : "") + (t - b).toFixed(2),
    );
  }

  // Cost/token summary
  const totalTokens = (pick: "baseline" | "thinking") =>
    results.reduce(
      (sum, r) => sum + r[pick].usage.input_tokens + r[pick].usage.output_tokens,
      0,
    );
  const totalOutput = (pick: "baseline" | "thinking") =>
    results.reduce((sum, r) => sum + r[pick].usage.output_tokens, 0);
  const totalCacheRead = (pick: "baseline" | "thinking") =>
    results.reduce(
      (sum, r) => sum + (r[pick].usage.cache_read_input_tokens ?? 0),
      0,
    );

  console.log("\nToken kullanımı (toplam):");
  console.log(
    `  baseline: input+output=${totalTokens("baseline")}, output=${totalOutput("baseline")}, cache_read=${totalCacheRead("baseline")}`,
  );
  console.log(
    `  thinking: input+output=${totalTokens("thinking")}, output=${totalOutput("thinking")}, cache_read=${totalCacheRead("thinking")}`,
  );
}

// ─── Entry ───────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY yok. .env kontrol et.");
    process.exit(1);
  }

  console.log(`Extended thinking A/B eval — ${SCENARIOS.length} senaryo, model=${MODEL}`);
  console.log(`Thinking budget: ${THINKING_BUDGET} token`);

  const results: ScenarioResult[] = [];
  for (let i = 0; i < SCENARIOS.length; i++) {
    try {
      results.push(await runScenario(SCENARIOS[i], i));
    } catch (err) {
      console.error(`  ✗ HATA: ${(err as Error).message}`);
    }
  }

  if (results.length === 0) {
    console.error("\nHiç senaryo tamamlanamadı.");
    process.exit(1);
  }

  report(results);

  // Dump raw results
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join("scripts", "eval-results", `run-${ts}.json`);
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nHam sonuçlar: ${outPath}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
