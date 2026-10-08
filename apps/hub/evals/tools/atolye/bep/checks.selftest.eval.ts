// apps/hub/evals/tools/atolye/bep/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { TASLAK_NOTU } from "@atolye/lib/bep";
import { bepChecks, type BepBody } from "./checks";

const good = `## Okuma (disleksi odağı)

### Uzun dönem amaç
Dönem sonunda 1. sınıf düzeyi metni dakikada 40 kelime hızında okur.

### Kısa dönem hedefler
- Verilen 10 açık heceyi 8/10 doğrulukla okur.
- Üç denemenin ikisinde b/d harflerini %90 doğru ayırt eder.
- Futbol temalı 5 cümlelik metni ardışık 3 seansta hatasız okur.

### Yöntem/teknikler
- Hece kartlarını Galatasaray formasının renkleriyle kodlayın; her doğru okumada kart ters çevrilir.

### Ölçme-değerlendirme
- Haftalık 1 dk okuma örneği; öğretim sürecini değerlendirme aşamasında hata analizi.

## Aile/okul iş birliği
Evde her akşam 5 dk maç sonucu okuma.

⚠️ ${TASLAK_NOTU}`;

const body: BepBody = { alanlar: ["okuma"], guclukAlanlari: "Hece birleştirme yavaş", mebHedefKod: "3.2.5" };

describe("BEP kontrolleri", () => {
  it("iyi çıktı: yapı tam, ölçüt oranı yüksek, taslak notu var", () => {
    const r = bepChecks({ body, output: good, rawText: good, alias: "Doruk" });
    expect(r.hard_fail).toEqual([]);
    expect(r.scores.talimat).toBeGreaterThan(0.8);
    expect(r.details.olcutlu_hedef).toBe(1);
    expect(r.details.meb_kod).toBe(0); // 3.2.5 metinde geçmiyor → 0
  });

  it("kötü çıktı: taslak notu yok, ölçütsüz hedef, tanı cümlesi, rumuz sızıntısı", () => {
    const bad = "## Okuma\n### Kısa dönem hedefler\n- Doruk daha iyi okur.\n- Doruk disleksiktir.\n### Yöntem/teknikler\n- Sabırlı olun.";
    const r = bepChecks({ body, output: bad, rawText: bad, alias: "Doruk" });
    expect(r.hard_fail).toContain("taslak_notu_yok");
    expect(r.hard_fail).toContain("rumuz_sizintisi");
    expect(r.details.olcutlu_hedef).toBe(0);
    expect(r.details.tani_cumlesi).toBe(1);
    expect(r.scores.yasak_kalip).toBeLessThan(1);
  });

  it("çıktı yoksa talimat 0", () => {
    const r = bepChecks({ body, output: null, rawText: "", alias: null });
    expect(r.hard_fail).toContain("cikti_yok");
    expect(r.scores.talimat).toBe(0);
  });
});
