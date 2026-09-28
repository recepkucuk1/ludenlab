import { test } from "node:test";
import assert from "node:assert/strict";
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
