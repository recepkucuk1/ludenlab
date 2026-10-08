// apps/hub/evals/lib/sharedChecks.selftest.eval.ts
import { describe, expect, it } from "vitest";
import { countSentences, dilKurali, markdownHeadings, parseJsonLoose, rumuzYok, yasakKalip } from "./sharedChecks";

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
});
