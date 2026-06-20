import { describe, it, expect, vi } from "vitest";
import { withRetry } from "./retry";

const noSleep = async () => {};

describe("withRetry", () => {
  it("ilk denemede başarılıysa tek çağırır", async () => {
    const fn = vi.fn(async () => "ok");
    expect(await withRetry(fn, { sleep: noSleep })).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("geçici hatada tekrar dener, N. denemede başarılı olursa döner", async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls++;
      if (calls < 3) throw new Error("locked: exhausted balance");
      return "ok";
    });
    expect(await withRetry(fn, { sleep: noSleep })).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("tüm denemeler başarısızsa SON hatayı fırlatır", async () => {
    const fn = vi.fn(async () => {
      throw new Error("boom");
    });
    await expect(withRetry(fn, { attempts: 3, sleep: noSleep })).rejects.toThrow("boom");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("denemeler arası sleep'i backoff ile çağırır (son denemeden sonra çağırmaz)", async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi.fn(async () => {
      throw new Error("x");
    });
    await expect(withRetry(fn, { attempts: 3, sleep })).rejects.toThrow();
    expect(sleep).toHaveBeenCalledTimes(2); // 3 deneme → aralarda 2 bekleme
  });
});
