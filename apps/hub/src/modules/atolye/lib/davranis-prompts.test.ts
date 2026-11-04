// apps/hub/src/modules/atolye/lib/davranis-prompts.test.ts
import { describe, expect, it } from "vitest";
import { PEKISTIRME_NOTU, davranisInputSchema } from "./davranis";
import { davranisKullaniciPromptu } from "./davranis-prompts";

/* Faz 0 (spec 2026-11-03 §5): pekiştirme bölümü DİL KURALI'nın "dışsal ödül önerme" maddesinin tek
   istisnasıdır; istisna 6. bölümle sınırlı, her pekiştireç sönümlenme basamağı taşır, bölüm sabit notla biter. */
const girdi = davranisInputSchema.parse({
  rumuz: "Doruk",
  kademe: "ilkokul_1_4",
  taniProfili: ["dehb_kombine"],
  hedefDavranis: "Etkinlik geçişinde yere yatma",
  ortam: "sinif",
  siklikSure: "Günde 3–4 kez, 2 dk",
});

describe("davranisKullaniciPromptu — pekiştirme istisnası", () => {
  const p = davranisKullaniciPromptu(girdi);
  it("sabit not ve sönümlenme şartı 6. bölüm satırında", () => {
    expect(PEKISTIRME_NOTU).toMatch(/sönümlenme basamakları/);
    const m6 = p.split("\n").find((l) => l.startsWith("6. **Pekiştirme planı**"))!;
    expect(m6).toContain("her pekiştireç için sönümlenme basamağı");
    expect(m6).toContain(`Bölümün sonuna aynen şu satırı ekle: "${PEKISTIRME_NOTU}"`);
    expect(p.split(PEKISTIRME_NOTU).length - 1).toBe(1);
  });
  it("istisna açıkça ve sınırlı: tek istisna, yalnız 6. bölüm", () => {
    expect(p).toContain('DİL KURALI\'ndaki "dışsal ödül sistemi ÖNERME" maddesinin tek istisnasıdır');
    expect(p).toContain("istisna yalnız 6. bölüm için");
    expect(p).toContain("diğer bölümlerde ödül/puan/çıkartma sistemi önerme");
  });
  it("doğal ve sosyal pekiştireç önce; eski 'pekiştireç örnekleri' kalıbı yok", () => {
    expect(p).toContain("önce doğal ve sosyal pekiştireç");
    expect(p).not.toContain("pekiştireç örnekleri");
  });
  it("profil, davranış satırları ve sekiz bölüm korunur", () => {
    expect(p).toContain("- Öğrenci: Doruk");
    expect(p).toContain("- Hedef davranış: Etkinlik geçişinde yere yatma");
    expect(p).toContain("- Ortam: sınıf");
    expect(p).toContain("- Sıklık/süre gözlemi: Günde 3–4 kez, 2 dk");
    for (const b of ["1. **Hedef davranışın", "2. **ABC analizi**", "3. **İşlev hipotezi**", "4. **Önleyici", "5. **Yerine koyma davranışı**", "7. **Öz-izleme", "8. **Aile–okul–seans tutarlılık notu**"]) {
      expect(p).toContain(b);
    }
    expect(p).not.toContain("MEB HEDEF HİZALAMASI");
  });
  it("MEB hedefi verilince hizalama bloğu ve kuyruk cümlesi gelir", () => {
    const m = davranisKullaniciPromptu({ ...girdi, mebHedefKod: "3.2.5", mebDavranisKodlari: ["3.2.5.1"] });
    expect(m).toContain("MEB HEDEF HİZALAMASI");
    expect(m).toContain("seçilen MEB hedef davranışlarıyla ilişkilendirilsin");
  });
});
