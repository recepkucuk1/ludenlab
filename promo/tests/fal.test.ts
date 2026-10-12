import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { falKey } from "../scripts/lib/fal.ts";

test("FAL_KEY ortam değişkeni her şeyin önündedir", () => {
  const eski = process.env.FAL_KEY;
  process.env.FAL_KEY = "deneme-anahtar";
  try {
    assert.equal(falKey("/yok/boyle/bir/yer"), "deneme-anahtar");
  } finally {
    if (eski === undefined) delete process.env.FAL_KEY;
    else process.env.FAL_KEY = eski;
  }
});

test("FAL_KEY yok, .env yok, git deposu değil: açık hatayla düşer", () => {
  const eski = process.env.FAL_KEY;
  delete process.env.FAL_KEY;
  const gecici = mkdtempSync(join(tmpdir(), "fal-test-"));
  try {
    assert.throws(
      () => execFileSync("git", ["-C", gecici, "rev-parse"], { stdio: "ignore" }),
      "test önkoşulu: geçici dizin bir git deposunun içinde olmamalı",
    );
    assert.throws(() => falKey(gecici), /FAL_KEY bulunamadı/);
  } finally {
    rmSync(gecici, { recursive: true, force: true });
    if (eski === undefined) delete process.env.FAL_KEY;
    else process.env.FAL_KEY = eski;
  }
});
