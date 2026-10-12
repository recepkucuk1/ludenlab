// apps/hub/evals/lib/mocks/atolye.ts
import { als } from "../evalContext";

/* Atölye tarafı: oturum, kredi sarmalayıcısı, belge kaydı. `withCredits` gerçek imzayı korur:
   başarıda { ok, result, balance }, üretim patlarsa iade bayrağı + yeniden fırlatma. */

export const atolyeAuthMock = { auth: async () => ({ user: { id: "eval-uzman" } }) };

export const atolyeCreditsMock = {
  withCredits: async (_accountId: string, gen: () => Promise<unknown>) => {
    try {
      return { ok: true as const, result: await gen(), balance: 999 };
    } catch (e) {
      const st = als.getStore();
      if (st) st.refunded = true;
      throw e;
    }
  },
};

export const atolyeCasesMock = {
  saveDocument: async (_accountId: string, input: unknown) => {
    const st = als.getStore();
    if (st) st.saved = input;
    return { caseId: "eval-case", docId: "eval-doc" };
  },
};
