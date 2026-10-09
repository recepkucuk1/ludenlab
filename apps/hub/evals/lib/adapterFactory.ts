// apps/hub/evals/lib/adapterFactory.ts
import { ORTAK_OLCUTLER, HarnessError, parseSse, type AtolyeFixture, type CaseDef, type CheckResult, type CriterionDef, type Fixture, type StudioFixture, type ToolAdapter } from "./core";
import { resolveFixture } from "./fixtures";
import { OLCUT, TANI, TASLAK_NORM, genericMarkdown, notNormalize, sections } from "./markdown";
import { RUMUZ_NOTU, renderAtolyeCase, renderStudioStudent } from "./renderStudent";
import { dilKurali, frac, lower, mean, metinler, parseJsonLoose, rumuzYok, yasakKalip } from "./sharedChecks";

/* Araç adaptörlerinin ortak gövdesi. Araç yalnız cfg verir; route çağrısı, SSE çözme, hakem görevi,
   ortak kontroller (JSON/Markdown geçerliliği, dil kuralı, rumuz, yasak kalıp), ölçüt birleştirme ve
   jenerik aday burada. 1A'daki social-story ve bep adaptörleri bu fabrikaya geçirilmiştir. */

/** Route modülü. `POST` metot imzasıyla (iki yönlü parametre uyumu): Studio rotaları `NextRequest` bekler,
    düzenek düz `Request` gönderir (Next'in ek alanlarını rotalar okumaz). */
type Route = () => Promise<{ POST(req: Request): Promise<Response> }>;
type Rec = Record<string, unknown>;

export interface ToolCheckOut {
  scores: Record<string, number>;
  details: CheckResult["details"];
  hard: string[];
}

export interface StudioToolCfg<Body> {
  id: string;
  label: string;
  dir: string;
  /** Standart araç rotası (`{ POST }`); `send` verilirse kullanılmaz. */
  route?: Route;
  /** Rota imzası standart değilse (ör. `students/[id]/ai-profile`): isteği kendisi gönderir. */
  send?(body: Body, fixtureId: string | null): Promise<Response>;
  responseKey: string;
  studentRequired: boolean;
  /** Çıktı biçimi: `json` (varsayılan; route `extractJson` ile çözer) ya da `markdown` (AI profili). */
  output?: "json" | "markdown";
  /** Markdown çıktıda istenen bölüm başlıkları (küçük harf regex); `yapi` = bulunan oran. */
  sections?: RegExp[];
  /** Hakem görevi: istek satırları (etiketli, Türkçe). */
  requestLines(body: Body): string[];
  /** JSON çıktıyı hakeme okunur metne çevirir; markdown çıktıda verilmezse metin olduğu gibi gider. */
  renderOutput?(output: Rec): string;
  /** Araca özgü kontroller. `text` = JSON çözüldüyse metin yaprakları satır sonuyla, markdown'da çıktı metni. */
  checks?(args: { body: Body; output: unknown; raw: Rec | null; text: string; alias: string | null }): ToolCheckOut;
  criteria: CriterionDef[];
  /** Jenerik aday; markdown çıktıda verilmezse `genericMarkdown`. Çıktının derin kopyasını alır
      (JSON araçta nesne, markdown araçta metin). */
  generic?(output: unknown): unknown;
  /** Route gövdesini isteğe göre dönüştürme gerekirse (varsayılan: `{ ...body, studentId }`). */
  mapBody?(body: Body, fixtureId: string | null): Rec;
}

function parseResponse(res: Response) {
  return res.text().then((t) => parseSse(t, res.status));
}

/** JSON çıktılı araçların ortak kontrolleri (geçerlilik, dil kuralı, rumuz, yasak kalıp). */
function sharedJson(output: unknown, rawText: string, alias: string | null) {
  const raw = parseJsonLoose(rawText);
  // JSON dışındaki düzyazı uzmana ulaşmaz: dil/kalıp kontrolü çözülen JSON'un string'lerine bakar; çözülemezse ham metne.
  // JSON.stringify DEĞİL: "\n" kaçışı satır başındaki sözcüğün önüne bir harf yapıştırır ("\nTerapist" → "nterapist").
  const text = raw ? metinler(raw).join("\n") : rawText;
  const dk = dilKurali(text);
  const yk = yasakKalip(text);
  const rz = rumuzYok(output, alias);
  const hard: string[] = [];
  if (!raw) hard.push("json_gecersiz");
  if (output === null || output === undefined || output === "") hard.push("cikti_yok");
  if (dk.score === 0) hard.push("dil_kurali");
  if (rz === 0) hard.push("rumuz_sizintisi");
  return { raw, text, dk, yk, rz, hard };
}

/** Markdown çıktılı araçların ortak kontrolleri. `taslakZorunlu`: Atölye'de evet (sondaki not), Studio profilinde hayır.
    `konusmaTerapistiMuaf`: Atölye'de "(dil ve) konuşma terapisti" meşru unvandır. */
