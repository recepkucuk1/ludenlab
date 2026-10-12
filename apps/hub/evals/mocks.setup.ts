// apps/hub/evals/mocks.setup.ts
import { vi } from "vitest";
import { installSeededRandom } from "./lib/seed";

/* Koşturucunun ve koşturucu öz-testinin ortak taklitleri. vi.mock hoist edilir; bu modül rotalardan
   ÖNCE içe aktarılmalıdır (`import "./mocks.setup";` dosyanın ilk satırı). Gerçek DB'ye hiç dokunulmaz.
   setupFiles'a KONMAZ: seed.selftest özgün Math.random'ı yakalar (ikinci kurulum no-op olur), judgeControls rota taklitlerine
   ihtiyaç duymaz (route çalıştırmaz; adaptörler rotayı tembel içe aktarır); bu yüzden giriş dosyaları ilk satırda açıkça içe aktarır. */

vi.mock("@studio/auth", async () => (await import("./lib/mocks/studio")).studioAuthMock);
vi.mock("@/generated/studio/client", () => ({ ToolType: {} }));
vi.mock("@/lib/rateLimit", () => ({
  rateLimit: () => ({ allowed: true, retryAfter: 0 }),
  rateLimitResponse: () => new Response("rate", { status: 429 }),
}));
vi.mock("@studio/lib/usage", () => ({ logUsage: () => {} }));
vi.mock("@studio/lib/generateWordImage", () => ({ lookupCachedWordImage: async () => null }));
vi.mock("@studio/lib/credits", async () => (await import("./lib/mocks/studio")).studioCreditsMock);
vi.mock("@studio/lib/db", async () => ({ prisma: (await import("./lib/mocks/studio")).studioPrismaMock() }));
vi.mock("@studio/lib/anthropic", async () => {
  const { createMessage } = await import("./lib/shim");
  return { anthropic: { messages: { create: createMessage } }, MODEL: "claude-sonnet-4-6" };
});
vi.mock("@atolye/auth", async () => (await import("./lib/mocks/atolye")).atolyeAuthMock);
vi.mock("@atolye/lib/credits", async () => (await import("./lib/mocks/atolye")).atolyeCreditsMock);
vi.mock("@atolye/lib/cases", async () => (await import("./lib/mocks/atolye")).atolyeCasesMock);
vi.mock("@ludenlab/ai", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@ludenlab/ai")>();
  const { definePromptViaShim } = await import("./lib/mocks/ludenlabAi");
  return { ...orig, definePrompt: definePromptViaShim };
});

installSeededRandom();
