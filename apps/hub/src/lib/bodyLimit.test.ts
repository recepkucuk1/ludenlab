import { describe, expect, it } from "vitest";
import {
  contentLengthExceeds,
  MAX_JSON_BODY_BYTES,
  MAX_REQUEST_BODY_BYTES,
  readJsonBody,
} from "./bodyLimit";

/**
 * Regresyon kilidi — "istek gövdesi sınırsız" (2026-08 denetimi #29).
 * Sözleşme: sınır aşılırsa 413 ve gövde BELLEĞE ALINMAZ; meşru gövdeler etkilenmez.
 */
function jsonReq(body: string, opts: { contentLength?: string | null } = {}): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (opts.contentLength !== null) {
    headers.set("content-length", opts.contentLength ?? String(new TextEncoder().encode(body).byteLength));
  }
  return new Request("https://ludenlab.com/api/x", { method: "POST", headers, body });
}

/** content-length göndermeyen (chunked) istemci taklidi. */
function streamReq(body: string): Request {
  const bytes = new TextEncoder().encode(body);
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      for (let i = 0; i < bytes.length; i += 1024) c.enqueue(bytes.slice(i, i + 1024));
      c.close();
    },
  });
  return new Request("https://ludenlab.com/api/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: stream,
    // @ts-expect-error undici: stream gövdesi için gerekli
    duplex: "half",
  });
}

describe("contentLengthExceeds (middleware genel tavanı)", () => {
  it("bildirilen boyut genel tavanın üstündeyse true", () => {
    expect(contentLengthExceeds(String(MAX_REQUEST_BODY_BYTES + 1))).toBe(true);
  });

  it("tam sınırda ve altında false", () => {
    expect(contentLengthExceeds(String(MAX_REQUEST_BODY_BYTES))).toBe(false);
    expect(contentLengthExceeds("10")).toBe(false);
  });

  /**
   * Regresyon: genel tavan AI uçlarının sıkı sınırıyla AYNI olamaz — avatar uçları
   * 300 KB görseli base64 (~400 KB) JSON gövdesinde alır. Tek tavan 64 KB olsaydı
   * AVATAR YÜKLEME KIRILIRDI.
   */
  it("meşru avatar gövdesi (~400 KB) genel tavanı AŞMAZ", () => {
    const avatarBody = 300 * 1024 * 1.34 + 200; // base64 + JSON payı
    expect(contentLengthExceeds(String(Math.ceil(avatarBody)))).toBe(false);
    expect(MAX_REQUEST_BODY_BYTES).toBeGreaterThan(MAX_JSON_BODY_BYTES);
  });

  it("başlık yoksa/bozuksa false — akış kademesine bırakılır", () => {
    expect(contentLengthExceeds(null)).toBe(false);
    expect(contentLengthExceeds(undefined)).toBe(false);
    expect(contentLengthExceeds("abc")).toBe(false);
  });
});

describe("readJsonBody", () => {
  it("normal gövdeyi çözer", async () => {
    const r = await readJsonBody(jsonReq(JSON.stringify({ a: 1, b: "x" })));
    expect(r).toEqual({ ok: true, data: { a: 1, b: "x" } });
  });

  it("content-length ile bildirilen dev gövde 413", async () => {
    const r = await readJsonBody(jsonReq("{}", { contentLength: String(MAX_JSON_BODY_BYTES + 1) }));
    expect(r).toMatchObject({ ok: false, status: 413 });
  });

  it("content-length YALAN söylerse bile akış sayımı yakalar (413)", async () => {
    const big = JSON.stringify({ x: "a".repeat(MAX_JSON_BODY_BYTES + 5000) });
    const r = await readJsonBody(jsonReq(big, { contentLength: "10" }));
    expect(r).toMatchObject({ ok: false, status: 413 });
  });

  it("content-length HİÇ yoksa (chunked) da sınır uygulanır", async () => {
    const big = JSON.stringify({ x: "a".repeat(MAX_JSON_BODY_BYTES + 5000) });
    const r = await readJsonBody(streamReq(big));
    expect(r).toMatchObject({ ok: false, status: 413 });
  });

  it("chunked meşru gövde geçer", async () => {
    const r = await readJsonBody(streamReq(JSON.stringify({ ok: true })));
    expect(r).toEqual({ ok: true, data: { ok: true } });
  });

  it("bozuk JSON 400", async () => {
    const r = await readJsonBody(jsonReq("{ bozuk"));
    expect(r).toMatchObject({ ok: false, status: 400 });
  });

  it("gövdesiz istek 400 (çökme yok)", async () => {
    const req = new Request("https://ludenlab.com/api/x", { method: "POST" });
    expect(await readJsonBody(req)).toMatchObject({ ok: false, status: 400 });
  });

  it("çok baytlı UTF-8 (Türkçe) bozulmadan çözülür", async () => {
    const r = await readJsonBody(jsonReq(JSON.stringify({ ad: "Şeyma Öztürk ığü" })));
    expect(r).toEqual({ ok: true, data: { ad: "Şeyma Öztürk ığü" } });
  });
});
