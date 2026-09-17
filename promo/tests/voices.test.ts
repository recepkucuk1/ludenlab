import { test } from "node:test";
import assert from "node:assert/strict";
import { voiceFor } from "../src/reels-lib/voices.ts";
import { REELS } from "../scripts/reels.ts";

const reel = (id: string) => REELS.find((r) => r.script.id === id)!.script;

test("Studio reels'leri Matilda, Atölye reels'i Chris", () => {
  for (const id of ["r2", "r3", "r4"]) {
    for (const s of reel(id).scenes) assert.equal(voiceFor(reel(id), s), "Matilda", `${id}-${s.id}`);
  }
  for (const s of reel("r5").scenes) assert.equal(voiceFor(reel("r5"), s), "Chris", `r5-${s.id}`);
});

test("Reels 1: Studio kısmı Matilda, Atölye tanıtımı ve kapanış Chris", () => {
  const r1 = reel("r1");
  assert.deepEqual(
    r1.scenes.map((s) => voiceFor(r1, s)),
    ["Matilda", "Matilda", "Matilda", "Chris", "Chris"],
  );
});
