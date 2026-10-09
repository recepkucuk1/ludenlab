// apps/hub/evals/lib/core.selftest.eval.ts
import { expect, it } from "vitest";
import { responseText } from "./core";

it("responseText: metin blokları; yoksa tool_use girdisi", () => {
  expect(responseText({ content: [{ type: "text", text: "a" }, { type: "text", text: "b" }] } as never)).toBe("ab");
  expect(responseText({ content: [{ type: "tool_use", id: "t", name: "emit_card", input: { title: "K" } }] } as never)).toBe('{"title":"K"}');
  expect(responseText({ content: [] } as never)).toBe("");
});
