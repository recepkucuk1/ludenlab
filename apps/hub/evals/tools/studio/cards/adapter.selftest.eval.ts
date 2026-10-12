// apps/hub/evals/tools/studio/cards/adapter.selftest.eval.ts
import "../../../mocks.setup";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CARD_SYSTEM_PROMPT, buildCardPrompt } from "@studio/lib/prompts";
import { cardGenerateBodySchema } from "@studio/lib/validation";
import { describe, expect, it } from "vitest";
import type { CaseDef, StudioFixture } from "../../../lib/core";
import { realFirstName, resolveFixture } from "../../../lib/fixtures";
import { metinler, yasakKalip } from "../../../lib/sharedChecks";
import { tempFlow } from "../../../lib/testFlow";
import { adapter, AGE_TR, CAT_TR, DIFF_TR, YAS_KURALI, ZORLUK_KURALI } from "./adapter";
import type { CardBody } from "./checks";

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")) as CaseDef<CardBody>[];
const vaka = (id: string) => cases.find((c) => c.id === id)!;
const fikstur = (c: CaseDef<CardBody>) => (c.student ? (resolveFixture("studio", c.student) as StudioFixture) : null);
const gorev = (id: string) => adapter.renderTask(vaka(id), fikstur(vaka(id)));
const sade = (s: string) => s.replace(/\s+/g, " ");

const body: CardBody = { category: "language", difficulty: "easy", ageGroup: "3-6", focusArea: "üç kelimeli istek cümlesi" };
const card = (not = "Hazal'ı her denemede sözel olarak cesaretlendirin.") => ({
  title: "Su istiyorum", objective: "Üç kelimeli istek cümlesi kurma",
  materials: ["bardak", "resimli kart"],
  instructions: ["Adım 1: Bardağı göster.", "Adım 2: İsteği bekle.", "Adım 3: Cümleyi genişleterek modelle."],
  exercises: [{ name: "İstek oyunu", description: "Bardakla oyun içinde istek fırsatı yarat.", repetitions: "5 tekrar" }],
  therapistNotes: not, progressIndicators: ["5 denemeden 4'ünde üç kelimeli istek kurar", "3 oturum üst üste %80 bağımsız"],
  homeExercise: "Akşam yemeğinde bir şey isterken cümleyi bir sözcük uzatın.",
  category: "language", difficulty: "easy", ageGroup: "3-6",
});
const ref = card();
type Ref = ReturnType<typeof card>;

