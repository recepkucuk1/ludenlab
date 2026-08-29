import { describe, expect, it } from "vitest";
import { checkEnv } from "./env";

/**
 * Ortam denetimi (2026-08 denetimi #25) — en kritik kural: PROD'DA SANDBOX ÖDEME OLMAZ.
 * Yanlış modda para almak, kısa bir kesintiden pahalıdır; bu yüzden ölümcül sayılır.
 */
const base = {
  HUB_DATABASE_URL: "x", STUDIO_DATABASE_URL: "x", ATOLYE_DATABASE_URL: "x",
  AUTH_SECRET: "x", AUTH_URL: "x", NEXT_PUBLIC_APP_URL: "x", ANTHROPIC_API_KEY: "x",
  CRON_SECRET: "x", IYZICO_API_KEY: "x", IYZICO_SECRET_KEY: "x", DB_SSL_CA: "pem",
} as unknown as NodeJS.ProcessEnv;

describe("checkEnv — ödeme modu", () => {
  it("PROD'da sandbox VARSAYILAN olarak UYARI (siteyi düşürmez)", () => {
    const r = checkEnv({ ...base, NODE_ENV: "production", IYZICO_BASE_URL: "https://sandbox-api.iyzipay.com" });
    expect(r.fatal).toEqual([]);
    expect(r.warnings.join(" ")).toMatch(/SANDBOX/);
  });

  it("ENV_STRICT=true ile sandbox ÖLÜMCÜL olur", () => {
    const r = checkEnv({ ...base, NODE_ENV: "production", ENV_STRICT: "true", IYZICO_BASE_URL: "https://sandbox-api.iyzipay.com" });
    expect(r.fatal.length).toBe(1);
    expect(r.fatal[0]).toMatch(/SANDBOX/);
  });

  it("ENV_STRICT=true ve IYZICO_BASE_URL tanımsızsa ÖLÜMCÜL", () => {
    const r = checkEnv({ ...base, NODE_ENV: "production", ENV_STRICT: "true" });
    expect(r.fatal.length).toBe(1);
    expect(r.fatal[0]).toMatch(/IYZICO_BASE_URL/);
  });

  it("PROD + ENV_STRICT + gerçek URL → ölümcül yok", () => {
    const r = checkEnv({ ...base, NODE_ENV: "production", ENV_STRICT: "true", IYZICO_BASE_URL: "https://api.iyzipay.com" });
    expect(r.fatal).toEqual([]);
  });

  it("DEV'de sandbox serbest (ölümcül değil)", () => {
    const r = checkEnv({ ...base, NODE_ENV: "development", IYZICO_BASE_URL: "https://sandbox-api.iyzipay.com" });
    expect(r.fatal).toEqual([]);
  });
});

describe("checkEnv — uyarılar", () => {
  it("eksik değişkenleri uyarı olarak listeler ama ÖLDÜRMEZ", () => {
    const r = checkEnv({ NODE_ENV: "development" } as unknown as NodeJS.ProcessEnv);
    expect(r.fatal).toEqual([]);
    expect(r.warnings.length).toBeGreaterThan(5);
    expect(r.warnings.join(" ")).toMatch(/AUTH_SECRET/);
  });

  it("DB_SSL_CA yoksa TLS doğrulaması uyarısı verir", () => {
    const prev = process.env.DB_SSL_CA;
    delete process.env.DB_SSL_CA;
    const r = checkEnv({ ...base, NODE_ENV: "development", IYZICO_BASE_URL: "https://api.iyzipay.com" });
    expect(r.warnings.join(" ")).toMatch(/DB_SSL_CA/);
    if (prev !== undefined) process.env.DB_SSL_CA = prev;
  });
});
