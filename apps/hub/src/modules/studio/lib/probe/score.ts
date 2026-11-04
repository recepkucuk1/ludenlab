// apps/hub/src/modules/studio/lib/probe/score.ts
/* Puanlama (spec §6): bağımsız doğru = correct && !cued; cued olanlar cuedCount'a girer, yüzdeye GİRMEZ. */
export interface ScoredRun {
  correct: number;
  total: number;
  pct: number;
  cuedCount: number;
}

export function scoreItems(items: ReadonlyArray<{ correct: boolean; cued: boolean }>): ScoredRun {
  const total = items.length;
  const correct = items.filter((i) => i.correct && !i.cued).length;
  const cuedCount = items.filter((i) => i.cued).length;
  const pct = total === 0 ? 0 : Math.round((100 * correct) / total);
  return { correct, total, pct, cuedCount };
}
