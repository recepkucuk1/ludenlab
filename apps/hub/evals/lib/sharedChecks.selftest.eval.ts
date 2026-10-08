// apps/hub/evals/lib/sharedChecks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { adGeciyorMu, countSentences, dilKurali, markdownHeadings, parseJsonLoose, rumuzYok, yasakKalip } from "./sharedChecks";

describe("sharedChecks", () => {
  it("dil kuralı: hasta/terapist/ödül sayar", () => {
    const r = dilKurali("Hasta için terapist ödül versin. Hastane değil.");
    expect(r).toMatchObject({ hasta: 1, terapist: 1, odul: 1, score: 0 });
    expect(dilKurali("Öğrenci ve uzman birlikte çalışır.").score).toBe(1);
  });
  it("rumuz sızıntısı: çıktıda rumuz kalmışsa 0", () => {
    expect(rumuzYok({ title: "Defne için hikâye" }, "Defne")).toBe(0);
    expect(rumuzYok({ title: "Ela için hikâye" }, "Defne")).toBe(1);
    expect(rumuzYok({ title: "x" }, null)).toBe(1);
  });
  it("yasak kalıp: bulunanları listeler, puanı düşürür", () => {
    expect(yasakKalip("Sabırlı olun ve düzenli tekrar önemlidir.")).toEqual({ found: ["sabırlı ol", "düzenli tekrar önemli"], score: 0.5 });
    expect(yasakKalip("Somut adım.")).toEqual({ found: [], score: 1 });
  });
  it("gevşek JSON: kod çitli ve düz metni çözer, bozukta null", () => {
    expect(parseJsonLoose('Önsöz ```json\n{"a":1}\n``` son')).toEqual({ a: 1 });
    expect(parseJsonLoose('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonLoose("{a:1}")).toBeNull();
  });
  it("cümle sayısı ve Markdown başlıkları", () => {
    expect(countSentences("Bu bir cümle. Bu da ikinci! Üçüncü mü?")).toBe(3);
    expect(markdownHeadings("## Okuma\nmetin\n### Kısa dönem hedefler\n- a")).toEqual(["Okuma", "Kısa dönem hedefler"]);
  });
  it("dil kuralı: çekimli biçimler ve Türkçe büyük harf", () => {
    expect(dilKurali("Hastanın ailesi, hastaya, hastalar").hasta).toBe(3);
    expect(dilKurali("Hastanede, hastalığı, hastalık, hastalanmak").hasta).toBe(0);
    expect(dilKurali("TERAPİST, ÇIKARTMA, YILDIZ TABLOSU")).toMatchObject({ terapist: 1, odul: 2, score: 0 });
    expect(dilKurali("Dışsal ödül önerilmez; toplama ve çıkartma çalışılır.")).toMatchObject({ odul: 2, score: 1 });
  });
  it("dil kuralı: 'hasta ol-' (rahatsızlanmak) sayılmaz, 'hasta' (kişi) sayılır", () => {
    expect(dilKurali("Hasta olunca evde kalırım.").hasta).toBe(0);
    expect(dilKurali("Hastanın ailesi").hasta).toBe(1);
  });
  it("rumuz: ekli/büyük harfli geçiş sızıntı; kelime içi ve görsel alan değil", () => {
    expect(rumuzYok({ t: "Defne'nin çantası" }, "Defne")).toBe(0);
    expect(rumuzYok({ t: "Defneyle oynadı" }, "Defne")).toBe(0);
    expect(rumuzYok({ t: "DEFNE İÇİN" }, "Defne")).toBe(0);
    expect(rumuzYok("## Defne için plan", "Defne")).toBe(0);
    expect(rumuzYok({ t: "Elastik bant kullanın." }, "Ela")).toBe(1);
    expect(rumuzYok({ s: [{ text: "Ayşe okula gider.", visualPrompt: "Defne walks to school" }] }, "Defne")).toBe(1);
  });
  it("adGeciyorMu: kelime sınırı + ek + büyük harf", () => {
    expect(adGeciyorMu("Elanın çantası", "Ela")).toBe(true);
    expect(adGeciyorMu("ELA'YA verin", "Ela")).toBe(true);
    expect(adGeciyorMu("Elastik bant", "Ela")).toBe(false);
    expect(adGeciyorMu("{\"notes\":\"Ela için plan\"}", "Ela")).toBe(true);
    expect(adGeciyorMu("x", "")).toBe(false);
  });
  it("gevşek JSON: çitli iç içe nesne", () => {
    expect(parseJsonLoose('```json\n{"a":{"b":[1,{"c":2}]}}\n```')).toEqual({ a: { b: [1, { c: 2 }] } });
  });
  it("yasak kalıp: 4+ kalıpta puan 0", () => {
    expect(yasakKalip("Sabırlı olun. Düzenli tekrar önemlidir. Uygun ortam sağlayın. Motivasyonu yüksek tutun. Gelişimini takip edin.").score).toBe(0);
  });
  it("başlıklar: yalnız ## ve ###", () => {
    expect(markdownHeadings("# Belge\n## A\n#### D\n### B")).toEqual(["A", "B"]);
  });
});
