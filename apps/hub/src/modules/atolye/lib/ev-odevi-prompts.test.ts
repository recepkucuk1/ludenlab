// apps/hub/src/modules/atolye/lib/ev-odevi-prompts.test.ts
import { describe, expect, it } from "vitest";
import { evOdeviInputSchema } from "./ev-odevi";
import { evOdeviKullaniciPromptu } from "./ev-odevi-prompts";

/* Faz 0 (spec 2026-11-03 §6): ev ödevi programı dışsal ödül istemez; günün kapanışı oyunludur. */
const girdi = evOdeviInputSchema.parse({
  rumuz: "Doruk",
  kademe: "ilkokul_1_4",
  taniProfili: ["disleksi"],
  hedefKonu: "İki heceli sözcükleri okuma",
  gunSayisi: 3,
});

describe("evOdeviKullaniciPromptu — ödül dili yok", () => {
  const p = evOdeviKullaniciPromptu(girdi);
  it("'ödül' sözcüğü hiçbir biçimde geçmez; oyunlu kapanış ister", () => {
    expect(p.toLocaleLowerCase("tr-TR")).not.toContain("ödül");
    expect(p).toContain("Oyunlu kapanış (oyun ya da birlikte yapılan keyifli bir bitiriş; puan, çıkartma, dışsal pekiştireç yok)");
  });
  it("dört bölüm ve gün sayısı korunur", () => {
    expect(p).toContain("- Program Süresi: 3 günlük");
    for (const b of ["1. **Genel Çerçeve ve Ebeveyn Bilgilendirmesi**", "2. **Günlük Çalışma Planı**", "3. **Alternatif Yollar**", "4. **Gözlem ve Uzmana Notlar (Aile için)**"]) {
      expect(p).toContain(b);
    }
  });
});
