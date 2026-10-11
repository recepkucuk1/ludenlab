// apps/hub/evals/tools/studio/ai-profile/adapter.selftest.eval.ts
import "../../../mocks.setup";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HarnessError, type CaseDef, type StudioFixture } from "../../../lib/core";
import { realFirstName, resolveFixture } from "../../../lib/fixtures";
import { basligiNormalle } from "../../../lib/markdown";
import { yasakKalip } from "../../../lib/sharedChecks";
import { tempFlow } from "../../../lib/testFlow";
import { adapter } from "./adapter";
import { PROFIL_BOLUMLERI, type ProfileBody } from "./checks";

/** Koşturucunun rumuz deseninin blok dalı (`runner.ts` RUMUZ_DESENI): Task 13'ten beri profil istemi kimliği ortak bloğun
    `Öğrenci: <rumuz>, N yaş` satırında taşır (eski `Öğrenci adı:` satırı yok). */
const RUMUZ = /^Öğrenci: ([^,\n]+)(?:, \d+ yaş)?$(?=\nÇalışma alanı: )/m;

const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "cases.json"), "utf8")) as CaseDef<ProfileBody>[];
const vaka = (id: string) => cases.find((c) => c.id === id)!;
const fikstur = (c: CaseDef<ProfileBody>) => resolveFixture("studio", c.student) as StudioFixture;
const gorev = (id: string) => adapter.renderTask(vaka(id), fikstur(vaka(id)));

const cumleler = (n: number, ek = "") => Array.from({ length: n }, (_, i) => `Cümle ${i + 1} burada${ek}.`).join(" ");
/** Tam, kurallara uygun profil; `ad` her ana bölümde geçer (rumuz/gerçek ad testleri için). */
const profil = (ad = "Hazal") =>
  [
    "## Kavramsal Arka Plan", "",
    `### Tanının Klinik Açıklaması\n${cumleler(4)}`, "",
    `### Bu Yaş Grubunda Beklenen Gelişim\n${cumleler(3, ` (${ad})`)}`, "",
    `### Müfredat Modülleriyle İlişki\n${cumleler(4)}`, "",
    "---", "",
    "## Uzmana Öneriler", "",
    "### Öncelikli Çalışma Alanları\n- Hedef bir\n- Hedef iki\n- Hedef üç", "",
    `### Etkili Yaklaşım ve Teknikler\n${cumleler(3)}`, "",
    `### Dikkat Edilmesi Gereken Noktalar\n${cumleler(3)}`, "",
    `### Aile ile Paylaşılabilecek Öneriler\n${cumleler(3)}`,
  ].join("\n");