export function markdownShared(
  text: string,
  rawText: string,
  alias: string | null,
  sectionsWanted: RegExp[],
  opts: { taslakZorunlu: boolean; konusmaTerapistiMuaf: boolean },
) {
  const hard: string[] = [];
  if (!text.trim()) hard.push("cikti_yok");
  const heads = sections(text).map((s) => s.heading);
  const yapi = sectionsWanted.length ? frac(sectionsWanted, (re) => heads.some((h) => re.test(h))) : 1;
  const norm = notNormalize(text);
  const notVar = norm.includes(TASLAK_NORM) ? 1 : 0;
  const sonSatir = text.trim().split("\n").filter((l) => l.trim()).at(-1) ?? "";
  // Son satır notu taşıyor ya da metin notla bitiyor (birden çok satıra bölünmüş not).
  const taslakSonda = notNormalize(sonSatir).includes(TASLAK_NORM) || norm.endsWith(TASLAK_NORM) ? 1 : 0;
  if (opts.taslakZorunlu && text.trim() && !notVar) hard.push("taslak_notu_yok");
  const taniCumlesi = TANI.test(lower(text)) ? 1 : 0;
  const dk = dilKurali(rawText, { konusmaTerapistiMuaf: opts.konusmaTerapistiMuaf });
  const yk = yasakKalip(rawText);
  const rz = rumuzYok(text, alias);
  if (dk.score === 0) hard.push("dil_kurali");
  if (rz === 0) hard.push("rumuz_sizintisi");
  return { yapi, taslakSonda, taniCumlesi, dk, yk, rz, hard };
}

const HATA_METNI = "(Çıktı üretilemedi — uzman bir hata mesajı gördü.)";
const kes = (t: string) => (t.length > 60_000 ? t.slice(0, 60_000) + "\n…(kesildi)" : t);

