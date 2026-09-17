import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Öğrenci seçimi — form her zaman SEÇİLİ öğrenciyi göstermeli.
 *
 * İki kaçak vardı (2026-09-17 denetimi):
 *  1. BEP ve Seans Planı alanları yalnız öğrencide doluysa güncelliyordu
 *     (`if (s.gucluYonler) setGucluYonler(...)`). Bu alanları boş olan bir öğrenciye
 *     geçilince önceki öğrencinin metni formda kalıyor, plan onun bilgisiyle üretilip
 *     yeni öğrencinin kaydına yazılıyordu. Rumuz yalnız SEÇİLİ öğrencinin adını
 *     gizlediği için, kalan metinde geçen önceki öğrencinin gerçek adı sağlayıcıya gidebilirdi.
 *  2. Listeden "Öğrenci seçin…"e dönülünce hiçbir şey sıfırlanmıyordu: uyarı çıkmadan
 *     üretim yapılıyor, hak düşüyor, belge önceki öğrencinin kaydına gidiyordu.
 *
 * Bunlar React durum akışı; burada kilitlenen şey kalıptır.
 */
const DIR = import.meta.dirname;
const oku = (f: string) => readFileSync(path.join(DIR, f), "utf8");

function onPickBlok(src: string): string {
  const start = src.indexOf("onPick={(s) => {");
  return src.slice(start, src.indexOf("}}", start));
}

describe("öğrenci seçimi", () => {
  it.each(["BepAssistant.tsx", "SeansPlaniTool.tsx"])(
    "%s: öğrenci seçilince alanlar koşulsuz atanır",
    (dosya) => {
      const blok = onPickBlok(oku(dosya));
      expect(blok, "onPick bloğu bulunamadı").toContain("setRumuz(");
      expect(blok).not.toMatch(/if \(s\./);
    },
  );

  it.each(["StudentPicker.tsx", "OgrenciProfilForm.tsx"])(
    "%s: boş seçeneğe geri dönülemez",
    (dosya) => {
      expect(oku(dosya)).toMatch(/<option value="" disabled>/);
    },
  );
});
