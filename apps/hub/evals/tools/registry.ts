// apps/hub/evals/tools/registry.ts
import type { ToolAdapter } from "../lib/core";

/* EVAL_TOOL → adaptör. Yeni araç eklerken buraya bir satır. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAdapter = ToolAdapter<any>;

const LOADERS: Record<string, () => Promise<{ adapter: AnyAdapter }>> = {
  "studio/social-story": () => import("./studio/social-story/adapter"),
  "studio/articulation": () => import("./studio/articulation/adapter"),
  "studio/homework": () => import("./studio/homework/adapter"),
  "studio/session-summary": () => import("./studio/session-summary/adapter"),
  "studio/weekly-plan": () => import("./studio/weekly-plan/adapter"),
  "studio/comm-board": () => import("./studio/comm-board/adapter"),
  "studio/matching-game": () => import("./studio/matching-game/adapter"),
  "studio/phonation": () => import("./studio/phonation/adapter"),
  "atolye/bep": () => import("./atolye/bep/adapter"),
};

export const TOOL_IDS = Object.keys(LOADERS);

export async function loadAdapter(id: string): Promise<AnyAdapter> {
  const load = LOADERS[id];
  if (!load) throw new Error(`Bilinmeyen EVAL_TOOL '${id}'. Seçenekler: ${TOOL_IDS.join(", ")}`);
  return (await load()).adapter;
}
