import { describe, expect, it, vi } from "vitest";
vi.mock("@studio/lib/db", () => ({ prisma: {} }));
const { applyProfileNote, removeProfileNote, ASISTAN_SATIRI } = await import("./applyProfileNote");

const profil = `## Kavramsal Arka Plan\n\n### Tanının Klinik Açıklaması\nAçıklama.\n\n---\n\n## Uzmana Öneriler\n\n### Öncelikli Çalışma Alanları\n- İki kelime\n\n### Etkili Yaklaşım ve Teknikler\n- Model olma\n\n### Dikkat Edilmesi Gereken Noktalar\nAni ses.\n\n### Aile ile Paylaşılabilecek Öneriler\nEvde.`;

describe("applyProfileNote", () => {
  it("bölümün sonuna '- madde' satırı ekler, diğer bölümler aynen kalır", () => {
    const out = applyProfileNote(profil, "Öncelikli Çalışma Alanları", "Kelime başı /r/ pekiştirme");
    expect(out).toContain("### Öncelikli Çalışma Alanları\n- İki kelime\n- Kelime başı /r/ pekiştirme _(asistan)_\n\n### Etkili Yaklaşım ve Teknikler");
    expect(out).toContain("### Dikkat Edilmesi Gereken Noktalar\nAni ses.\n\n### Aile");
  });

  it("madde işaretsiz gövdeye de ekler; sonraki başlık önünde tam bir boş satır kalır", () => {
    const out = applyProfileNote(profil, "Dikkat Edilmesi Gereken Noktalar", "Yorulunca ses düşer");
    expect(out).toContain("Ani ses.\n- Yorulunca ses düşer _(asistan)_\n\n### Aile ile Paylaşılabilecek Öneriler");
  });

  it("bölüm başlığı yoksa profil DEĞİŞMEZ (null)", () => {
    expect(applyProfileNote("## Başka", "Öncelikli Çalışma Alanları", "x")).toBeNull();
  });

  it("son bölüme eklerken sonda boşluk bırakmaz", () => {
    const sonBolumlu = "## Uzmana Öneriler\n\n### Dikkat Edilmesi Gereken Noktalar\nAni ses.\n\n";
    expect(applyProfileNote(sonBolumlu, "Dikkat Edilmesi Gereken Noktalar", "Okuma saati")).toBe(
      "## Uzmana Öneriler\n\n### Dikkat Edilmesi Gereken Noktalar\nAni ses.\n- Okuma saati _(asistan)_",
    );
  });

  it("aynı asistan maddesi zaten varsa yeniden eklemez", () => {
    const bir = applyProfileNote(profil, "Öncelikli Çalışma Alanları", "Kelime başı /r/ pekiştirme")!;
    expect(applyProfileNote(bir, "Öncelikli Çalışma Alanları", "Kelime başı /r/ pekiştirme")).toBe(bir);
  });

  it("ASISTAN_SATIRI yalnız etiketli madde satırını yakalar ve metni verir", () => {
    expect(ASISTAN_SATIRI.exec("- Kelime başı /r/ _(asistan)_")?.[1]).toBe("Kelime başı /r/");
    expect(ASISTAN_SATIRI.test("- İki kelime")).toBe(false);
    expect(ASISTAN_SATIRI.test("Ani ses _(asistan)_")).toBe(false);
  });
});

describe("removeProfileNote", () => {
  it("etiketli satırı çıkarır, çevresi bozulmaz", () => {
    const eklenmis = applyProfileNote(profil, "Öncelikli Çalışma Alanları", "Kelime başı /r/ pekiştirme")!;
    const out = removeProfileNote(eklenmis, "- Kelime başı /r/ pekiştirme _(asistan)_");
    expect(out).toBe(profil);
  });

  it("tek maddelik gövdeden çıkarınca başlıklar arasında tek boş satır kalır", () => {
    const eklenmis = applyProfileNote(profil, "Dikkat Edilmesi Gereken Noktalar", "Yorulunca ses düşer")!;
    const out = removeProfileNote(eklenmis, "- Yorulunca ses düşer _(asistan)_");
    expect(out).toBe(profil);
  });

  it("satır yoksa profil aynen döner", () => {
    expect(removeProfileNote(profil, "- yok _(asistan)_")).toBe(profil);
  });
});