describe("AI profili adaptörü", () => {
  it("4 vaka, hepsi öğrencili ve fikstürleri çözülür; 4 ortak + 2 araç ölçütü", () => {
    expect(cases.map((c) => c.id)).toEqual(["profil-01", "profil-02", "profil-03", "profil-04"]);
    for (const c of cases) {
      expect(c.student, c.id).not.toBeNull();
      expect(resolveFixture("studio", c.student)?.id, c.id).toBe(c.student);
    }
    expect(adapter.criteria.map((c) => c.key).slice(4)).toEqual(["klinik_dogruluk", "eyleme_donukluk"]);
  });

  it("modulSayisi fikstürün atanmış müfredat sayısıyla AYNI (kontrol, hakem notu ve üretilen istem aynı gerçeği taşır)", () => {
    for (const c of cases) expect(c.body.modulSayisi, c.id).toBe(fikstur(c).curriculumTitles.length);
    expect(cases.map((c) => c.body.modulSayisi)).toEqual([1, 0, 1, 0]);
  });

  it("vaka amaçlarında 'terapist' yok (Studio sert dil kuralı sözcüğü yasaklar; hakem görevi de anmasın); profil-03 uzmanın rolünü anar", () => {
    for (const c of cases) expect(c.purpose, c.id).not.toMatch(/terapist/i);
    expect(vaka("profil-03").purpose).toContain("uzmanın işitme alanındaki rolü");
  });

  it("profil-04 yetişkin (doğum tarihi sabit); ölçütler vakalarla çelişmez: yetişkini çocuk varsayımıyla, aileyi çocuk ailesi sanarak ölçmez", () => {
    expect(new Date(fikstur(vaka("profil-04")).birthDate).getFullYear()).toBeLessThanOrEqual(2008);
    const q = (k: string) => adapter.criteria.find((c) => c.key === k)!.question;
    expect(q("klinik_dogruluk")).toContain("Yetişkin öğrencide çocuk gelişimi ya da çocuk varsayımı yok mu");
    expect(q("eyleme_donukluk")).toContain("yetişkinde aile yerine eş/yakın çevre ve iş bağlamı");
  });

  describe("hakem görevi", () => {
    it("fikstürdeki mevcut profil/özet araca GİTMEZ notu; istenen yapı; tanı notu", () => {
      const t = gorev("profil-01");
      expect(t).toContain("Mevcut AI profili araca GİTMEZ");
      expect(t).toContain("ortak öğrenci bloğu");
      expect(t).toContain("'## Kavramsal Arka Plan'");
      expect(t).toContain("her biri 3-5 cümle");
      expect(t).toContain("en önemli 3-5 hedef");
      expect(t).toContain("verilen tanıyı açıklamak hata değildir, yeni bir tanı koymak ya da atfetmek hatadır");
      expect(t).toContain("- Öğrenci: Ela Şahin");
      expect(t).toContain("- Neyi sınıyor: OSB");
    });
    it("modül notu yalnız modül atanmamış vakalarda (profil-02, profil-04)", () => {
      const NOT = "Atanmış müfredat modülü yok";
      expect(gorev("profil-02")).toContain(NOT);
      expect(gorev("profil-04")).toContain(NOT);
      expect(gorev("profil-01")).not.toContain(NOT);
      expect(gorev("profil-03")).not.toContain(NOT);
      expect(gorev("profil-03")).toContain("Atanmış müfredat: İşitsel algı ve ayırt etme"); // öğrenci bloğu
    });
    it("çıktı olduğu gibi gider; çıktı yoksa hakem hata metnini görür", () => {
      expect(adapter.renderForJudge(profil())).toBe(profil());
      expect(adapter.renderForJudge("  \n")).toContain("Çıktı üretilemedi");
      expect(adapter.renderForJudge(null)).toContain("Çıktı üretilemedi");
    });
  });

  it("öğrencisiz çağrı harness_error (rota öğrenci kimliğini yoldan alır)", async () => {
    await expect(adapter.invoke({}, null)).rejects.toBeInstanceOf(HarnessError);
    await expect(adapter.invoke({}, null)).rejects.toMatchObject({ failureClass: "harness_error" });
  });

  describe("gerçek rota (subagent düzeneği: istek yazılır, yanıt okunur) — bağlantı", () => {
    const opts = (flowDir: string, id: string) => ({ tool: "studio/ai-profile", variant: "baseline" as const, backend: "subagent" as const, flowDir, cases: [id], timeoutS: 30 });
    const runEval = async (o: ReturnType<typeof opts>) => (await import("../../../lib/runner")).runEval(o);
    const pendingOf = (p: string) => JSON.parse(readFileSync(p, "utf8")) as Array<{ requestMd: string; responseTxt: string }>;
    const rows = (p: string) => readFileSync(p, "utf8").trim().split("\n").map((l) => JSON.parse(l) as Record<string, unknown>);
    const outFile = (flow: string) => path.join(flow, "studio/ai-profile/baseline/out", readdirSync(path.join(flow, "studio/ai-profile/baseline/out"))[0]!);

    it("müfredatlı vaka (profil-01): isim rumuz, gerçek ad yok; tanı + ortak blok (modül, not, son kartlar, özet, hedefler) gider, mevcut profil GİTMEZ; yanıt → puanlar", async () => {
      const flow = tempFlow("flow-profil-");
      let s = await runEval(opts(flow, "profil-01"));
      expect(s).toMatchObject({ done: 0, failed: 0, pending: 1 });
      const pend = pendingOf(s.pendingPath);
      expect(pend).toHaveLength(1);
      const md = readFileSync(pend[0]!.requestMd, "utf8");
      const alias = RUMUZ.exec(md)?.[1]?.trim();
      expect(alias).toBeTruthy();
      expect(md).not.toContain(realFirstName(resolveFixture("studio", "stu-ela"))!);
      expect(md).toContain("Tanı: Otizm spektrum bozukluğu");
      // Ortak öğrenci bloğu (studentContext.ts): modüller, uzman notu, son kartlar, son özet, hedefler.
      expect(md).toContain("Modüller: Pragmatik dil");
      expect(md).toContain("Uzman notları: Dinozorlara");
      expect(md).toContain("Dinozor kartlarıyla sıra alma");
      expect(md).toContain("Tamamlanan hedefler: 2.1");
      expect(md).toContain("Sürmekte olan hedefler: Üç sözcüklü istek cümlesi, Sıra alma oyunları");
      expect(md).toContain("modelle %60 üretti");
      // Yeniden üretim: fikstürdeki ESKİ profil bloğa alınmaz (exclude: aiProfile) — döngü yok; davranış notu da gitmez.
      for (const gitmeyen of ["Model olma ve genişletme tekniğiyle", "Öncelikli çalışma alanları:", "Dikkat edilmesi gerekenler:", "sakin köşede görsel sıra kartıyla"]) expect(md, gitmeyen).not.toContain(gitmeyen);
      // Eski satır adları kalktı (not ve modül artık blokta).
      expect(md).not.toContain("Seçili müfredat modülleri");
      expect(md).not.toContain("Ek notlar");

      // Tripwire: sistem prompt'undaki her ##/### başlık PROFIL_BOLUMLERI'nden birine uyar (ve hepsi bulunur). Prompt başlığı yeniden adlandırılırsa
      // kontroller ve `yapi` sessizce bayatlamaz, bu test kırılır.
      const sistem = /<system>\n([\s\S]*?)\n<\/system>/.exec(md)?.[1] ?? "";
      const sistemBasliklari = sistem.split("\n").filter((l) => /^#{2,3}\s/.test(l)).map((l) => basligiNormalle(l.replace(/^#+\s+/, "")));
      expect(sistemBasliklari).toHaveLength(9);
      for (const h of sistemBasliklari) expect(PROFIL_BOLUMLERI.some((re) => re.test(h)), `sistem prompt başlığı '${h}' hiçbir PROFIL_BOLUMLERI kalıbına uymuyor`).toBe(true);
      for (const re of PROFIL_BOLUMLERI) expect(sistemBasliklari.some((h) => re.test(h)), `${re} sistem prompt'unda başlık olarak yok`).toBe(true);

      writeFileSync(pend[0]!.responseTxt, profil(alias));
      s = await runEval(opts(flow, "profil-01"));
      expect(s).toMatchObject({ done: 1, failed: 0, pending: 0 });
      const r = rows(s.resultsPath)[0]!;
      expect(r.hard_fail).toEqual([]);
      expect(r.grade).toMatchObject({ format_ok: 1, talimat: 1, ana_baslik: 1, bolum_cumle: 1, ayrac: 1, fazlalik: 1, rumuz_yok: 1, dil_kurali: 1 });
      expect(r.meta).toMatchObject({ alias_found: true });
      const out = JSON.parse(readFileSync(outFile(flow), "utf8")) as { ok: boolean; output: string };
      expect(out.ok).toBe(true);
      expect(out.output).toContain("(Ela Şahin)"); // route rumuzu gerçek adla geri koyar
      expect(out.output).not.toContain(alias!);
    });

    it("boş bağlamlı vaka (profil-02): not ve modül satırı yok (modulSayisi 0 ile tutarlı), süren hedef gider; kısa 'modül yok' bölümü cezalanmaz", async () => {
      const flow = tempFlow("flow-profil-");
      let s = await runEval(opts(flow, "profil-02"));
      const pend = pendingOf(s.pendingPath);
      const md = readFileSync(pend[0]!.requestMd, "utf8");
      const alias = RUMUZ.exec(md)?.[1]?.trim();
      expect(alias).toBeTruthy();
      expect(md).not.toContain(realFirstName(resolveFixture("studio", "stu-kerem"))!);
      expect(md).toContain("Tanı: Artikülasyon bozukluğu");
      expect(md).not.toContain("Modüller:");
      expect(md).not.toContain("Uzman notları:");
      expect(md).toContain("Sürmekte olan hedefler:");

      const kisaMufredat = profil(alias).replace(/(### Müfredat Modülleriyle İlişki\n)[^\n]*/, "$1Seçili modül yok; genel öneriler tanıdan türetildi.");
      writeFileSync(pend[0]!.responseTxt, kisaMufredat);
      s = await runEval(opts(flow, "profil-02"));
      const r = rows(s.resultsPath)[0]!;
      expect(r.grade).toMatchObject({ talimat: 1, bolum_cumle: 1 });
    });
  });

  describe("kontroller fabrika üzerinden (talimatı fabrika hesaplar)", () => {
    const body = { modulSayisi: 1 };
    it("iyi profil: talimat 1, sert hata yok (route rumuzu gerçek adla geri koymuştur)", () => {
      const r = adapter.checks({ body, output: profil("Ela Şahin"), rawText: profil("Hazal"), alias: "Hazal" });
      expect(r.hard_fail).toEqual([]);
      expect(r.scores).toMatchObject({ talimat: 1, ana_baslik: 1, bolum_cumle: 1, ayrac: 1, fazlalik: 1, dil_kurali: 1, rumuz_yok: 1, yasak_kalip: 1 });
      expect(r.details.yapi).toBe(1);
    });
    it("ayraç yok → talimat 4/5 (yapı, ana başlık, bölüm cümleleri, ayraç, fazlalık; tanı cümlesi Studio'da talimata girmez)", () => {
      const out = profil().replace("---\n", "");
      expect(adapter.checks({ body, output: out, rawText: out, alias: null }).scores.talimat).toBeCloseTo(4 / 5);
    });
    it("tanı cümlesi ayrıntıda kalır, talimatı düşürmez (profil verilen tanıyı açıklar)", () => {
      const out = profil("Ela Şahin").replace("Cümle 1 burada.", "Ela'nın tanısı konmuştur.");
      const r = adapter.checks({ body, output: out, rawText: out, alias: null });
      expect(r.details.tani_cumlesi).toBe(1);
      expect(r.scores.talimat).toBe(1);
    });
    it("çıktıda rumuz kalmışsa (gerçek ad geri konmamış) sert hata; çıktı yoksa cikti_yok ve talimat 0", () => {
      const r = adapter.checks({ body, output: profil("Hazal"), rawText: profil("Hazal"), alias: "Hazal" });
      expect(r.hard_fail).toContain("rumuz_sizintisi");
      const yok = adapter.checks({ body, output: null, rawText: "", alias: "Hazal" });
      expect(yok.hard_fail).toContain("cikti_yok");
      expect(yok.scores.talimat).toBe(0);
    });
    it("çıktıda 'hasta' sözcüğü sert dil hatasıdır (Studio kuralı)", () => {
      const out = profil().replace("Cümle 1 burada.", "Hasta bu görevde zorlanır.");
      expect(adapter.checks({ body, output: out, rawText: out, alias: null }).hard_fail).toContain("dil_kurali");
    });
  });

  describe("jenerik aday (genericMarkdown)", () => {
    it("≥ 4 yasak kalıp, hakeme referanstan farklı; başlıklar ve ayraç yerinde, satır sayısı aynı", () => {
      const ref = profil();
      const g = adapter.genericCandidate(ref) as string;
      expect(yasakKalip(g).found.length).toBeGreaterThanOrEqual(4);
      expect(adapter.renderForJudge(g)).not.toBe(adapter.renderForJudge(ref));
      expect(g.split("\n")).toHaveLength(ref.split("\n").length);
      const basliklar = (t: string) => t.split("\n").filter((l) => /^#{2,3}\s/.test(l));
      expect(basliklar(g)).toEqual(basliklar(ref));
      expect(g.split("\n").filter((l) => l.trim() === "---")).toHaveLength(1);
      const r = adapter.checks({ body: { modulSayisi: 1 }, output: g, rawText: g, alias: null });
      expect(r.scores.ayrac).toBe(1);
      expect(r.scores.ana_baslik).toBe(1);
      expect(r.details.yapi).toBe(1);
    });
    it("çıktı olmayan girdide çökmez", () => {
      expect(() => adapter.genericCandidate(null)).not.toThrow();
      expect(adapter.genericCandidate(undefined)).toBe("");
    });
  });

  it("PROFIL_BOLUMLERI fabrikaya bölüm listesi olarak gider (9 başlık)", () => {
    expect(PROFIL_BOLUMLERI).toHaveLength(9);
    const t = profil();
    const heads = t.split("\n").filter((l) => /^#{2,3}\s/.test(l)).map((l) => l.replace(/^#+\s+/, "").toLocaleLowerCase("tr-TR"));
    for (const re of PROFIL_BOLUMLERI) expect(heads.some((h) => re.test(h)), String(re)).toBe(true);
  });
});
