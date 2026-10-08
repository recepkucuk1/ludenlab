// apps/hub/evals/lib/fixtures.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { HarnessError, type AtolyeFixture, type Fixture, type StudioFixture } from "./core";

const DIR = path.resolve(import.meta.dirname, "../fixtures");

/** Fikstür dosyasını okur; her anahtar kaydın `id`'siyle aynı olmalı (vaka dosyaları anahtarla bağlanır,
    taklitler `id` ile eşler — ikisi ayrışırsa öğrenci sessizce "bulunamadı" olur). */
function load<T extends { id: string }>(file: string): Record<string, T> {
  const table = JSON.parse(readFileSync(path.join(DIR, file), "utf8")) as Record<string, T>;
  for (const [key, value] of Object.entries(table)) {
    if (key !== value.id) throw new HarnessError(`Fikstür anahtarı ile id ayrışıyor: ${file} ${key} ≠ ${value.id}`, "config");
  }
  return table;
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
  if (!f) throw new HarnessError(`Bilinmeyen fikstür: ${module}/${id}`, "config");
  return f;
}

/** Gerçek adın ilk kelimesi — istekte sızıntı kontrolü için. */
export function realFirstName(f: Fixture | null): string {
  if (!f) return "";
  const full = "name" in f ? f.name : f.code;
  return full.trim().split(/\s+/)[0] ?? "";
}
