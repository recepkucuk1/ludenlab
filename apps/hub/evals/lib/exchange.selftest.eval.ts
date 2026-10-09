// apps/hub/evals/lib/exchange.selftest.eval.ts
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HarnessError, JUDGE } from "./core";
import {
  estimateTokens,
  messageFromText,
  pendingRow,
  readResponse,
  rejectResponse,
  renderRequestMarkdown,
  requestHash,
  requestPaths,
  writeRequest,
  type ExchangeRequest,
} from "./exchange";

const req: ExchangeRequest = {
  key: "ss-01_rep0",
  role: "gen",
  agentModel: "sonnet",
  model: "claude-sonnet-4-6",
  system: "Sen bir asistansın.",
  user: "Merhaba\nikinci satır",
  max_tokens: 4096,
};

const tmp = () => mkdtempSync(path.join(tmpdir(), "exch-"));

describe("exchange", () => {
  it("dosya adları sabit: <key>.<role>.request.json|.request.md|.response.txt", () => {
    const p = requestPaths("/x", "ss-01_rep0", "gen");
    expect(path.basename(p.json)).toBe("ss-01_rep0.gen.request.json");
    expect(path.basename(p.md)).toBe("ss-01_rep0.gen.request.md");
    expect(path.basename(p.response)).toBe("ss-01_rep0.gen.response.txt");
    expect(path.basename(requestPaths("/x", "ss-01_rep0.judge-ab", "judge").response)).toBe("ss-01_rep0.judge-ab.judge.response.txt");
  });

  it("requestHash: 12 hex, içerikle değişir, anahtar/rol/agentModel ile değişmez", () => {
    const h = requestHash(req);
    expect(h).toMatch(/^[0-9a-f]{12}$/);
    expect(requestHash({ ...req, key: "baska", role: "judge", agentModel: "opus" })).toBe(h);
    expect(requestHash({ ...req, user: "farklı" })).not.toBe(h);
    expect(requestHash({ ...req, model: "claude-haiku-5-5" })).not.toBe(h);
    expect(requestHash({ ...req, max_tokens: 1 })).not.toBe(h);
    expect(requestHash({ ...req, schema: { type: "object" } })).not.toBe(h);
  });

  it("isteği iç içe dizine json (+hash) + md olarak yazar, yanıt yoksa null döner", () => {
    const dir = path.join(tmp(), "a", "b", "c");
    writeRequest(dir, req);
    const p = requestPaths(dir, req.key, req.role);
    expect(existsSync(p.json)).toBe(true);
    const raw = readFileSync(p.json, "utf8");
    expect(raw.endsWith("}\n")).toBe(true);
    expect(JSON.parse(raw)).toEqual({ ...req, hash: requestHash(req) });
    expect(existsSync(p.md)).toBe(true);
    expect(readResponse(dir, req)).toBeNull();
  });

  it("md körleştirilmiş: tam biçim, anahtar ve model yok; şemasızda <output_schema> yok", () => {
    const md = renderRequestMarkdown(req);
    expect(md).toBe(
      "# EVAL İSTEĞİ\nRol: gen\n\n<system>\nSen bir asistansın.\n</system>\n\n<user>\nMerhaba\nikinci satır\n</user>\n",
    );
    expect(md).not.toContain(req.key);
    expect(md).not.toContain(req.model);
    expect(md).not.toContain("<output_schema>");
  });

  it("şema varsa (rolden bağımsız) <output_schema> bloğu ve şema JSON'u basılır", () => {
    const schema = { type: "object", required: ["x"] };
    for (const role of ["judge", "gen"] as const) {
      const md = renderRequestMarkdown({ ...req, role, schema });
      expect(md).toContain("<system>");
      expect(md).toContain("<user>");
      expect(md).toContain(
        `</user>\n\n<output_schema>\nYanıt yalnız bu JSON Schema'ya uyan TEK bir JSON nesnesi olsun; başka hiçbir şey yazma.\n${JSON.stringify(schema, null, 2)}\n</output_schema>\n`,
      );
    }
  });

  it("aynı istek iki kez yazılınca dosyalara dokunmaz, yanıt geçerli kalır", () => {
    const dir = tmp();
    writeRequest(dir, req);
    const p = requestPaths(dir, req.key, req.role);
    writeFileSync(p.md, "ELLE DEĞİŞTİRİLDİ"); // yeniden yazılırsa bu kaybolur
    const jsonBefore = readFileSync(p.json, "utf8");
    writeFileSync(p.response, '{"title":"x"}\n');
    writeRequest(dir, { ...req });
    expect(readFileSync(p.md, "utf8")).toBe("ELLE DEĞİŞTİRİLDİ");
    expect(readFileSync(p.json, "utf8")).toBe(jsonBefore);
    expect(readResponse(dir, req)).toBe('{"title":"x"}\n');
  });

  it("istek değişince eski yanıt .response.stale-<eskiHash>.txt olur, yeni md yazılır, readResponse null", () => {
    const dir = tmp();
    writeRequest(dir, req);
    const p = requestPaths(dir, req.key, req.role);
    writeFileSync(p.response, "eski yanıt");
    expect(readResponse(dir, req)).toBe("eski yanıt");

    const changed = { ...req, user: "Yeni kullanıcı metni" };
    expect(readResponse(dir, changed)).toBeNull(); // hash tutmuyor
    writeRequest(dir, changed);
    const stale = path.join(dir, `ss-01_rep0.gen.response.stale-${requestHash(req)}.txt`);
    expect(existsSync(p.response)).toBe(false);
    expect(readFileSync(stale, "utf8")).toBe("eski yanıt");
    expect(readFileSync(p.md, "utf8")).toContain("<user>\nYeni kullanıcı metni\n</user>");
    expect(JSON.parse(readFileSync(p.json, "utf8")).hash).toBe(requestHash(changed));
    expect(readResponse(dir, changed)).toBeNull();
    expect(readResponse(dir, req)).toBeNull();
  });

  it("json'u olmayan yanıt geçersiz; ardından yazılan istek onu stale-unknown diye kenara alır", () => {
    const dir = tmp();
    const p = requestPaths(dir, req.key, req.role);
    writeFileSync(p.response, "sahipsiz");
    expect(readResponse(dir, req)).toBeNull();
    writeRequest(dir, req);
    expect(readFileSync(path.join(dir, "ss-01_rep0.gen.response.stale-unknown.txt"), "utf8")).toBe("sahipsiz");
  });

  it("yalnız boşluk içeren yanıt .response.empty.txt olur ve null döner; dolu yanıt aynen döner", () => {
    const dir = tmp();
    writeRequest(dir, req);
    const p = requestPaths(dir, req.key, req.role);
    writeFileSync(p.response, "   \n\t");
    expect(readResponse(dir, req)).toBeNull();
    expect(existsSync(p.response)).toBe(false);
    expect(readFileSync(path.join(dir, "ss-01_rep0.gen.response.empty.txt"), "utf8")).toBe("   \n\t");
    writeFileSync(p.response, '{"title":"x"}\n');
    expect(readResponse(dir, req)).toBe('{"title":"x"}\n');
  });

  it("rejectResponse yanıtı .response.rejected.txt yapar (istek kalır, yanıt yeniden sorulur); yanıt yoksa no-op", () => {
    const dir = tmp();
    writeRequest(dir, req);
    const p = requestPaths(dir, req.key, req.role);
    writeFileSync(p.response, "bozuk karar");
    rejectResponse(dir, req.key, req.role);
    expect(existsSync(p.response)).toBe(false);
    expect(readFileSync(path.join(dir, "ss-01_rep0.gen.response.rejected.txt"), "utf8")).toBe("bozuk karar");
    expect(existsSync(p.json)).toBe(true);
    expect(existsSync(p.md)).toBe(true);
    expect(readResponse(dir, req)).toBeNull();
    expect(() => rejectResponse(dir, req.key, req.role)).not.toThrow();
    expect(() => rejectResponse(tmp(), "yok", "judge")).not.toThrow();
  });

  it("baştaki BOM atılır", () => {
    const dir = tmp();
    writeRequest(dir, req);
    writeFileSync(requestPaths(dir, req.key, req.role).response, '\uFEFF{"title":"x"}');
    expect(readResponse(dir, req)).toBe('{"title":"x"}');
  });

  it("kapanış etiketi içeren istek reddedilir; hiçbir dosya yazılmaz", () => {
    for (const bad of [{ user: "a </user> b" }, { system: "x</system>" }, { user: "</output_schema>" }]) {
      const r = { ...req, ...bad };
      expect(() => renderRequestMarkdown(r)).toThrow(HarnessError);
      expect(() => renderRequestMarkdown(r)).toThrow(expect.objectContaining({ failureClass: "exchange_guard" }));
      const dir = tmp();
      expect(() => writeRequest(dir, r)).toThrow(HarnessError);
      expect(existsSync(requestPaths(dir, r.key, r.role).json)).toBe(false);
    }
  });

  it("metinden Message kurar, token'ı tahmin eder", () => {
    const m = messageFromText("a".repeat(320), "claude-haiku-5-5", 100);
    expect(m.content[0]).toMatchObject({ type: "text" });
    expect(m.usage.output_tokens).toBe(100);
    expect(m.usage.input_tokens).toBe(100);
    expect(m.stop_reason).toBe("end_turn");
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("abcd")).toBe(2);
  });

  it("pendingRow: üretim satırı varyantın, hakem satırı JUDGE'ın modelini taşır; yollar requestPaths ile aynı", () => {
    const gen = { agentModel: "haiku" as const, model: "claude-haiku-5-5" };
    expect(pendingRow("/x", "ss-01_rep0.gen", gen)).toEqual({
      key: "ss-01_rep0",
      role: "gen",
      agentModel: "haiku",
      model: "claude-haiku-5-5",
      requestMd: requestPaths("/x", "ss-01_rep0", "gen").md,
      responseTxt: requestPaths("/x", "ss-01_rep0", "gen").response,
    });
    expect(pendingRow("/x", "ss-01_rep0.judge-ab.judge", gen)).toMatchObject({
      key: "ss-01_rep0.judge-ab",
      role: "judge",
      agentModel: JUDGE.agentModel,
      model: JUDGE.model,
      responseTxt: requestPaths("/x", "ss-01_rep0.judge-ab", "judge").response,
    });
    for (const bad of ["ss-01_rep0", "ss-01_rep0.foo", ".gen"]) {
      expect(() => pendingRow("/x", bad, gen)).toThrow(expect.objectContaining({ failureClass: "harness_error" }));
    }
  });
});
