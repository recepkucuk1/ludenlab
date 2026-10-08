// apps/hub/evals/lib/exchange.selftest.eval.ts
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { estimateTokens, messageFromText, readResponse, renderRequestMarkdown, requestPaths, writeRequest, type ExchangeRequest } from "./exchange";

const req: ExchangeRequest = {
  key: "ss-01_rep0",
  role: "gen",
  agentModel: "sonnet",
  model: "claude-sonnet-4-6",
  system: "Sen bir asistansın.",
  user: "Merhaba\nikinci satır",
  max_tokens: 4096,
};

describe("exchange", () => {
  it("isteği json + md olarak yazar, yanıt yoksa null döner", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "exch-"));
    writeRequest(dir, req);
    const p = requestPaths(dir, req.key, req.role);
    expect(existsSync(p.json)).toBe(true);
    expect(readFileSync(p.md, "utf8")).toContain("## KULLANICI MESAJI\nMerhaba\nikinci satır");
    expect(readResponse(dir, req.key, req.role)).toBeNull();
  });

  it("boş yanıt dosyasını yok sayar, dolu yanıtı aynen döner", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "exch-"));
    const p = requestPaths(dir, req.key, req.role);
    writeFileSync(p.response, "   \n");
    expect(readResponse(dir, req.key, req.role)).toBeNull();
    writeFileSync(p.response, '{"title":"x"}\n');
    expect(readResponse(dir, req.key, req.role)).toBe('{"title":"x"}\n');
  });

  it("hakem isteği şemayı Markdown'a basar", () => {
    const md = renderRequestMarkdown({ ...req, role: "judge", schema: { type: "object" } });
    expect(md).toContain("## ÇIKTI ŞEMASI");
    expect(md).toContain('"type": "object"');
  });

  it("metinden Message kurar, token'ı tahmin eder", () => {
    const m = messageFromText("a".repeat(320), "claude-haiku-5-5", 100);
    expect(m.content[0]).toMatchObject({ type: "text" });
    expect(m.usage.output_tokens).toBe(100);
    expect(m.usage.input_tokens).toBe(100);
    expect(m.stop_reason).toBe("end_turn");
    expect(estimateTokens("")).toBe(0);
  });
});
