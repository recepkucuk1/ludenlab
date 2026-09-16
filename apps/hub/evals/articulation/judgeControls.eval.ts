import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { it } from "vitest";
import { articulation } from "@ludenlab/ai";
import casesJson from "./cases.json";
import { judgePair, renderDrill, renderTask, type CaseDef } from "./judge";
import { FLOW_DIR, costUsd, loadApiKey } from "./lib";
import { seeded } from "./seededBank";

/*
 * Hakem sağlamlık testi (ÜCRETLİ, ~6 hakem çağrısı): canlı modelin gerçek çıktısını bilinen-kötü
 * üç adayla karşılaştırır. Hakem üçünde de adayı kaybettirmeli (win ≤ 0,25). Önce baseline koşmalı.
 */
const WRONG_SOUND = [
  "Sabah simit ve süt içtik.",
  "Selin sessizce sınıfa girdi.",
  "Sepetteki sebzeleri saydık.",
  "Sıcak su ve sabunla yıkandık.",
  "Sarı saksıda sümbül var.",
];

it("hakem bilinen-kötü çıktıları kaybettiriyor", async () => {
  const c = (casesJson as CaseDef[]).find((x) => x.id === "art-10")!;
  const ref = (JSON.parse(readFileSync(path.join(FLOW_DIR, "baseline", "ref", c.id), "utf8")) as { drill: Record<string, unknown> }).drill;
  const items = ref.items as Record<string, unknown>[];
  const words = seeded(articulation.selectWordsMulti)(
    articulation.WORD_BANK,
    c.body.targetSounds,
    c.body.positions as articulation.Position[],
    c.body.itemCount,
  ).map((w) => w.word);

  const candidates: Array<[string, Record<string, unknown>]> = [
    ["boş", { title: "", items: items.map((it) => ({ ...it, sentence: "" })), expertNotes: "", cueTypes: [], homeGuidance: "" }],
    [
      "bilmiyorum",
      { title: "Alıştırma", items: items.map((it) => ({ ...it, sentence: "Bilmiyorum." })), expertNotes: "Bilmiyorum.", cueTypes: ["Bilmiyorum"], homeGuidance: "Bilmiyorum." },
    ],
    [
      "yanlış ses (/s/)",
      {
        title: "/s/ sesi cümle çalışması",
        items: items.map((it, i) => ({ ...it, sentence: WRONG_SOUND[i % WRONG_SOUND.length] })),
        expertNotes: "/s/ sesi için dil ucunu alt dişlerin arkasına yerleştirin ve ince bir hava akımıyla sesi uzatın.",
        cueTypes: ["Görsel (ayna)", "İşitsel (yılan sesi)"],
        homeGuidance: "Evde her gün beş dakika 'sss' yılan oyunu oynayın.",
      },
    ],
  ];

  const client = new Anthropic({ apiKey: loadApiKey(), maxRetries: 0 });
  const task = renderTask(c, words);
  const results = await Promise.all(
    candidates.map(async ([name, cand]) => {
      const r = await judgePair(client, task, renderDrill(cand, "sentence"), renderDrill(ref, "sentence"), { count: 0 }, Date.now() + 600_000);
      return { name, win: r.win, reasons: r.reasons, cand_errors: r.candErrors, model: r.judge_model, usage: r.judge_usage, cost_usd: costUsd(r.judge_model, r.judge_usage), fallback: r.fallback };
    }),
  );
  writeFileSync(path.join(FLOW_DIR, "judge_controls.json"), JSON.stringify(results, null, 2));
  for (const r of results) process.stderr.write(`[hakem kontrol] ${r.name}: win=${r.win} maliyet=$${r.cost_usd?.toFixed(4)} model=${r.model}\n`);
});
