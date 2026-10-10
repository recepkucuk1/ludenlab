// apps/hub/evals/tools/atolye/materyal/checks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { materyalChecks } from "./checks";
const body = { materyalTuru: "calisma_yapragi" as const, konu: "k", zorlukVaryanti: "kolay_orta" as const, cevapAnahtari: true };
describe("materyalChecks", () => {
  it("cevap anahtarı istendi ve dolu → 1; iki varyant başlığı → 1", () => {
    const r = materyalChecks({ body, text: "## Zorluk varyantları\n### Kolay\n- a\n### Orta\n- b\n## Cevap anahtarı\n1. 5\n2. 7" });
    expect(r.scores).toMatchObject({ cevap_anahtari: 1, varyant: 1 });
  });
  it("istenmediği hâlde anahtar eklenmiş → 0; tek varyant istenince varyant 1", () => {
    const r = materyalChecks({ body: { ...body, cevapAnahtari: false, zorlukVaryanti: "tek" }, text: "## Cevap anahtarı\n1. 5" });
    expect(r.scores).toMatchObject({ cevap_anahtari: 0, varyant: 1 });
    const r2 = materyalChecks({ body: { ...body, cevapAnahtari: false, zorlukVaryanti: "tek" }, text: "## Cevap anahtarı\n(Cevap anahtarı istenmedi — ekleme.)" });
    expect(r2.scores.cevap_anahtari).toBe(1);
  });
});

/* ── Ek kapsam: cevap anahtarı biçimleri ve bildirimleri, varyant etiketleri ── */

type Govde = Parameters<typeof materyalChecks>[0]["body"];
const kontrol = (text: string, ek: Partial<Govde> = {}) => materyalChecks({ body: { ...body, ...ek }, text });
const anahtar = (text: string, istendi: boolean) => kontrol(text, { cevapAnahtari: istendi }).scores.cevap_anahtari;
const TASLAK = "⚠️ Bu metin yapay zekâ ile üretilmiş bir TASLAKTIR; uygulanmadan önce ilgili uzman tarafından gözden geçirilip onaylanmalıdır.";

describe("cevap_anahtari: istendi (prompt: '6. Cevap anahtarı')", () => {
  it.each([
    ["düz madde", "## Cevap anahtarı\n1. 5\n2. 7"],
    ["numaralı başlık", "## 6. Cevap Anahtarı\n- 5"],
    ["büyük harfli başlık (tr-TR)", "## CEVAP ANAHTARI\n- 5"],
    ["açıklamalı başlık", "## Cevap anahtarı (öğretmen için)\n- 5"],
    ["kalın sözde başlık", "**Cevap anahtarı**\n- 5"],
    ["tablo", "## Cevap anahtarı\n| No | Cevap |\n|---|---|\n| 1 | 5 |"],
    ["alt başlıklı: içerik alt başlıkların altında (bölüm ağacı)", "## Cevap anahtarı\n### Kolay\n1. 5\n### Orta\n1. 7"],
    ["kalın alt etiketler (kök kalın)", "**Cevap anahtarı**\n**Kolay**\n1. 5\n**Orta**\n1. 7"],
    ["paragraf", "## Cevap anahtarı\n1) b  2) d  3) b"],
    ["son bölüm taslak notuyla biter ama içerik de var", `## Cevap anahtarı\n1. 5\n\n${TASLAK}`],
    ["'yanıt anahtarı' başlığı", "## Yanıt anahtarı\n1. 5"],
    ["'cevaplar' başlığı", "## Cevaplar\n1. 5"],
    ["'doğru yanıtlar' başlığı", "## Doğru yanıtlar\n1. 5"],
    ["satır-içi etiket (başlık yok)", "- madde\n**Cevap anahtarı:** 1) b 2) d"],
    ["satır-içi etiket, içerik sonraki satırlarda", "Cevap anahtarı:\n1. 5\n2. 7"],
    ["satır-içi etiket madde işaretli", "- Cevap anahtarı: 1) b 2) d"],
    ["istenmedi cümlesi olmayan, cevabın içinde 'değil' geçen satır + başka satır", "## Cevap anahtarı\n1. b (d değil)\n2. d"],
    ["yalnız olumsuz sözcük içeren GERÇEK cevap satırı ('anahtar/cevap/istenme' sözcüğü yok)", "## Cevap anahtarı\n1. b değildir, d'dir"],
    ["taslak notu yok, kısaltılmış uyarı satırı ve gerçek içerik", "## Cevap anahtarı\n1. b\n⚠ Uzman onayı gerekir"],
  ])("dolu → 1: %s", (_ad, t) => expect(anahtar(t, true)).toBe(1));
  it.each([
    ["bölüm yok", "## Zorluk varyantları\n- a"],
    ["boş bölüm", "## Cevap anahtarı\n"],
    ["bölüm yalnız boşluk/ayraç", "## Cevap anahtarı\n\n---\n"],
    ["bölüm yalnız alt başlık adları (içerik yok)", "## Cevap anahtarı\n### Kolay\n### Orta"],
    ["yalnız tablo başlığı", "## Cevap anahtarı\n| No | Cevap |\n|---|---|"],
    ["yalnız 'istenmedi' bildirimi", "## Cevap anahtarı\n(Cevap anahtarı istenmedi — ekleme.)"],
    ["'İSTENMEDİ' büyük harf (tr-TR)", "## Cevap anahtarı\n(CEVAP ANAHTARI İSTENMEDİ)"],
    ["'istenmediği için eklenmemiştir'", "## Cevap anahtarı\nCevap anahtarı istenmediği için eklenmemiştir."],
    ["'bu materyalde yer almamaktadır'", "## Cevap anahtarı\nCevap anahtarı bu materyalde yer almamaktadır."],
    ["yalnız taslak notu (son bölüm)", `## Cevap anahtarı\n\n${TASLAK}`],
    ["yalnız ⚠ ile başlayan kısa uyarı (taslak notunun tam metni değil)", "## Cevap anahtarı\n⚠ Uzman onayı gerekir."],
    ["⚠ işaretsiz taslak notu (normalize eşleşir)", "## Cevap anahtarı\nBu metin yapay zekâ ile üretilmiş bir TASLAKTIR; uygulanmadan önce ilgili uzman tarafından gözden geçirilip onaylanmalıdır."],
    ["kalın etiketli satır (başlık sayılır) boş; sonraki bölümün içeriği anahtar değil", "**Cevap anahtarı:**\n## Sınıf-içi farklılaştırma\n- Geniş satır aralığı"],
    ["satır-içi etiket (kalın değil) boş; sonraki bölümün içeriği anahtar değil", "Cevap anahtarı:\n## Sınıf-içi farklılaştırma\n- Geniş satır aralığı"],
    ["yalnız taslak notu + bildirim", `## Cevap anahtarı\n(Cevap anahtarı istenmedi — ekleme.)\n\n${TASLAK}`],
    ["boş metin", ""],
  ])("dolu değil → 0: %s", (_ad, t) => expect(anahtar(t, true)).toBe(0));
});

