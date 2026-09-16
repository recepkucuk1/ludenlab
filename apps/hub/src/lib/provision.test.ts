import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regresyon kilidi — ÜCRETSİZ HESAP SIFIR HAKLA AÇILIYORDU (2026-09 denetimi, P0).
 *
 * İki modül şemasında da `credits` varsayılanı 0; hesap açan tek yol olan bu dosya
 * krediye hiç dokunmuyordu ve `INITIAL_FREE_CREDITS` sabiti hiçbir yerden çağrılmıyordu.
 * Sonuç: landing "ayda 2 üretim hakkı" derken kullanıcı ilk üretimde reddediliyordu.
 *
 * Sözleşme: hesap İLK KEZ açılırken başlangıç hakkı + defter kaydı yazılır; mevcut
 * hesapta `update` boş kalır (tekrar çağrılırsa hak İKİNCİ KEZ verilmez).
 */
const therapistUpsert = vi.fn();
const atolyeAccountUpsert = vi.fn();

vi.mock("@/lib/db/studio", () => ({ studioDb: { therapist: { upsert: therapistUpsert } } }));
vi.mock("@/lib/db/atolye", () => ({ atolyeDb: { account: { upsert: atolyeAccountUpsert } } }));

const { ensureModuleAccounts } = await import("./provision");

const input = { email: "Yeni@Ornek.COM ", name: " Ada ", passwordHash: "hash" };

/** Defter kaydını alan adından bağımsız bulur (studio `description`, atölye `reason`). */
function nestedLedger(create: Record<string, unknown>): Record<string, unknown> | null {
  for (const value of Object.values(create)) {
    const nested = (value as { create?: Record<string, unknown> })?.create;
    if (nested && typeof nested === "object" && "type" in nested) return nested;
  }
  return null;
}

beforeEach(() => {
  therapistUpsert.mockReset();
  atolyeAccountUpsert.mockReset();
});

describe("ensureModuleAccounts — ücretsiz başlangıç hakkı", () => {
  it("Studio hesabı açılırken başlangıç hakkı yazılır", async () => {
    await ensureModuleAccounts({ ...input, modules: ["STUDIO"] });
    expect(therapistUpsert.mock.calls[0][0].create.credits).toBe(2);
  });

  it("Atölye hesabı açılırken başlangıç hakkı yazılır", async () => {
    await ensureModuleAccounts({ ...input, modules: ["ATOLYE"] });
    expect(atolyeAccountUpsert.mock.calls[0][0].create.credits).toBe(2);
  });

  it("başlangıç hakkı her iki modülde de deftere EARN olarak yazılır", async () => {
    await ensureModuleAccounts({ ...input, modules: ["STUDIO", "ATOLYE"] });

    const studioLedger = nestedLedger(therapistUpsert.mock.calls[0][0].create);
    expect(studioLedger).toMatchObject({ type: "EARN", amount: 2 });

    const atolyeLedger = nestedLedger(atolyeAccountUpsert.mock.calls[0][0].create);
    expect(atolyeLedger).toMatchObject({ type: "EARN", amount: 2 });
  });

  it("mevcut hesaba ikinci kez hak YAZILMAZ", async () => {
    await ensureModuleAccounts({ ...input, modules: ["STUDIO", "ATOLYE"] });
    expect(therapistUpsert.mock.calls[0][0].update).toEqual({});
    expect(atolyeAccountUpsert.mock.calls[0][0].update).toEqual({});
  });
});
