import { afterEach, describe, expect, it } from "vitest";
import { rootCertificates } from "node:tls";
import { loadDbCa, pgSsl, dbSslVerified } from "./dbSsl";

/**
 * DB_SSL_CA iki biçimde gelebilir: ham PEM (satır sonlarıyla) ya da hPanel'in tek satırlık
 * env alanına yapıştırılabilen base64(PEM). CA verildiğinde sistem kökleri KORUNUR
 * (Node `ca` seçeneği güven deposunu değiştirir; pooler dışı bir host public CA kullanırsa
 * kopmasın). Geçersiz değer sessizce "CA yok" sayılmaz — çözümlenemedi bilgisi dışarı verilir.
 */
const PEM = "-----BEGIN CERTIFICATE-----\nMIIBdummy\n-----END CERTIFICATE-----\n";
const SUPA = "postgresql://u:p@aws-1-eu-west-1.pooler.supabase.com:5432/postgres";

describe("loadDbCa", () => {
  const orig = process.env.DB_SSL_CA;
  afterEach(() => {
    if (orig === undefined) delete process.env.DB_SSL_CA;
    else process.env.DB_SSL_CA = orig;
  });

  it("tanımsız/boş → undefined", () => {
    expect(loadDbCa(undefined)).toBeUndefined();
    expect(loadDbCa("   ")).toBeUndefined();
  });

  it("ham PEM aynen döner", () => {
    expect(loadDbCa(PEM)).toBe(PEM.trim());
  });

  it("base64(PEM) çözülür", () => {
    const b64 = Buffer.from(PEM, "utf8").toString("base64");
    expect(loadDbCa(b64)).toBe(PEM.trim());
  });

  it("PEM olmayan çöp → undefined (geçersiz)", () => {
    expect(loadDbCa("hello-world")).toBeUndefined();
    expect(loadDbCa(Buffer.from("not a cert").toString("base64"))).toBeUndefined();
  });

  it("dbSslVerified env'i okur", () => {
    process.env.DB_SSL_CA = PEM;
    expect(dbSslVerified()).toBe(true);
    process.env.DB_SSL_CA = "garbage";
    expect(dbSslVerified()).toBe(false);
  });
});

describe("pgSsl", () => {
  const orig = process.env.DB_SSL_CA;
  afterEach(() => {
    if (orig === undefined) delete process.env.DB_SSL_CA;
    else process.env.DB_SSL_CA = orig;
  });

  it("supabase olmayan host → ssl yok", () => {
    delete process.env.DB_SSL_CA;
    expect(pgSsl("postgresql://u:p@localhost:5432/db")).toBeUndefined();
  });

  it("CA yokken doğrulamasız TLS (mevcut davranış)", () => {
    delete process.env.DB_SSL_CA;
    expect(pgSsl(SUPA)).toEqual({ rejectUnauthorized: false });
  });

  it("CA varken doğrulamalı TLS + sistem kökleri korunur", () => {
    process.env.DB_SSL_CA = Buffer.from(PEM).toString("base64");
    const opts = pgSsl(SUPA) as { ca: string[]; rejectUnauthorized: boolean };
    expect(opts.rejectUnauthorized).toBe(true);
    expect(Array.isArray(opts.ca)).toBe(true);
    expect(opts.ca[opts.ca.length - 1]).toBe(PEM.trim());
    expect(opts.ca.length).toBe(rootCertificates.length + 1);
  });
});