describe("cevap_anahtari: istenmedi (prompt: '(Cevap anahtarı istenmedi — ekleme.)')", () => {
  it.each([
    ["bölüm yok", "## Materyal gövdesi\n- a"],
    ["'istenmedi' bildirimi", "## Cevap anahtarı\n(Cevap anahtarı istenmedi — ekleme.)"],
    ["'İSTENMEDİ' büyük harf", "## Cevap anahtarı\n(CEVAP ANAHTARI İSTENMEDİ)"],
    ["'eklenmemiştir'", "## Cevap anahtarı\nCevap anahtarı eklenmemiştir."],
    ["bölüm yalnız taslak notu", `## Cevap anahtarı\n${TASLAK}`],
    ["başlıksız düz satır bildirimi", "Cevap anahtarı istenmedi — ekleme."],
    ["parantezli bildirim satırı (başlıksız)", "(Cevap anahtarı istenmedi — ekleme.)"],
    ["satır-içi etiket + 'istenmedi'", "Cevap anahtarı: istenmedi."],
    ["madde + 'eklenmedi'", "- Cevap anahtarı — eklenmedi"],
    ["boş bölüm", "## Cevap anahtarı"],
    ["boş metin", ""],
    ["gövde 'cevap' sözcüğü içerir ama anahtar değil", "## Materyal gövdesi\n- Çocuk cevabı kum tepsisine yazar."],
  ])("anahtar yok → 1: %s", (_ad, t) => expect(anahtar(t, false)).toBe(1));
  it.each([
    ["düz madde", "## Cevap anahtarı\n1. 5"],
    ["tablo", "## Cevap anahtarı\n| No | Cevap |\n|---|---|\n| 1 | 5 |"],
    ["alt başlıklı", "## Cevap anahtarı\n### Kolay\n1. 5"],
    ["satır-içi etiket", "**Cevap anahtarı:** 1) b 2) d"],
    ["'cevaplar' başlığı", "## Cevaplar\n1. 5"],
    ["bildirim + gerçek anahtar", "## Cevap anahtarı\n(Cevap anahtarı istenmedi.)\n1. 5"],
  ])("anahtar eklenmiş → 0: %s", (_ad, t) => expect(anahtar(t, false)).toBe(0));
  it.each(["Başlık", "Hedef", "Öğretmen notu", "Uygulama yönergesi", "Materyal gövdesi", "Zorluk varyantları", "Sınıf-içi farklılaştırma", "Farklılaştırma notları", "Uyarlama notları", "Kazanım"])(
    "kalın sözde başlık kökü: şablonun sonraki bölümü ('**%s**') cevap bölümünü bitirir; onun içeriği anahtar sayılmaz",
    (sonraki) => expect(anahtar(`**Cevap anahtarı**\n(Cevap anahtarı istenmedi — ekleme.)\n**${sonraki}**\n- Geniş satır aralığı`, false)).toBe(1),
  );
  it("ayrıntı: bölüm bulundu mu / dolu mu", () => {
    expect(kontrol("## Cevap anahtarı\n1. 5", { cevapAnahtari: false }).details).toMatchObject({ cevap_bolumu: true, cevap_dolu: true });
    expect(kontrol("## Cevap anahtarı\n(Cevap anahtarı istenmedi — ekleme.)").details).toMatchObject({ cevap_bolumu: true, cevap_dolu: false });
    expect(kontrol("## Başka").details).toMatchObject({ cevap_bolumu: false, cevap_dolu: false });
  });
});

