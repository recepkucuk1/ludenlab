// apps/hub/evals/lib/fixtures.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import type { AtolyeFixture, Fixture, StudioFixture } from "./core";

const DIR = path.resolve(import.meta.dirname, "../fixtures");

function load<T>(file: string): Record<string, T> {
  return JSON.parse(readFileSync(path.join(DIR, file), "utf8")) as Record<string, T>;
}

export function studioFixtures(): Record<string, StudioFixture> {
  return load<StudioFixture>("studio.json");
}

export function atolyeFixtures(): Record<string, AtolyeFixture> {
  return load<AtolyeFixture>("atolye.json");
}

/** Modüle göre fikstürü getirir; kimlik bilinmiyorsa hata (vaka dosyası yanlış yazılmıştır). */
export function resolveFixture(module: "studio" | "atolye", id: string | null): Fixture | null {
  if (!id) return null;
  const table = module === "studio" ? studioFixtures() : atolyeFixtures();
  const f = table[id];
  if (!f) throw new Error(`Bilinmeyen fikstür: ${module}/${id}`);
  return f;
}

/** Gerçek adın ilk kelimesi — istekte sızıntı kontrolü için. */
export function realFirstName(f: Fixture | null): string {
  if (!f) return "";
  const full = "name" in f ? f.name : f.code;
  return full.split(" ")[0] ?? "";
}
