// apps/hub/evals/lib/testFlow.ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { onTestFinished } from "vitest";

/** Selftest'lerin geçici akış dizini (`runEval` `flowDir`). Yalnız TEST GEÇERSE silinir: kalırsa hata incelemesi için yerinde durur.
    Bir test (`it`) içinde çağrılır (`onTestFinished` bağlamı gerekir). `onek`: dizin adının başı (hata ayıklarken hangi dosyadan olduğu görünsün). */
export function tempFlow(onek = "flow-"): string {
  const dir = mkdtempSync(path.join(tmpdir(), onek));
  onTestFinished(({ task }) => {
    if (task.result?.state === "pass") rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}
