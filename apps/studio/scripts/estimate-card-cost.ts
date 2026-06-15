/**
 * Kart üretim maliyet tahmini.
 *
 *   npx tsx scripts/estimate-card-cost.ts
 *
 * Gerçek API çağrısı YAPMAZ — yalnızca `anthropic.messages.countTokens`
 * ile sistem prompt + tool şeması + örnek user prompt'ların token sayısını
 * ölçer. Sonuçları Sonnet 4.6 fiyatlarıyla USD'ye çevirir.
 *
 * Üç senaryo ölçer:
 *   1) Öğrencisiz, müfredat hedefi yok        — en küçük user prompt
 *   2) Öğrencisiz, 3 alt hedefli müfredat     — orta user prompt
 *   3) Öğrenci + 5 son kart + tanı + 3 hedef  — en büyük user prompt
 *
 * Her senaryo için:
 *   - Soğuk çağrı maliyeti
 *   - Sıcak cache maliyeti
 *   - Cache write overhead
 *   - Örnek 900-token output varsayımıyla toplam tahmin
 *
 * Maliyet: countTokens ücretsizdir, bu script ~$0 harcar.
 */

import { config as loadEnv } from "dotenv";
import { existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const candidateEnvs = [
  resolve(process.cwd(), ".env"),
  resolve(__dirname, "../.env"),
  resolve(__dirname, "../../../../.env"),
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
  type StudentContext,
} from "../src/lib/prompts";
import { SONNET_4_6_PRICING } from "../src/lib/anthropic";

const MODEL = "claude-sonnet-4-6";
const ASSUMED_OUTPUT_TOKENS = 900; // tool_use ile ortalama tam kart çıktısı

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface Scenario {
  label: string;
  userPrompt: string;
}

const scenarios: Scenario[] = [
  {
    label: "A) Öğrencisiz, hedef yok",
    userPrompt: buildCardPrompt({
      category: "speech",
      difficulty: "medium",
      ageGroup: "7-12",
    }),
  },
  {
    label: "B) Öğrencisiz, 3 alt hedef",
    userPrompt: buildCardPrompt({
      category: "speech",
      difficulty: "medium",
      ageGroup: "7-12",
      focusArea: "/s/ sesi artikülasyonu, kelime düzeyinde",
      curriculumGoalText: [
        "- 1.1: /s/ sesini izole olarak üretir (Artikülasyon - Sessiz Harfler)",
        "- 1.2: /s/ sesini hecede üretir (Artikülasyon - Sessiz Harfler)",
        "- 1.3: /s/ sesini kelime başında üretir (Artikülasyon - Sessiz Harfler)",
      ].join("\n"),
    }),
  },
  {
    label: "C) Öğrenci + 5 kart + tanı + 3 hedef",
    userPrompt: buildCardPrompt({
      category: "language",
      difficulty: "hard",
      ageGroup: "7-12",
      focusArea: "Hikâye anlatımı, ardışıklık ve neden-sonuç bağdaştırıcıları",
      curriculumGoalText: [
        "- 3.2: 4-5 resimlik hikâye sırasını oluşturur (Dil - Anlatı)",
        "- 3.3: Neden-sonuç bağdaştırıcılarını uygun kullanır (Dil - Bağlaçlar)",
        "- 3.4: Karakter duygularını açıklar (Dil - Sosyal Dil)",
      ].join("\n"),
      studentContext: {
        name: "Ayşe",
        ageYears: 9,
        workArea: "language",
        diagnosis: "Gelişimsel Dil Bozukluğu (DLD), hafif derecede",
        notes:
          "Dikkat süresi kısa, yapılandırılmış görevlerde daha iyi performans gösteriyor. Görsel destekle motivasyonu artıyor.",
        aiProfile:
          "Kelime hazinesi yaşına yakın, ancak kompleks cümle kurulumu zayıf. Anlatıda karakter perspektifi almakta zorlanıyor.",
        recentCards: [
          { title: "Basit hikâye sıralama (3 resim)", difficulty: "medium", createdAt: new Date() },
          { title: "Günlük rutin anlatımı", difficulty: "medium", createdAt: new Date() },
          { title: "Duygu kelimeleri eşleştirme", difficulty: "easy", createdAt: new Date() },
          { title: "Çünkü / ama bağlaçları", difficulty: "medium", createdAt: new Date() },
          { title: "4 resim hikâye sıralama", difficulty: "medium", createdAt: new Date() },
        ],
        completedGoalCodes: ["3.0", "3.1"],
      } satisfies StudentContext,
    }),
  },
];

interface Row {
  label: string;
  userPromptTok: number;
  systemPlusToolsTok: number;
  totalInputTok: number;
  coldUsd: number;
  warmUsd: number;
  cacheWriteOverheadUsd: number;
  assumedOutputUsd: number;
}

async function measureScenario(s: Scenario): Promise<Row> {
  // 1) sistem + tool şeması + user prompt ile toplam input ölç
  const withAll = await anthropic.messages.countTokens({
    model: MODEL,
    system: CARD_SYSTEM_PROMPT,
    tools: [CARD_TOOL],
    messages: [{ role: "user", content: s.userPrompt }],
  });

  // 2) sadece sistem + tool şeması ölçmek için minimal user prompt ile
  //    ikinci ölçüm, farkı user prompt olarak at
  const withoutUser = await anthropic.messages.countTokens({
    model: MODEL,
    system: CARD_SYSTEM_PROMPT,
    tools: [CARD_TOOL],
    messages: [{ role: "user", content: "." }],
  });

  const userPromptTok = withAll.input_tokens - withoutUser.input_tokens;
  const systemPlusToolsTok = withoutUser.input_tokens - 1; // "." ~1 tok
  const totalInputTok = withAll.input_tokens;

  const p = SONNET_4_6_PRICING;

  // Soğuk: tüm input full fiyat
  const coldInputUsd = (totalInputTok / 1_000_000) * p.inputPerMTok;

  // Sıcak: sistem+tools cache'ten okunur, sadece user prompt full fiyat
  const warmCacheReadUsd = (systemPlusToolsTok / 1_000_000) * p.cacheReadPerMTok;
  const warmFreshUsd = (userPromptTok / 1_000_000) * p.inputPerMTok;
  const warmInputUsd = warmCacheReadUsd + warmFreshUsd;

  // Cache write overhead (ilk ısıtma): fresh input yerine cache write fiyatı
  const cacheWriteUsd = (systemPlusToolsTok / 1_000_000) * p.cacheWritePerMTok;
  const cacheWriteOverheadUsd = cacheWriteUsd - coldInputUsd * (systemPlusToolsTok / totalInputTok);

  // Çıktı varsayımı
  const assumedOutputUsd = (ASSUMED_OUTPUT_TOKENS / 1_000_000) * p.outputPerMTok;

  return {
    label: s.label,
    userPromptTok,
    systemPlusToolsTok,
    totalInputTok,
    coldUsd: coldInputUsd + assumedOutputUsd,
    warmUsd: warmInputUsd + assumedOutputUsd,
    cacheWriteOverheadUsd,
    assumedOutputUsd,
  };
}

function fmt(n: number): string {
  return n.toFixed(5).padStart(8);
}

async function main() {
  console.log(`\nKart üretim maliyet tahmini — model ${MODEL}`);
  console.log(
    `Fiyat: input $${SONNET_4_6_PRICING.inputPerMTok}/M, output $${SONNET_4_6_PRICING.outputPerMTok}/M, cacheW $${SONNET_4_6_PRICING.cacheWritePerMTok}/M, cacheR $${SONNET_4_6_PRICING.cacheReadPerMTok}/M`,
  );
  console.log(`Çıktı varsayımı: ${ASSUMED_OUTPUT_TOKENS} token (tipik kart boyutu)\n`);

  const rows: Row[] = [];
  for (const s of scenarios) {
    process.stdout.write(`  ölçülüyor: ${s.label} ... `);
    const row = await measureScenario(s);
    rows.push(row);
    console.log("ok");
  }

  console.log("\n=== TOKEN DAĞILIMI ===");
  console.log(
    "senaryo".padEnd(42) +
      "system+tools".padStart(14) +
      "user prompt".padStart(14) +
      "toplam in".padStart(12),
  );
  for (const r of rows) {
    console.log(
      r.label.padEnd(42) +
        r.systemPlusToolsTok.toString().padStart(14) +
        r.userPromptTok.toString().padStart(14) +
        r.totalInputTok.toString().padStart(12),
    );
  }

  console.log("\n=== KART BAŞI MALİYET (USD) ===");
  console.log(
    "senaryo".padEnd(42) +
      "soğuk".padStart(10) +
      "sıcak".padStart(10) +
      "cache write ek".padStart(16),
  );
  for (const r of rows) {
    console.log(
      r.label.padEnd(42) +
        `$${fmt(r.coldUsd)}` +
        `$${fmt(r.warmUsd)}` +
        `$${fmt(r.cacheWriteOverheadUsd)}`,
    );
  }

  console.log("\n=== ÖLÇEKLEME ===");
  console.log("100 kart üretimi (sıcak cache varsayımı):");
  for (const r of rows) {
    console.log(`  ${r.label}: $${(r.warmUsd * 100).toFixed(2)}`);
  }

  console.log("\nNotlar:");
  console.log("- 'soğuk' = cache hiç kullanılmadan (hem sistem hem user full fiyat)");
  console.log("- 'sıcak' = sistem+tools cache'ten okunuyor, user prompt full fiyat");
  console.log("- 'cache write ek' = her 5 dakikada bir cache ısıtma overhead'i");
  console.log(`- Çıktı sabitini ${ASSUMED_OUTPUT_TOKENS} token varsaydık — gerçek değer kart boyutuna göre 600-1200 arasında oynar`);
  console.log("- Gerçek rakam için: generate route'u çalıştır, server log'unda [cards/generate] usage satırına bak\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