describe("öğrenme kartı adaptörü", () => {
  it("4 vaka, fikstürler çözülür (kart-02 öğrencisiz); 4 ortak + 4 araç ölçütü", () => {
    expect(cases.map((c) => c.id)).toEqual(["kart-01", "kart-02", "kart-03", "kart-04"]);
    for (const c of cases) expect(resolveFixture("studio", c.student)?.id ?? null).toBe(c.student);
    expect(vaka("kart-02").student).toBeNull();
    expect(adapter.criteria.map((c) => c.key).slice(4)).toEqual(["hedef_hizasi", "progresyon", "yas_uyumu", "dil_kurali"]);
  });

  it("vaka gövdeleri rotanın şemasına uyar; müfredat kimliği yok (taklitte çözülemez), odak alanı var", () => {
    for (const c of cases) {
      expect(cardGenerateBodySchema.safeParse(c.body).success, c.id).toBe(true);
      expect(c.body.curriculumGoalIds, c.id).toBeUndefined();
      expect((c.body.focusArea ?? "").trim().length, c.id).toBeGreaterThan(0);
    }
    expect(cases.map((c) => c.body.ageGroup)).toEqual(["3-6", "7-12", "7-12", "adult"]);
  });

  it("her öğrencili vakanın yaş grubu fikstürün BUGÜNKÜ yaşıyla (yıl farkı: hakem çizimiyle aynı hesap) uyuşur — fikstür eskirse bu test yüksek sesle kırılır", () => {
    const yil = new Date().getFullYear();
    const kova = (yas: number): CardBody["ageGroup"] => (yas >= 18 ? "adult" : yas >= 13 ? "13-18" : yas >= 7 ? "7-12" : "3-6");
    for (const c of cases) {
      if (!c.student) continue;
      const yas = yil - new Date(fikstur(c)!.birthDate).getFullYear();
      expect(kova(yas), `${c.id}: fikstür ${yas} yaşında, vaka '${c.body.ageGroup}' diyor (fikstürü ya da vakayı güncelle)`).toBe(c.body.ageGroup);
    }
  });

  describe("hakem görevi", () => {
    it("etiketler route prompt'unun etiketleriyle AYNI: gerçek buildCardPrompt çıktısında geçer", () => {
      for (const cat of Object.keys(CAT_TR) as CardBody["category"][]) expect(buildCardPrompt({ category: cat, difficulty: "easy", ageGroup: "3-6" })).toContain(`**KATEGORİ:** ${CAT_TR[cat]}`);
      for (const d of Object.keys(DIFF_TR) as CardBody["difficulty"][]) expect(buildCardPrompt({ category: "speech", difficulty: d, ageGroup: "3-6" })).toContain(`**ZORLUK:** ${DIFF_TR[d]}`);
      for (const a of Object.keys(AGE_TR) as CardBody["ageGroup"][]) expect(buildCardPrompt({ category: "speech", difficulty: "easy", ageGroup: a })).toContain(`**YAŞ GRUBU:** ${AGE_TR[a]}`);
    });
    it("zorluk ve yaş kuralı satırları sistem prompt'undaki tanımlardan alınmıştır", () => {
      const sistem = sade(CARD_SYSTEM_PROMPT);
      for (const k of ["easy", "medium", "hard"] as const) expect(sistem, k).toContain(ZORLUK_KURALI[k]);
      for (const k of ["3-6", "7-12", "13-18", "adult"] as const) expect(sistem, k).toContain(YAS_KURALI[k]);
    });
    it("kart-01: etiketli satırlar, odak, kurallar ve müfredat notu; öğrenci bloğu", () => {
      const t = gorev("kart-01");
      expect(t).toContain("- Kategori: dil · Zorluk: kolay (başlangıç seviyesi) · Yaş grubu: 3-6 yaş (okul öncesi) · Hedef beceri / odak alan: Üç kelimeli istek cümlesini oyun içinde bağımsız üretme");
      expect(t).toContain(`- Zorluk kuralı (sistem prompt'u): ${ZORLUK_KURALI.easy}.`);
      expect(t).toContain(`- Yaş grubu kuralı (sistem prompt'u): ${YAS_KURALI["3-6"]}.`);
      expect(t).toContain("müfredat hedefi kimlikleri bu düzenekte çözülmez");
      expect(t).toContain("- Öğrenci bağlamı ortak bloktan gider: notlar, AI profilinin iki bölümü (öncelikli alanlar, dikkat noktaları), son kartlar, son oturum özeti (değerlendirme + sonraki plan; davranış notu gitmez), atanmış müfredat başlıkları, tamamlanan ve sürmekte olan hedefler.");
      expect(t).toContain("- Öğrenci: Ela Şahin");
      expect(t).toContain("- Neyi sınıyor: Son kartlarla");
    });
    it("kart-04 (yetişkin): yaş etiketi 'yetişkin', çocuk kuralı yok", () => {
      const t = gorev("kart-04");
      expect(t).toContain("Yaş grubu: yetişkin (18 yaş üzeri)");
      expect(t).toContain(YAS_KURALI.adult);
      expect(t).not.toContain(YAS_KURALI["3-6"]);
    });
    it("kart-02: öğrenci yok → 'Öğrenci seçilmedi'; ortak blok notu yazılmaz", () => {
      expect(gorev("kart-02")).toContain("- Öğrenci seçilmedi (genel materyal).");
      expect(gorev("kart-02")).not.toContain("ortak bloktan gider");
    });
    it("kart-03: ödünleşim açık (son kart çizgi roman temasını kullanıyor; kural 2a); hiçbir vaka amacında 'terapist' yok", () => {
      const c = vaka("kart-03");
      expect(c.purpose).toContain("kural 2a");
      expect(c.purpose).toContain("'kediler'");
      expect(fikstur(c)!.recentCards.some((k) => /çizgi roman/i.test(k.title))).toBe(true); // iddia fikstürde gerçek
      for (const k of cases) expect(k.purpose, k.id).not.toMatch(/terapist/i); // Studio sert kuralı "terapist" sözcüğünü yasaklar; hakem de anmasın
    });
    it("ölçütler vakalarla çelişmez: yaş ölçütü yetişkini çocuksu oyunla ölçmez; hedef ölçütü müfredat hedefi beklemez", () => {
      const q = (k: string) => adapter.criteria.find((c) => c.key === k)!.question;
      expect(q("yas_uyumu")).toContain("yetişkin");
      expect(q("yas_uyumu")).toContain("profesyonel ton");
      expect(q("hedef_hizasi")).toContain("odak alanına");
      expect(q("hedef_hizasi")).toContain("müfredat hedefi bu düzenekte verilmez");
      expect(q("progresyon")).toContain("ölçülebilir");
    });
    it("dil kuralı ölçütü (2026-10-12): üç yasak sınıfını sayar ve hakemin NİHAİ kararına (overall/critical_errors) bağlanır — 'kolayca düzeltilebilir' kaçağını kapatır", () => {
      const q = adapter.criteria.find((c) => c.key === "dil_kurali")!.question;
      for (const yasak of ["'terapist'", "'hasta'", "ödül sistemi"]) expect(q).toContain(yasak);
      expect(q).toContain("critical_errors"); // judge.ts'in verdict alanı adlarıyla aynı: hakem talimatı ölçüt puanı değil, nihai karar düzeyinde uygular
      expect(q).toContain("overall");
      expect(q).toContain("tek başına tercihi çevirir");
      expect(q).toContain("kolayca düzeltilebilir");
      expect(adapter.criteria.filter((c) => c.key === "dil_kurali")).toHaveLength(1); // ortak ölçütlerle (dil_etik) anahtar çakışması yok
    });
  });

  describe("gerçek rota (subagent düzeneği: istek yazılır, yanıt okunur) — bağlantı", () => {
    const pendingOf = (p: string) => JSON.parse(readFileSync(p, "utf8")) as Array<{ requestMd: string; responseTxt: string }>;
    const rows = (p: string) => readFileSync(p, "utf8").trim().split("\n").map((l) => JSON.parse(l) as Record<string, unknown>);
    const opts = (flowDir: string, id: string) => ({ tool: "studio/cards", variant: "baseline" as const, backend: "subagent" as const, flowDir, cases: [id], timeoutS: 30 });
    const runEval = async (o: ReturnType<typeof opts>) => (await import("../../../lib/runner")).runEval(o);
    const outFile = (flow: string) => path.join(flow, "studio/cards/baseline/out", readdirSync(path.join(flow, "studio/cards/baseline/out"))[0]!);

    it("öğrencili vaka: istek md'sinde emit_card şeması (instructions alanı), ortak öğrenci bloğu rumuzlu, gerçek ad yok; son kartlar, özet ve hedefler araca gider; yanıt → puanlar", async () => {
      const flow = tempFlow("flow-kart-");
      let s = await runEval(opts(flow, "kart-01"));
      expect(s).toMatchObject({ done: 0, failed: 0, pending: 1 });
      const pend = pendingOf(s.pendingPath);
      expect(pend).toHaveLength(1);
      const md = readFileSync(pend[0]!.requestMd, "utf8");
      expect(md).toContain("<output_schema>");
      expect(md).toContain('"title": "emit_card"');
      expect(md).toContain('"instructions"');
      expect(md).toContain("**ÖĞRENCİ BAĞLAMI:**");
      // Ortak blok (studentContext.ts) kimlik satırı: "Öğrenci: <rumuz>, N yaş" — tiresiz, satır başında.
      const alias = /^Öğrenci: ([^,\n]+)/m.exec(md)?.[1]?.trim();
      expect(alias).toBeTruthy();
      expect(md).not.toContain(realFirstName(resolveFixture("studio", "stu-ela"))!);
      expect(md).toContain("Tamamlanan hedefler: 2.1");
      expect(md).toContain("Sürmekte olan hedefler: Üç sözcüklü istek cümlesi, Sıra alma oyunları");
      expect(md).toContain("Dinozor kartlarıyla sıra alma"); // son kartlar araca gider (kart-01 'tekrarlama' sınavı)
      expect(md).toContain("Modüller: Pragmatik dil");
      // Hakem notundaki iddia gerçek: son oturum özetinin değerlendirmesi ve sonraki planı gider, davranış notu gitmez.
      expect(md).toContain("modelle %60 üretti");
      expect(md).toContain("Sonraki plan: Üç kelimeli cümleyi oyun içinde bağımsız üretime taşı");
      expect(md).not.toContain("sakin köşede görsel sıra kartıyla etkinliğe döndü");

      writeFileSync(pend[0]!.responseTxt, JSON.stringify(card(`${alias}'ı her denemede cesaretlendirin.`)));
      s = await runEval(opts(flow, "kart-01"));
      expect(s).toMatchObject({ done: 1, failed: 0, pending: 0 });
      const r = rows(s.resultsPath)[0]!;
      expect(r.hard_fail).toEqual([]);
      expect(r.grade).toMatchObject({ format_ok: 1, talimat: 1, isim_kullanimi: 1, rumuz_yok: 1, dil_kurali: 1, adim_bicimi: 1, gosterge_olculebilir: 1 });
      expect(r.meta).toMatchObject({ alias_found: true });
      // Route rumuzu gerçek adla geri koyar; kontrol ham çıktıdaki rumuzdan isim kullanımını okur.
      const out = JSON.parse(readFileSync(outFile(flow), "utf8")) as { ok: boolean; output: Ref };
      expect(out.ok).toBe(true);
      expect(out.output.therapistNotes).toContain("Ela");
      expect(out.output.therapistNotes).not.toContain(alias!);
    });

    it("öğrencisiz vaka: öğrenci bağlamı ve isim satırı yok, isim_kullanimi puanı yazılmaz", async () => {
      const flow = tempFlow("flow-kart-");
      let s = await runEval(opts(flow, "kart-02"));
      const pend = pendingOf(s.pendingPath);
      const md = readFileSync(pend[0]!.requestMd, "utf8");
      expect(md).toContain('"instructions"');
      expect(md).not.toContain("ÖĞRENCİ BAĞLAMI");
      expect(md).not.toMatch(/^Öğrenci: /m);
      writeFileSync(pend[0]!.responseTxt, JSON.stringify(card("Çocuğu cesaretlendirin.")));
      s = await runEval(opts(flow, "kart-02"));
      const r = rows(s.resultsPath)[0]!;
      expect((r.grade as Record<string, number>).isim_kullanimi).toBeUndefined();
      expect(r.grade).toMatchObject({ talimat: 1, rumuz_yok: 1 });
    });
  });

  describe("kontroller fabrika üzerinden", () => {
    it("iyi çıktı: sert hata yok, talimat 1; ham çıktıdaki rumuz isim kullanımını gösterir", () => {
      const out = card("Ela'yı her denemede cesaretlendirin."); // route gerçek adı geri koymuş
      const r = adapter.checks({ body, output: out, rawText: JSON.stringify(card("Hazal'ı her denemede cesaretlendirin.")), alias: "Hazal" });
      expect(r.hard_fail).toEqual([]);
      expect(r.scores).toMatchObject({ talimat: 1, isim_kullanimi: 1, rumuz_yok: 1, dil_kurali: 1, yasak_kalip: 1 });
    });
    it("rumuz çıktıda kalmışsa (geri koyma bozuk) sert hata", () => {
      const r = adapter.checks({ body, output: card("Hazal'ı cesaretlendirin."), rawText: JSON.stringify(card("Hazal'ı cesaretlendirin.")), alias: "Hazal" });
      expect(r.scores.rumuz_yok).toBe(0);
      expect(r.hard_fail).toContain("rumuz_sizintisi");
    });
    it("yönergesiz kart: yonerge_yok; JSON çözülemezse json_gecersiz ve talimat 0", () => {
      const out = { ...card(), instructions: [] };
      expect(adapter.checks({ body, output: out, rawText: JSON.stringify(out), alias: null }).hard_fail).toContain("yonerge_yok");
      const r = adapter.checks({ body, output: null, rawText: "kart üretemedim", alias: null });
      expect(r.hard_fail).toEqual(expect.arrayContaining(["json_gecersiz", "cikti_yok"]));
      expect(r.scores.talimat).toBe(0);
    });
  });

  describe("hakem çizimi", () => {
    it("etiketli Türkçe metin: başlık, amaç, malzeme, adımlar, egzersizler, notlar, göstergeler, ev egzersizi", () => {
      const t = adapter.renderForJudge(ref);
      expect(t).toContain("Başlık: Su istiyorum");
      expect(t).toContain("Amaç: Üç kelimeli istek cümlesi kurma");
      expect(t).toContain("Materyaller: bardak, resimli kart");
      expect(t).toContain("  Adım 2: İsteği bekle.");
      expect(t).toContain("  • İstek oyunu: Bardakla oyun içinde istek fırsatı yarat. (5 tekrar)");
      expect(t).toContain("Uzman notları: Hazal'ı");
      expect(t).toContain("İlerleme göstergeleri: 5 denemeden 4'ünde üç kelimeli istek kurar | 3 oturum üst üste %80 bağımsız");
      expect(t).toContain("Ev egzersizi: Akşam yemeğinde");
      expect(t).not.toContain("category");
    });
    it("çıktı yok: hakem hata metnini görür", () => {
      expect(adapter.renderForJudge(null)).toContain("Çıktı üretilemedi");
    });
    it("bozuk çıktı (null öğeler, eksik alanlar) çökmez; boş alanlar '—'", () => {
      const bozuk = { ...ref, materials: [null, "bardak"], instructions: [null, "Adım 2: b"], exercises: [null, { name: "x" }, "m"], progressIndicators: [null], objective: undefined };
      let t = "";
      expect(() => (t = adapter.renderForJudge(bozuk))).not.toThrow();
      expect(t).toContain("Amaç: —");
      expect(t).toContain("Materyaller: —, bardak");
      expect(t).toContain("  Adım 2: b");
      expect(adapter.renderForJudge({})).toContain("Başlık: —");
    });
  });

  describe("jenerik aday", () => {
    it("≥ 4 yasak kalıp taşır, hakeme referanstan farklı görünür; başlık, malzeme ve egzersiz adları/tekrarları korunur, derin kopya", () => {
      const before = JSON.stringify(ref);
      const g = adapter.genericCandidate(ref) as Ref;
      expect(JSON.stringify(ref)).toBe(before);
      expect(yasakKalip(metinler(g).join("\n")).found.length).toBeGreaterThanOrEqual(4);
      expect(adapter.renderForJudge(g)).not.toBe(adapter.renderForJudge(ref));
      expect(g.title).toBe(ref.title);
      expect(g.materials).toEqual(ref.materials);
      expect(g.exercises.map((e) => [e.name, e.repetitions])).toEqual(ref.exercises.map((e) => [e.name, e.repetitions]));
      expect(g.instructions).toHaveLength(ref.instructions.length);
      expect(g.instructions.every((s, i) => s.startsWith(`Adım ${i + 1}:`))).toBe(true);
    });
    it("amaç, uzman notu, ev egzersizi, göstergeler ve egzersiz açıklamaları jenerik olur; göstergeler soyut (ölçülebilir değil)", () => {
      const g = adapter.genericCandidate(ref) as Ref;
      for (const k of ["objective", "therapistNotes", "homeExercise"] as const) expect(g[k], k).not.toBe(ref[k]);
      expect(g.progressIndicators).not.toEqual(ref.progressIndicators);
      expect(g.exercises[0]!.description).not.toBe(ref.exercises[0]!.description);
      const r = adapter.checks({ body, output: g, rawText: JSON.stringify(g), alias: null });
      expect(r.scores.gosterge_olculebilir).toBe(0);
    });
    it("kısa/boş çıktıda da ≥ 4 yasak kalıp ve çökmez (null öğeler dahil)", () => {
      for (const kisa of [{}, { ...ref, instructions: undefined, exercises: null }, { ...ref, instructions: [null], exercises: [null, "m"] }]) {
        const g = adapter.genericCandidate(kisa);
        expect(yasakKalip(metinler(g).join("\n")).found.length).toBeGreaterThanOrEqual(4);
      }
    });
  });
});
