// apps/hub/evals/tools/atolye/bep/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { TASLAK_NOTU } from "@atolye/lib/bep";
import { OLCUT, bulletsUnder } from "../../../lib/markdown";
import { lower } from "../../../lib/sharedChecks";
import { adapter } from "./adapter";
import { bepChecks, type BepBody } from "./checks";

const good = `## Okuma (disleksi odağı)

### Uzun dönem amaç
Dönem sonunda 1. sınıf düzeyi metni dakikada 40 kelime hızında okur.

### Kısa dönem hedefler
- Verilen 10 açık heceyi 8/10 doğrulukla okur (3.2.5.1).
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
const run = (text: string, b: BepBody = body) => bepChecks({ body: b, output: text, rawText: text, alias: "Doruk" });

describe("BEP kontrolleri", () => {
  it("iyi çıktı: yapı tam, ölçüt oranı yüksek, taslak notu sonda, MEB alt kodu sayılır", () => {
    const r = run(good);
    expect(r.hard_fail).toEqual([]);
    expect(r.scores.talimat).toBeGreaterThan(0.8);
    expect(r.details.alan_basliklari).toBe(1);
    expect(r.details.alt_bolumler).toBe(1);
    expect(r.details.hedef_sayisi).toBe(3);
    expect(r.details.hedef_sayisi_ok).toBe(1);
    expect(r.details.olcutlu_hedef).toBe(1);
    expect(r.details.taslak_sonda).toBe(1);
    expect(r.details.meb_kod).toBeCloseTo(1 / 3); // 3.2.5 → "(3.2.5.1)" önek eşleşmesi; 3 hedefin 1'i
    expect(r.details.tani_cumlesi).toBe(0);
  });

  it("kötü çıktı: taslak notu yok, ölçütsüz hedef, tanı cümlesi, rumuz sızıntısı", () => {
    const bad = "## Okuma\n### Kısa dönem hedefler\n- Doruk daha iyi okur.\n- Doruk disleksiktir.\n### Yöntem/teknikler\n- Sabırlı olun.";
    const r = run(bad);
    expect(r.hard_fail).toContain("taslak_notu_yok");
    expect(r.hard_fail).toContain("rumuz_sizintisi");
    expect(r.details.olcutlu_hedef).toBe(0);
    expect(r.details.hedef_sayisi_ok).toBe(0);
    expect(r.details.tani_cumlesi).toBe(1);
    expect(r.details.meb_kod).toBe(0);
    expect(r.scores.yasak_kalip).toBeLessThan(1);
  });

  it("'dil ve konuşma terapisti' Atölye'de meşru unvandır: terapist sayılmaz, sert hata yok", () => {
    const r = run(good.replace("Evde her akşam 5 dk maç sonucu okuma.", "Dil ve konuşma terapisti ile haftalık görüşme yapılır."));
    expect(r.details.terapist).toBe(0);
    expect(r.scores.dil_kurali).toBe(1);
    expect(r.hard_fail).not.toContain("dil_kurali");
    // Yalın "terapist" yine sayılır.
    expect(run(good.replace("Evde her akşam", "Terapist önerir; evde her akşam")).details.terapist).toBe(1);
  });

  it("çıktı yoksa talimat 0", () => {
    const r = bepChecks({ body, output: null, rawText: "", alias: null });
    expect(r.hard_fail).toContain("cikti_yok");
    expect(r.hard_fail).not.toContain("taslak_notu_yok");
    expect(r.scores.talimat).toBe(0);
  });

  it("kalın sözde başlık + numaralı kalın maddeler: hedefler bulunur, ölçütlü", () => {
    const t = `**Okuma (disleksi odağı)**

**Uzun dönem amaç**
Dönem sonunda tanıtılan sesleri hece içinde okur.

**Kısa dönem hedefler**
1. **Açık heceleri okur** — 10 hecenin %80'ini doğru okur.
2. **b/d ayrımı:** Kartlarda b ile d'yi 10 denemenin 8'inde ayırt eder.
   - Koşul: model olmadan, sözlü yönergeyle.
3. **Akıcılık** — kısa metni dakikada 30 kelime hızla okur.

**Yöntem/teknikler**
- Kum tepsisinde harf izleme.

**Ölçme-değerlendirme**
- Haftalık okuma örneği.

**Aile/okul iş birliği**
Evde kısa okuma.

⚠️ ${TASLAK_NOTU}`;
    const r = run(t, { alanlar: ["okuma"], guclukAlanlari: "x" });
    expect(r.hard_fail).toEqual([]);
    expect(r.details.hedef_sayisi).toBe(3);
    expect(r.details.olcutlu_hedef).toBe(1);
    expect(r.details.alan_basliklari).toBe(1);
    expect(r.details.alt_bolumler).toBe(1);
    expect(r.details.meb_kod).toBe("—");
    // Girintili alt madde üst maddeye katılır, ayrı hedef sayılmaz.
    expect(bulletsUnder(t, /kısa dönem/)[1]).toContain("Koşul: model olmadan");
  });

  it("tablo biçimli hedefler: gövde satırları hedef sayılır, başlık ve ayraç sayılmaz", () => {
    const t = `## Okuma (disleksi odağı)

### Kısa dönem hedefler

| Hedef | Ölçüt |
| --- | --- |
| Açık heceleri okur | 10 denemenin 8'inde doğru |
| b/d harflerini ayırt eder | %90 doğruluk |
| Kısa metni okur | Dakikada 30 kelime |

### Yöntem/teknikler
- Harf kartları.

