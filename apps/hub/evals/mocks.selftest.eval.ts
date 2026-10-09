// apps/hub/evals/mocks.selftest.eval.ts
import "./mocks.setup";
import { describe, expect, it } from "vitest";
import { als, type CaseStore } from "./lib/evalContext";
import { studioCreditsMock } from "./lib/mocks/studio";

const store = (caseId: string): CaseStore => ({
  caseId, rep: 0, fixture: null, exchangeDir: "/tmp", calls: [], pending: [], apiError: null, saved: null,
  refunded: false, deadline: Infinity, retries: { count: 0 },
});
const first = (caseId: string, rep = 0) => als.run({ ...store(caseId), rep }, () => Math.random());

describe("mocks.setup: tohum kurulumu", () => {
  it("içe aktarma Math.random'ı tohumlu sürümle değiştirir", () => {
    expect(Math.random.name).toBe("evalSeededRandom");
  });
  it("aynı vaka kimliği iki ayrı als.run'da aynı ilk değeri verir (tekrar numarası tohuma girmez)", () => {
    expect(first("art-01")).toBe(first("art-01"));
    expect(first("art-01", 0)).toBe(first("art-01", 3));
    expect(first("art-01")).not.toBe(first("art-02"));
  });
  it("vi.mock dinamik içe aktarmayı yakalar: studio kredisi taklitten gelir (gerçek DB'ye gidilmez)", async () => {
    const real = await import("@studio/lib/credits");
    expect(real.reserveCredits).toBe(studioCreditsMock.reserveCredits);
  });
});