export function studioAdapter<Body>(cfg: StudioToolCfg<Body>): ToolAdapter<Body> {
  const md = cfg.output === "markdown";
  return {
    id: cfg.id,
    label: cfg.label,
    module: "studio",
    dir: cfg.dir,
    async invoke(body, fixtureId) {
      if (cfg.studentRequired && !fixtureId) throw new HarnessError(`${cfg.id} vakası öğrencisiz olamaz`, "harness_error");
      if (cfg.send) return parseResponse(await cfg.send(body, fixtureId));
      if (!cfg.route) throw new HarnessError(`${cfg.id}: route ya da send verilmeli`, "config");
      const { POST } = await cfg.route();
      const payload = cfg.mapBody ? cfg.mapBody(body, fixtureId) : { ...(body as Rec), ...(fixtureId ? { studentId: fixtureId } : {}) };
      const req = new Request(`http://eval.local/${cfg.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      return parseResponse(await POST(req));
    },
    extractOutput: (b) => b[cfg.responseKey],
    renderTask(c: CaseDef<Body>, fixture: Fixture | null) {
      const f = fixture as StudioFixture | null;
      return ["İSTEK", `- Araç: ${cfg.label}`, ...cfg.requestLines(c.body), f ? renderStudioStudent(f) : "- Öğrenci seçilmedi (genel materyal).", f ? RUMUZ_NOTU : "", `- Neyi sınıyor: ${c.purpose}`].filter(Boolean).join("\n");
    },
    renderForJudge(output) {
      if (md) {
        const t = typeof output === "string" ? output : "";
        return t.trim() ? kes(cfg.renderOutput ? cfg.renderOutput({ text: t }) : t) : HATA_METNI;
      }
      const o = (output ?? null) as Rec | null;
      return o ? kes(cfg.renderOutput ? cfg.renderOutput(o) : JSON.stringify(o, null, 2)) : HATA_METNI;
    },
    checks({ body, output, rawText, alias }) {
      if (md) {
        const text = typeof output === "string" ? output : "";
        const sh = markdownShared(text, rawText, alias, cfg.sections ?? [], { taslakZorunlu: false, konusmaTerapistiMuaf: false });
        const tool = cfg.checks?.({ body, output, raw: null, text, alias }) ?? { scores: {}, details: {}, hard: [] };
        const talimat = text.trim() ? mean([sh.yapi, sh.taniCumlesi ? 0 : 1, ...Object.values(tool.scores)]) : 0;
        return {
          scores: { ...tool.scores, talimat, dil_kurali: sh.dk.score, rumuz_yok: sh.rz, yasak_kalip: sh.yk.score },
          details: { ...tool.details, yapi: sh.yapi, tani_cumlesi: sh.taniCumlesi, hasta: sh.dk.hasta, terapist: sh.dk.terapist, odul: sh.dk.odul, yasak_kalip: sh.yk.found.join("|") },
          hard_fail: [...sh.hard, ...tool.hard],
        };
      }
      const o = (output ?? null) as Rec | null;
      const sh = sharedJson(o, rawText, alias);
      const tool = cfg.checks?.({ body, output: o, raw: sh.raw, text: sh.text, alias }) ?? { scores: {}, details: {}, hard: [] };
      const talimat = tool.scores.talimat ?? (sh.raw && o ? 1 : 0);
      return {
        scores: { ...tool.scores, talimat, dil_kurali: sh.dk.score, rumuz_yok: sh.rz, yasak_kalip: sh.yk.score },
        details: { ...tool.details, hasta: sh.dk.hasta, terapist: sh.dk.terapist, odul: sh.dk.odul, yasak_kalip: sh.yk.found.join("|") },
        hard_fail: [...sh.hard, ...tool.hard],
      };
    },
    criteria: [...ORTAK_OLCUTLER, ...cfg.criteria],
    genericCandidate(output) {
      if (cfg.generic) return cfg.generic(structuredClone(output ?? (md ? "" : {})));
      if (md) return genericMarkdown(typeof output === "string" ? output : "");
      throw new HarnessError(`${cfg.id}: JSON araçta generic zorunlu`, "config");
    },
  };
}

export interface AtolyeToolCfg<Body> {
  id: string;
  label: string;
  dir: string;
  route: Route;
  /** Route gövdesi: fikstür kimliği + vaka gövdesi (çoğu araç: `{ ...profilBody(f), ...body }`). */
  body(body: Body, f: AtolyeFixture): Rec;
  requestLines(body: Body): string[];
  /** İstenen bölüm başlıkları (küçük harf regex). `yapi` = bulunan oran. */
  sections: RegExp[];
  checks?(args: { body: Body; text: string }): ToolCheckOut;
  criteria: CriterionDef[];
  generic?(text: string): string;
  /** Araca iletilmeyen fikstür alanları için hakem notu (seans-plani gibi profil omurgasız araçlar). */
  notSent?: string;
}

/** `ogrenciProfiliSchema` alanlarını fikstürden kurar; null alanlar gönderilmez (zod `.optional()`). */
export function profilBody(f: AtolyeFixture): Rec {
  return {
    rumuz: f.code,
    kademe: f.kademe,
    ...(f.yas ? { yas: f.yas } : {}),
    taniProfili: f.taniProfili,
    ...(f.guclukDuzeyi ? { guclukDuzeyi: f.guclukDuzeyi } : {}),
    ...(f.gucluYonler ? { gucluYonler: f.gucluYonler } : {}),
    ...(f.ilgiAlanlari ? { ilgiAlanlari: f.ilgiAlanlari } : {}),
  };
}

/** Hiçbir Atölye aracı fikstürün MEB bölümlerini ve önceki belgelerini almaz; hakem bunlarla özgüllük ölçmesin. */
export const ATOLYE_GITMEYEN =
  "- (Hakem notu: çalışılan MEB bölümleri ve önceki belgeler araca İLETİLMEDİ; özgüllüğü yalnız araca giden alanlara göre değerlendir.)";

export function atolyeAdapter<Body>(cfg: AtolyeToolCfg<Body>): ToolAdapter<Body> {
  return {
    id: cfg.id,
    label: cfg.label,
    module: "atolye",
    dir: cfg.dir,
    async invoke(body, fixtureId) {
      const f = resolveFixture("atolye", fixtureId) as AtolyeFixture | null;
      if (!f) throw new HarnessError(`${cfg.id} vakası fikstürsüz olamaz (rumuz zorunlu)`, "harness_error");
      const { POST } = await cfg.route();
      const req = new Request(`http://eval.local/${cfg.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cfg.body(body, f)) });
      return parseResponse(await POST(req));
    },
    extractOutput: (b) => b.text,
    renderTask(c: CaseDef<Body>, fixture: Fixture | null) {
      const f = fixture as AtolyeFixture;
      return ["İSTEK", `- Araç: ${cfg.label}`, renderAtolyeCase(f), cfg.notSent ?? ATOLYE_GITMEYEN, ...cfg.requestLines(c.body), `- Neyi sınıyor: ${c.purpose}`].filter(Boolean).join("\n");
    },
    renderForJudge(output) {
      const t = typeof output === "string" ? output : "";
      return t.trim() ? kes(t) : HATA_METNI;
    },
    checks({ body, output, rawText, alias }) {
      const text = typeof output === "string" ? output : "";
      const sh = markdownShared(text, rawText, alias, cfg.sections, { taslakZorunlu: true, konusmaTerapistiMuaf: true });
      const tool = cfg.checks?.({ body, text }) ?? { scores: {}, details: {}, hard: [] };
      const talimat = text.trim() ? mean([sh.yapi, sh.taslakSonda, sh.taniCumlesi ? 0 : 1, ...Object.values(tool.scores)]) : 0;
      return {
        scores: { ...tool.scores, talimat, dil_kurali: sh.dk.score, rumuz_yok: sh.rz, yasak_kalip: sh.yk.score },
        details: { ...tool.details, yapi: sh.yapi, taslak_sonda: sh.taslakSonda, tani_cumlesi: sh.taniCumlesi, hasta: sh.dk.hasta, terapist: sh.dk.terapist, odul: sh.dk.odul, yasak_kalip: sh.yk.found.join("|") },
        hard_fail: [...sh.hard, ...tool.hard],
      };
    },
    criteria: [...ORTAK_OLCUTLER, ...cfg.criteria],
    genericCandidate(output) {
      const t = typeof output === "string" ? output : "";
      return (cfg.generic ?? genericMarkdown)(t);
    },
  };
}

export { OLCUT, lower };
