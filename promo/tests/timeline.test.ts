import { test } from "node:test";
import assert from "node:assert/strict";
import { AUDIO_PAD_SEC, buildTimeline, voPath } from "../src/reels-lib/timeline.ts";
import type { SceneScript } from "../src/reels-lib/types.ts";

const scenes: SceneScript[] = [
  { id: "s1", vo: "bir iki", screen: "", defaultSec: 3 },
  { id: "s2", vo: "üç", screen: "", defaultSec: 2 },
];

test("voPath reels ve sahne id'sinden public yolu üretir", () => {
  assert.equal(voPath("r1", "s2"), "vo/r1-s2.mp3");
});

test("ses yoksa varsayılan süre kullanılır ve sahneler art arda dizilir", () => {
  const t = buildTimeline("r1", scenes, [null, null], 30);
  assert.deepEqual(t.scenes, [
    { id: "s1", from: 0, durationInFrames: 90, captionFrames: 72, audioSrc: null },
    { id: "s2", from: 90, durationInFrames: 60, captionFrames: 48, audioSrc: null },
  ]);
  assert.equal(t.durationInFrames, 150);
});

test("ses varsa süre = ses + nefes payı, altyazı ses bitince tamamlanır", () => {
  const t = buildTimeline("r1", scenes, [2, null], 30);
  const expected = Math.ceil((2 + AUDIO_PAD_SEC) * 30);
  assert.deepEqual(t.scenes[0], {
    id: "s1",
    from: 0,
    durationInFrames: expected,
    captionFrames: 60,
    audioSrc: "vo/r1-s1.mp3",
  });
  assert.equal(t.scenes[1].from, expected);
  assert.equal(t.durationInFrames, expected + 60);
});

test("eksik süre dizisi elemanı ses yok sayılır", () => {
  const t = buildTimeline("r1", scenes, [], 30);
  assert.equal(t.durationInFrames, 150);
});