⚠️ ${TASLAK_NOTU}`;
    const hedefler = bulletsUnder(t, /kısa dönem/);
    expect(hedefler).toEqual(["Açık heceleri okur · 10 denemenin 8'inde doğru", "b/d harflerini ayırt eder · %90 doğruluk", "Kısa metni okur · Dakikada 30 kelime"]);
    const r = run(t, { alanlar: ["okuma"], guclukAlanlari: "x" });
    expect(r.details.hedef_sayisi).toBe(3);
    expect(r.details.olcutlu_hedef).toBe(1);
  });

  it("büyük harfli başlık (### KISA DÖNEM HEDEFLER) tr-TR küçük harfle bulunur", () => {
    const t = `## OKUMA\n\n### KISA DÖNEM HEDEFLER\n- Heceyi %80 doğru okur.\n- Sözcüğü 8/10 okur.\n- 3 ardışık seansta hatasız okur.\n\n⚠️ ${TASLAK_NOTU}`;
    const r = run(t, { alanlar: ["okuma"], guclukAlanlari: "x" });
    expect(r.details.hedef_sayisi).toBe(3);
    expect(r.details.alan_basliklari).toBe(1);
  });

  describe("taslak notu", () => {
    it("**…** içinde: sert hata yok, sonda sayılır", () => {
      const r = run(good.replace(`⚠️ ${TASLAK_NOTU}`, `> ⚠️ **${TASLAK_NOTU}**`));
      expect(r.hard_fail).toEqual([]);
      expect(r.details.taslak_sonda).toBe(1);
    });

    it("hiç yok: sert hata", () => {
      const r = run(good.replace(`⚠️ ${TASLAK_NOTU}`, ""));
      expect(r.hard_fail).toEqual(["taslak_notu_yok"]);
      expect(r.details.taslak_sonda).toBe(0);
    });

    it("var ama son satır değil: sert hata yok, taslak_sonda 0", () => {
      const r = run(`${good}\n\n## Ek kaynaklar\n- Hece kartları seti.`);
      expect(r.hard_fail).toEqual([]);
      expect(r.details.taslak_sonda).toBe(0);
    });
  });

  it("tanı cümlesi kalıpları", () => {
    for (const s of ["Öğrenci DEHB’dir.", "ÖÖB'lidir.", "Disleksilidir.", "Özgül öğrenme bozukluğudur.", "Diskalkuliktir."]) {
      expect(run(`${good}\n${s}`).details.tani_cumlesi, s).toBe(1);
    }
    expect(run(`${good}\nDEHB'li öğrencilerde kısa yönerge işe yarar.`).details.tani_cumlesi).toBe(0);
  });

  it("OLCUT: ölçüt kalıpları", () => {
    const pozitif = ["10 denemenin 8'inde doğru okur", "yüzde 80 doğrulukla", "beşte dört doğru", "30 sn içinde", "art arda 3 seansta", "en fazla 2 hatayla okur", "%80", "80 %", "8/10", "dakikada 40 kelime"];
    for (const s of pozitif) expect(OLCUT.test(lower(s)), s).toBe(true);
    const negatif = ["ardışık sayıları sayar", "bir ardışık dizi oluşturur", "daha iyi okur", "sonda iki harfi karıştırır"];
    for (const s of negatif) expect(OLCUT.test(lower(s)), s).toBe(false);
    // Bilinen yanlış pozitif (bilinçli kabul): "3 ardışık sayıyı sıralar" içerik tanımıdır ama ölçüt sayılır.
  });
});

describe("BEP jenerik aday", () => {
  it("tablo + numaralı çıktı: gövdede ölçüt kalmaz, başlıklar, tablo başlığı ve not korunur", () => {
    const t = `## Okuma (disleksi odağı)

### Uzun dönem amaç
Dönem sonunda dakikada 40 kelime okur.

### Kısa dönem hedefler

| Hedef | Ölçüt |
| --- | --- |
| Açık heceleri okur | 10 denemenin 8'inde |
| b/d ayırt eder | %90 |

1. **Akıcılık** — dakikada 30 kelime.
   - 3 ardışık seansta.

**Yöntem/teknikler**
- Kum tepsisi, 5 dk.

⚠️ ${TASLAK_NOTU}`;
    const g = adapter.genericCandidate(t) as string;
    const satirlar = g.split("\n");
    for (const h of ["## Okuma (disleksi odağı)", "### Uzun dönem amaç", "### Kısa dönem hedefler", "| Hedef | Ölçüt |", "| --- | --- |", "**Yöntem/teknikler**", `⚠️ ${TASLAK_NOTU}`]) {
      expect(satirlar, h).toContain(h);
    }
    expect(satirlar).toHaveLength(t.split("\n").length);
    const hedefler = bulletsUnder(g, /kısa dönem/);
    expect(hedefler).toHaveLength(3); // 2 tablo satırı + 1 numaralı madde (alt madde katıldı)
    for (const h of hedefler) expect(/\d/.test(h), h).toBe(false);
    const govde = satirlar.filter((l) => l.trim() && !/^\s*(#|\*\*|⚠️|\| Hedef|\| ---)/.test(l));
    for (const l of govde) expect(/\d/.test(l.replace(/^\s*\d+[.)]\s/, "")), l).toBe(false);
    const r = run(g, { alanlar: ["okuma"], guclukAlanlari: "x" });
    expect(r.hard_fail).toEqual([]);
    expect(r.details.olcutlu_hedef).toBe(0);
    expect(r.scores.yasak_kalip).toBeLessThan(1);
  });
});
