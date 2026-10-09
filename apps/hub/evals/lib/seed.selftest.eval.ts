// apps/hub/evals/lib/seed.selftest.eval.ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { als, type CaseStore } from "./evalContext";
import { fnv1a, installSeededRandom, mulberry32, seededRandom } from "./seed";

const store = (caseId: string): CaseStore => ({
  caseId, rep: 0, fixture: null, exchangeDir: "/tmp", calls: [], pending: [], apiError: null, saved: null,
  refunded: false, deadline: Infinity, retries: { count: 0 },
});
const draw = (caseId: string, rep = 0, n = 5) => als.run({ ...store(caseId), rep }, () => Array.from({ length: n }, () => Math.random()));

describe("tohumlu rastgelelik", () => {
  let restore: () => void;
  beforeAll(() => { restore = installSeededRandom(); });
  afterAll(() => restore());

  it("fnv1a/mulberry32 deterministik, [0,1) aralığında", () => {
    expect(fnv1a("abc")).toBe(fnv1a("abc"));
    expect(fnv1a("abc")).not.toBe(fnv1a("abd"));
    const r = mulberry32(42);
    const xs = Array.from({ length: 1000 }, r);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(new Set(xs).size).toBeGreaterThan(990);
  });
  it("aynı vaka → aynı dizi (tekrardan bağımsız); farklı vaka → farklı dizi", () => {
    expect(draw("art-01", 0)).toEqual(draw("art-01", 1));
    expect(draw("art-01")).not.toEqual(draw("art-02"));
  });
  it("vaka bağlamı yokken özgün Math.random çalışır", () => {
    const a = Math.random();
    const b = Math.random();
    expect(a).not.toBe(b);
  });
  it("seededRandom bağlam dışında null döner; restore özgün fonksiyonu geri koyar", () => {
    expect(seededRandom()).toBeNull();
    restore();
    expect(Math.random.name).not.toBe("evalSeededRandom");
    restore = installSeededRandom();
  });
});