describe("varyant: kolay + orta (+ ileri) istenen seviyelerin hepsi etiketli bulunmalı", () => {
  const varyant = (text: string, zorlukVaryanti: Govde["zorlukVaryanti"]) => kontrol(text, { zorlukVaryanti }).scores.varyant;
  it.each([
    ["### başlıklar", "## Zorluk varyantları\n### Kolay\n- a\n### Orta\n- b"],
    ["açıklamalı başlıklar", "## Zorluk varyantları\n### Kolay düzey (ısınma)\n- a\n### Orta düzey\n- b"],
    ["büyük harfli (tr-TR: 'KOLAY', 'İLERİ')", "## Zorluk varyantları\n### KOLAY\n- a\n### ORTA\n- b"],
    ["kalın etiket maddeleri", "## Zorluk varyantları\n- **Kolay:** a\n- **Orta:** b"],
    ["düz madde etiketleri", "## Zorluk varyantları\n- Kolay: a\n- Orta: b"],
    ["'Düzey 1 – Kolay' ön ekli", "## Zorluk varyantları\n- Düzey 1 – Kolay: a\n- Düzey 2 – Orta: b"],
    ["'Varyant A (Kolay)' ön ekli madde başı", "## Zorluk varyantları\n- Varyant A: Kolay\n- Varyant B: Orta"],
    ["tablo sütun başlıkları", "## Zorluk varyantları\n| Kolay | Orta |\n|---|---|\n| a | b |"],
    ["tablo satırları", "## Zorluk varyantları\n| Düzey | Görev |\n|---|---|\n| Kolay | a |\n| Orta | b |"],
    ["etiketler gövdede (varyant bölümü yok)", "## Materyal gövdesi\n### Kolay\n- a\n### Orta\n- b"],
    ["sıra farklı", "## Zorluk varyantları\n### Orta\n- b\n### Kolay\n- a"],
    ["fazladan seviye sorun değil", "## Zorluk varyantları\n### Kolay\n### Orta\n### İleri"],
    ["numaralı madde", "## Zorluk varyantları\n1. Kolay: a\n2. Orta: b"],
    ["'A) Kolay'", "## Zorluk varyantları\n- A) Kolay: a\n- B) Orta: b"],
  ])("→ 1: %s", (_ad, t) => expect(varyant(t, "kolay_orta")).toBe(1));
  it.each([
    ["yalnız kolay", "## Zorluk varyantları\n### Kolay"],
    ["yalnız orta", "## Zorluk varyantları\n### Orta"],
    ["orta + ileri, kolay yok (sayı değil, İSTENEN seviyeler)", "## Zorluk varyantları\n### Orta\n### İleri"],
    ["hiç etiket yok", "## Zorluk varyantları\n- a\n- b"],
    ["boş metin", ""],
    // sözcük sınırı: seviye sözcüklerinin türevleri etiket değildir
    ["'kolaylaştırma' / 'ortam' / 'ilerleme' başlıkları", "## Kolaylaştırma\n## Ortam düzenlemesi\n## İlerleme takibi"],
    ["'ortak' ve 'ortalama' başlıkları", "## Ortak etkinlik\n## Ortalama puan\n## Kolaydan zora"],
    ["cümle içinde seviye sözcükleri (etiket değil)", "## Zorluk varyantları\nBu materyal kolay ve orta düzeyler için hazırlanmıştır."],
    ["sözcük ortasında seviye sözcüğü", "## Zorluk varyantları\n### Çokkolay\n### Süperorta"],
    ["seviye sözcüğüyle başlayan başka sözcükler (kolaylaştırma, ortak, ilerleme)", "## Zorluk varyantları\n- Kolaylaştırma: a\n- Ortak etkinlik: b\n- İlerleme takibi: c"],
    ["maddede ortada geçen sözcük", "## Zorluk varyantları\n- Görev kolay olunca sürenin ortası ileri alınır."],
  ])("→ 0: %s", (_ad, t) => expect(varyant(t, "kolay_orta")).toBe(0));
  it("üç varyant: kolay + orta + ileri üçü de gerekir", () => {
    expect(varyant("## Zorluk varyantları\n### Kolay\n### Orta\n### İleri", "kolay_orta_ileri")).toBe(1);
    expect(varyant("## Zorluk varyantları\n### Kolay\n### Orta", "kolay_orta_ileri")).toBe(0);
    expect(varyant("## Zorluk varyantları\n### Kolay\n### İleri", "kolay_orta_ileri")).toBe(0);
    expect(varyant("## Zorluk varyantları\n- **Kolay:** a\n- **Orta:** b\n- **İleri:** c", "kolay_orta_ileri")).toBe(1);
  });
  it("bilinmeyen varyant değeri `tek` gibi (çökmez)", () => {
    expect(varyant("## Zorluk varyantları\n### Orta", undefined as never)).toBe(1);
  });
  it("ayrıntı: bulunan seviyeler", () => {
    expect(kontrol("## Zorluk varyantları\n### Kolay\n### Orta").details.varyant_bulunan).toBe("kolay|orta");
    expect(kontrol("## Başka", { zorlukVaryanti: "kolay_orta" }).details.varyant_bulunan).toBe("");
  });
});

