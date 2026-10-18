import { describe, expect, it, vi } from "vitest";
vi.mock("@studio/lib/db", () => ({ prisma: {} }));
const { applyProfileNote } = await import("./applyProfileNote");

const profil = `## Kavramsal Arka Plan\n\n### Tanının Klinik Açıklaması\nAçıklama.\n\n---\n\n## Uzmana Öneriler\n\n### Öncelikli Çalışma Alanları\n- İki kelime\n\n### Etkili Yaklaşım ve Teknikler\n- Model olma\n\n### Dikkat Edilmesi Gereken Noktalar\nAni ses.\n\n### Aile ile Paylaşılabilecek Öneriler\nEvde.`;

describe("applyProfileNote", () => {
  it("bölümün sonuna '- madde' satırı ekler, diğer bölümler aynen kalır", () => {
    const out = applyProfileNote(profil, "Öncelikli Çalışma Alanları", "Kelime başı /r/ pekiştirme");
    expect(out).toContain("### Öncelikli Çalışma Alanları\n- İki kelime\n- Kelime başı /r/ pekiştirme\n\n### Etkili Yaklaşım ve Teknikler");
    expect(out).toContain("### Dikkat Edilmesi Gereken Noktalar\nAni ses.\n\n### Aile");
  });

  it("madde işaretsiz gövdeye de ekler; sonraki başlık önünde tam bir boş satır kalır", () => {
    const out = applyProfileNote(profil, "Dikkat Edilmesi Gereken Noktalar", "Yorulunca ses düşer");
    expect(out).toContain("Ani ses.\n- Yorulunca ses düşer\n\n### Aile ile Paylaşılabilecek Öneriler");
  });

  it("bölüm başlığı yoksa profil DEĞİŞMEZ (null)", () => {
    expect(applyProfileNote("## Başka", "Öncelikli Çalışma Alanları", "x")).toBeNull();
  });

  it("son bölüme eklerken sonda boşluk bırakmaz", () => {
    const sonBolumlu = "## Uzmana Öneriler\n\n### Dikkat Edilmesi Gereken Noktalar\nAni ses.\n\n";
    expect(applyProfileNote(sonBolumlu, "Dikkat Edilmesi Gereken Noktalar", "Okuma saati")).toBe(
      "## Uzmana Öneriler\n\n### Dikkat Edilmesi Gereken Noktalar\nAni ses.\n- Okuma saati",
    );
  });

  it("aynı madde zaten varsa yeniden eklemez", () => {
    const bir = applyProfileNote(profil, "Öncelikli Çalışma Alanları", "İki kelime");
    expect(bir).toBe(profil);
  });
});
