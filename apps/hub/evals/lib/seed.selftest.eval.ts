// apps/hub/evals/lib/seed.selftest.eval.ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { als, type CaseStore } from "./evalContext";
import { fnv1a, installSeededRandom, mulberry32, seededRandom } from "./seed";

/** Yerleştirmeden önceki özgün Math.random (geri alma kimlik denetimi için). */
const native = Math.random;

const store = (caseId: string): CaseStore => ({
  caseId, rep: 0, fixture: null, exchangeDir: "/tmp", calls: [], pending: [], apiError: null, saved: null,
  refunded: false, deadline: Infinity, retries: { count: 0 },
});
const draw = (caseId: string, rep = 0, n = 5) => als.run({ ...store(caseId), rep }, () => Array.from({ length: n }, () => Math.random()));
const expected = (key: string, n: number) => Array.from({ length: n }, mulberry32(fnv1a(key)));

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
  it("bilinen cevaplar: saklı referanslar bu tam sayılara dayanır", () => {
    expect(fnv1a("a")).toBe(0xe40c292c);
    expect(fnv1a("foobar")).toBe(0xbf9cf968);
    expect(mulberry32(fnv1a("art-01"))()).toBeCloseTo(0.32484513707458973, 12);
  });
  it("aynı vaka → aynı dizi (tekrardan bağımsız); farklı vaka → farklı dizi", () => {
    expect(draw("art-01", 0)).toEqual(draw("art-01", 1));
    expect(draw("art-01")).not.toEqual(draw("art-02"));
  });
  it("dizi tam olarak mulberry32(fnv1a(vaka kimliği)) akışıdır ve çekimler birbirinden farklıdır", () => {
    expect(draw("art-01", 0, 3)).toEqual(Array.from({ length: 3 }, mulberry32(fnv1a("art-01"))));
    expect(new Set(draw("art-01")).size).toBe(5);
  });
  it("seedKey verilirse tohum ondan gelir; vaka kimliği akışından farklıdır", () => {
    const keyed = als.run({ ...store("art-01"), seedKey: "[[\"s\"],[\"initial\"],5]" }, () => Array.from({ length: 3 }, () => Math.random()));
    expect(keyed).toEqual(expected("[[\"s\"],[\"initial\"],5]", 3));
    expect(keyed).not.toEqual(expected("art-01", 3));
  });
  it("vaka bağlamı yokken özgün Math.random çalışır", () => {
    const a = Math.random();
    const b = Math.random();
    expect(a).not.toBe(b);
  });
  it("seededRandom bağlam dışında null döner", () => {
    expect(seededRandom()).toBeNull();
  });
  it("iç içe geçen eşzamansız vakalar her biri yalnız kendi dizisini alır", async () => {
    const run = (caseId: string, n: number) =>
      als.run(store(caseId), async () => {
        const out: number[] = [];
        for (let i = 0; i < n; i++) {
          out.push(Math.random());
          await Promise.resolve();
        }
        return out;
      });
    const [a, b] = await Promise.all([run("art-01", 5), run("art-02", 5)]);
    expect(a).toEqual(expected("art-01", 5));
    expect(b).toEqual(expected("art-02", 5));
  });
});

describe("kurulum ve geri alma", () => {
  it("restore özgün fonksiyonu kimlikle geri koyar", () => {
    const restore = installSeededRandom();
    expect(Math.random).not.toBe(native);
    restore();
    expect(Math.random).toBe(native);
  });
  it("ikinci kurulum no-op'tur; no-op çağrısı kurulumu geri almaz", () => {
    const restore = installSeededRandom();
    const installed = Math.random;
    const noop = installSeededRandom();
    expect(Math.random).toBe(installed);
    noop();
    expect(Math.random).toBe(installed);
    restore();
    expect(Math.random).toBe(native);
  });
  it("sonradan değiştirilmiş Math.random'ı (ör. spy) geri almaz ve yeniden kurulabilir", () => {
    const restore = installSeededRandom();
    const spy = () => 0.5;
    Math.random = spy;
    restore();
    expect(Math.random).toBe(spy);
    Math.random = native;
    const again = installSeededRandom();
    expect(Math.random).not.toBe(native);
    again();
    expect(Math.random).toBe(native);
  });
  it("eski restore, sonraki kurulumu bozmaz", () => {
    const first = installSeededRandom();
    first();
    const second = installSeededRandom();
    const installed = Math.random;
    first();
    expect(Math.random).toBe(installed);
    second();
    expect(Math.random).toBe(native);
  });
});