describe("varyant: tek düzey istendi → varyant bölümünde birden çok seviye sunulmamalı", () => {
  const varyant = (text: string) => kontrol(text, { zorlukVaryanti: "tek" }).scores.varyant;
  it.each([
    ["bölüm yok (ölçülecek bir şey yok; yapı puanı düşer)", "## Materyal gövdesi\n- a"],
    ["boş metin", ""],
    ["bölüm var, etiket yok", "## Zorluk varyantları\nTek düzey istendi."],
    ["tek seviye etiketli", "## Zorluk varyantları\n### Orta (tek düzey)\n- a"],
    ["tek seviye madde etiketi", "## Zorluk varyantları\n- **Orta:** tek düzey"],
    ["varyant bölümü dışındaki kolay/orta/ileri etiketleri sayılmaz", "## Zorluk varyantları\nTek düzey.\n## Materyal gövdesi\n### Kolay\n### Orta\n### İleri\n## Sınıf-içi farklılaştırma\n- Kolay: x\n- İleri: y"],
    ["cümle içinde geçen seviye sözcükleri etiket değil", "## Zorluk varyantları\nTek düzey (orta) istendi; kolay ya da ileri düzey üretilmedi."],
  ])("→ 1: %s", (_ad, t) => expect(varyant(t)).toBe(1));
  it.each([
    ["üç seviye başlığı", "## Zorluk varyantları\n### Kolay\n### Orta\n### İleri"],
    ["iki seviye başlığı", "## Zorluk varyantları\n### Kolay\n### Orta"],
    ["iki seviye madde etiketi", "## Zorluk varyantları\n- Kolay: a\n- İleri: b"],
    ["iki seviye tablo sütunu", "## Zorluk varyantları\n| Kolay | Orta |\n|---|---|\n| a | b |"],
    ["alt başlıklarda iki seviye", "## Zorluk varyantları\n### Düzey\n#### Kolay\n#### Orta"],
    ["kalın sözde başlık kökü: iki seviye", "**Zorluk varyantları**\n**Kolay**\n- a\n**Orta**\n- b\n**Sınıf-içi farklılaştırma**\n- x"],
  ])("→ 0: %s", (_ad, t) => expect(varyant(t)).toBe(0));
});

describe("çıktı sözleşmesi", () => {
  it("`talimat` döndürülmez; yalnız cevap_anahtari ve varyant; sert hata yok; boş metinde çökmez", () => {
    const r = kontrol("## Zorluk varyantları\n### Kolay\n### Orta\n## Cevap anahtarı\n1. 5");
    expect(Object.keys(r.scores).sort()).toEqual(["cevap_anahtari", "varyant"]);
    expect(r.scores).toEqual({ cevap_anahtari: 1, varyant: 1 });
    expect(r.details).toMatchObject({ cevap_anahtari: 1, varyant: 1 });
    expect(r.hard).toEqual([]);
    expect(kontrol("").scores).toEqual({ cevap_anahtari: 0, varyant: 0 });
  });
});
