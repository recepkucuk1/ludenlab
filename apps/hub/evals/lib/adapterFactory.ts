// apps/hub/evals/lib/adapterFactory.ts
import {
  ORTAK_OLCUTLER,
  HarnessError,
  parseSse,
  type AtolyeFixture,
  type CaseDef,
  type CheckResult,
  type CriterionDef,
  type Fixture,
  type StudioFixture,
  type ToolAdapter,
} from "./core";
import { als } from "./evalContext";
import { resolveFixture } from "./fixtures";
import { TANI, TASLAK_NORM, durumsuz, genericMarkdown, notNormalize, sections } from "./markdown";
import { RUMUZ_NOTU, renderAtolyeCase, renderStudioStudent } from "./renderStudent";
import { dilKurali, frac, lower, mean, metinler, parseJsonLoose, rumuzYok, yasakKalip } from "./sharedChecks";

/* Araç adaptörlerinin ortak gövdesi. Araç yalnız cfg verir; route çağrısı, SSE çözme, hakem görevi,
   ortak kontroller (JSON/Markdown geçerliliği, dil kuralı, rumuz, yasak kalıp), ölçüt birleştirme ve
   jenerik aday burada. 1A'daki social-story ve bep adaptörleri bu fabrikaya geçirilmiştir.

   Talimat kuralı (tek yer: `jsonTalimat` ve `markdownKontrol`):
   - JSON modu: çıktı geçerli JSON değilse 0; değilse aracın `talimat`ı, yoksa aracın diğer puanlarının
     ortalaması (puan yoksa 1).
   - Markdown modları (Studio `output: "markdown"`, Atölye): talimatı fabrika hesaplar — istenen bölüm oranı
     (`yapi`; bölüm listesi boşsa yok), Atölye'de taslak notunun sonda olması, tanı cümlesi yokluğu ve aracın
     `talimat` DIŞINDAKİ puanları. Aracın döndürdüğü `talimat` burada yok sayılır (çift sayılmaz). */

/** Route modülü. `POST` metot imzasıyla (iki yönlü parametre uyumu): Studio rotaları `NextRequest` bekler,
    düzenek düz `Request` gönderir (Next'in ek alanlarını rotalar okumaz). */
type Route = () => Promise<{ POST(req: Request): Promise<Response> }>;
type Rec = Record<string, unknown>;

/** Araca özgü kontrol sonucu. `scores` sonuç satırının `grade`ine yazılır ve talimata girer:
    araç `talimat`ı yalnız JSON modunda döndürebilir; markdown modlarında talimatı fabrika yapı + aracın
    diğer puanlarından hesaplar (aracın `talimat`ı yok sayılır). Ayrılmış anahtarlar (`AYRILMIS`) config hatasıdır. */
export interface ToolCheckOut {
  scores: Record<string, number>;
  details: CheckResult["details"];
  hard: string[];
}

/** Koşturucunun ve fabrikanın yazdığı puan anahtarları: araç bunları döndüremez (`talimat` serbest). */
const AYRILMIS = ["win", "format_ok", "dil_kurali", "rumuz_yok", "yasak_kalip"] as const;

export interface StudioToolCfg<Body> {
  id: string;
  label: string;
  dir: string;
  /** Standart araç rotası (`{ POST }`); `send` verilirse kullanılmaz. İkisinden biri zorunlu (kurulumda denetlenir). */
  route?: Route;
  /** Rota imzası standart değilse (ör. `students/[id]/ai-profile`): isteği kendisi gönderir. */
  send?(body: Body, fixtureId: string | null): Promise<Response>;
  responseKey: string;
  studentRequired: boolean;
  /** Çıktı biçimi: `json` (varsayılan; route `extractJson` ile çözer) ya da `markdown` (AI profili). */
  output?: "json" | "markdown";
  /** Markdown çıktıda istenen bölüm başlıkları (küçük harf regex); `yapi` = bulunan oran (liste boşsa `yapi` yok). */
  sections?: RegExp[];
  /** Hakem görevi: istek satırları (etiketli, Türkçe). */
  requestLines(body: Body): string[];
  /** Çıktıyı hakeme okunur metne çevirir: JSON modunda çıktı nesnesi, markdown modunda çıktı metni gelir.
      Verilmezse JSON girintili basılır, metin olduğu gibi gider. */
  renderOutput?(output: Rec | string): string;
  /** Araca özgü kontroller. `text` = JSON çözüldüyse metin yaprakları satır sonuyla, markdown'da çıktı metni.
      `talimat` yalnız JSON modunda dikkate alınır; markdown modunda talimatı fabrika hesaplar (bkz. `ToolCheckOut`). */
  checks?(args: { body: Body; output: unknown; raw: Rec | null; text: string; alias: string | null }): ToolCheckOut;
  criteria: CriterionDef[];
  /** Jenerik aday; JSON araçta zorunlu (kurulumda denetlenir), markdown araçta verilmezse `genericMarkdown`.
      Çıktının derin kopyasını alır (JSON araçta nesne, markdown araçta metin). */
  generic?(output: unknown): unknown;
  /** Route gövdesini isteğe göre dönüştürme gerekirse (varsayılan: `{ ...body, studentId }`). */
  mapBody?(body: Body, fixtureId: string | null): Rec;
  /** Tohum anahtarı (`CaseStore.seedKey`): verilirse vaka kimliği yerine bu anahtardan tohumlanır. `invoke` onu route
      çağrılmadan ÖNCE store'a yazar; üreteç o ana dek kurulmuşsa (ilk çekiliş yapılmış) `harness_error` — sessizce yok
      sayılmaz. Artikülasyon: eski düzenekle aynı banka kelimeleri için seçim argümanları. */
  seedKey?(body: Body): string;
}

async function postJson(route: Route, id: string, payload: object): Promise<Response> {
  const { POST } = await route();
  const req = new Request(`http://eval.local/${id}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return POST(req);
}

function parseResponse(res: Response) {
  return res.text().then((t) => parseSse(t, res.status));
}

/** Ortak kontrollerin birleştirmeye giden kısmı. */
interface Ortak {
  dk: { hasta: number; terapist: number; odul: number; score: number };
  yk: { found: string[]; score: number };
  rz: number;
  hard: string[];
  /** Moda özgü ortak ayrıntılar (yapi, taslak_sonda, tani_cumlesi…). */
  details: CheckResult["details"];
}

/** Ortak ve araca özgü sonuçları tek `CheckResult`ta birleştirir (üç dalın tek birleştirme yeri). */
function birlestir(id: string, sh: Ortak, tool: ToolCheckOut, talimat: number): CheckResult {
  const cakisan = AYRILMIS.filter((k) => k in tool.scores);
  if (cakisan.length) throw new HarnessError(`${id}: araç puanında ayrılmış anahtar: ${cakisan.join(", ")}`, "config");
  return {
    scores: { ...tool.scores, talimat, dil_kurali: sh.dk.score, rumuz_yok: sh.rz, yasak_kalip: sh.yk.score },
    details: {
      ...tool.details,
      ...sh.details,
      hasta: sh.dk.hasta,
      terapist: sh.dk.terapist,
      odul: sh.dk.odul,
      yasak_kalip: sh.yk.found.join("|"),
    },
    hard_fail: [...sh.hard, ...tool.hard],
  };
}

const BOS: ToolCheckOut = { scores: {}, details: {}, hard: [] };

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

/** JSON modu talimatı: geçersizse 0; aracın `talimat`ı, yoksa diğer puanlarının ortalaması, puan yoksa 1. */
function jsonTalimat(gecerli: boolean, scores: Record<string, number>): number {
  if (!gecerli) return 0;
  const { talimat, ...parca } = scores;
  const p = Object.values(parca);
  return talimat ?? (p.length ? mean(p) : 1);
}

interface MarkdownOpts {
  /** Atölye'de evet: not yoksa `taslak_notu_yok` sert hatası ve notun sonda olması (`taslak_sonda`) talimata girer.
      Studio profilinde hayır. */
  taslakZorunlu: boolean;
  /** Atölye'de "(dil ve) konuşma terapisti" meşru unvandır. */
  konusmaTerapistiMuaf: boolean;
}

/** Markdown çıktılı araçların ortak kontrolleri. `yapi`: istenen bölümlerin bulunan oranı; liste boşsa `null`. */
export function markdownShared(text: string, rawText: string, alias: string | null, sectionsWanted: RegExp[], opts: MarkdownOpts) {
  const hard: string[] = [];
  if (!text.trim()) hard.push("cikti_yok");
  const heads = sections(text).map((s) => s.heading);
  const yapi = sectionsWanted.length ? frac(sectionsWanted.map(durumsuz), (re) => heads.some((h) => re.test(h))) : null;
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

/** Markdown dalı (Studio markdown + Atölye): ortak kontroller, markdown talimat kuralı, birleştirme. */
function markdownKontrol(
  id: string,
  args: { text: string; rawText: string; alias: string | null },
  sectionsWanted: RegExp[],
  opts: MarkdownOpts,
  tool: ToolCheckOut,
): CheckResult {
  const { text, rawText, alias } = args;
  const sh = markdownShared(text, rawText, alias, sectionsWanted, opts);
  const { talimat: _yokSayilir, ...parca } = tool.scores;
  const talimat = text.trim()
    ? mean([
        ...(sh.yapi === null ? [] : [sh.yapi]),
        ...(opts.taslakZorunlu ? [sh.taslakSonda] : []),
        sh.taniCumlesi ? 0 : 1,
        ...Object.values(parca),
      ])
    : 0;
  const details: CheckResult["details"] = {
    yapi: sh.yapi ?? "—",
    ...(opts.taslakZorunlu ? { taslak_sonda: sh.taslakSonda } : {}),
    tani_cumlesi: sh.taniCumlesi,
  };
  return birlestir(id, { ...sh, details }, tool, talimat);
}

const HATA_METNI = "(Çıktı üretilemedi — uzman bir hata mesajı gördü.)";
const kes = (t: string) => (t.length > 60_000 ? t.slice(0, 60_000) + "\n…(kesildi)" : t);

/** İsteği gönderen işlev; kurulum anında seçilir (`send` > `route`), ikisi de yoksa config hatası. */
function studioGonderici<Body extends object>(cfg: StudioToolCfg<Body>): (body: Body, fixtureId: string | null) => Promise<Response> {
  const send = cfg.send?.bind(cfg);
  if (send) return send;
  const route = cfg.route;
  if (!route) throw new HarnessError(`${cfg.id}: route ya da send verilmeli`, "config");
  return (body, fixtureId) =>
    postJson(route, cfg.id, cfg.mapBody ? cfg.mapBody(body, fixtureId) : { ...body, ...(fixtureId ? { studentId: fixtureId } : {}) });
}

export function studioAdapter<Body extends object>(cfg: StudioToolCfg<Body>): ToolAdapter<Body> {
  const md = cfg.output === "markdown";
  const gonder = studioGonderici(cfg);
  if (!md && !cfg.generic) throw new HarnessError(`${cfg.id}: JSON araçta generic zorunlu`, "config");
  return {
    id: cfg.id,
    label: cfg.label,
    module: "studio",
    dir: cfg.dir,
    async invoke(body, fixtureId) {
      if (cfg.studentRequired && !fixtureId) throw new HarnessError(`${cfg.id} vakası öğrencisiz olamaz`, "harness_error");
      const st = als.getStore();
      if (st && cfg.seedKey) {
        if (st.rng) throw new HarnessError(`${cfg.id}: seedKey ilk çekilişten sonra verilemez`, "harness_error");
        st.seedKey = cfg.seedKey(body);
      }
      return parseResponse(await gonder(body, fixtureId));
    },
    extractOutput: (b) => b[cfg.responseKey],
    renderTask(c: CaseDef<Body>, fixture: Fixture | null) {
      const f = fixture as StudioFixture | null;
      return [
        "İSTEK",
        `- Araç: ${cfg.label}`,
        ...cfg.requestLines(c.body),
        f ? renderStudioStudent(f) : "- Öğrenci seçilmedi (genel materyal).",
        f ? RUMUZ_NOTU : "",
        `- Neyi sınıyor: ${c.purpose}`,
      ]
        .filter(Boolean)
        .join("\n");
    },
    renderForJudge(output) {
      if (md) {
        const t = typeof output === "string" ? output : "";
        return t.trim() ? kes(cfg.renderOutput ? cfg.renderOutput(t) : t) : HATA_METNI;
      }
      const o = (output ?? null) as Rec | null;
      return o ? kes(cfg.renderOutput ? cfg.renderOutput(o) : JSON.stringify(o, null, 2)) : HATA_METNI;
    },
    checks({ body, output, rawText, alias }) {
      if (md) {
        const text = typeof output === "string" ? output : "";
        const tool = cfg.checks?.({ body, output, raw: null, text, alias }) ?? BOS;
        const opts = { taslakZorunlu: false, konusmaTerapistiMuaf: false };
        return markdownKontrol(cfg.id, { text, rawText, alias }, cfg.sections ?? [], opts, tool);
      }
      const o = (output ?? null) as Rec | null;
      const sh = sharedJson(o, rawText, alias);
      const tool = cfg.checks?.({ body, output: o, raw: sh.raw, text: sh.text, alias }) ?? BOS;
      return birlestir(cfg.id, { ...sh, details: {} }, tool, jsonTalimat(Boolean(sh.raw && o), tool.scores));
    },
    criteria: [...ORTAK_OLCUTLER, ...cfg.criteria],
    genericCandidate(output) {
      if (cfg.generic) return cfg.generic(structuredClone(output ?? (md ? "" : {})));
      return genericMarkdown(typeof output === "string" ? output : ""); // yalnız markdown modunda (kurulum denetimi)
    },
  };
}

export interface AtolyeToolCfg<Body> {
  id: string;
  label: string;
  dir: string;
  route: Route;
  /** Route gövdesi: fikstür kimliği + vaka gövdesi (çoğu araç: `{ ...profilBody(f), ...body }`).
      `rumuz` ve `kademe` her durumda fikstürden yazılır (vaka gövdesi ezemez). */
  body(body: Body, f: AtolyeFixture): Rec;
  requestLines(body: Body): string[];
  /** İstenen bölüm başlıkları (küçük harf regex). `yapi` = bulunan oran (liste boşsa `yapi` yok). */
  sections: RegExp[];
  /** Araca özgü kontroller. Talimatı fabrika hesaplar (yapı + taslak notu + tanı cümlesi + bu puanlar);
      buradaki `talimat` yok sayılır (bkz. `ToolCheckOut`). */
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
  const route = cfg.route as Route | undefined;
  if (!route) throw new HarnessError(`${cfg.id}: route verilmeli`, "config");
  return {
    id: cfg.id,
    label: cfg.label,
    module: "atolye",
    dir: cfg.dir,
    async invoke(body, fixtureId) {
      const f = resolveFixture("atolye", fixtureId) as AtolyeFixture | null;
      if (!f) throw new HarnessError(`${cfg.id} vakası fikstürsüz olamaz (rumuz zorunlu)`, "harness_error");
      return parseResponse(await postJson(route, cfg.id, { ...cfg.body(body, f), rumuz: f.code, kademe: f.kademe }));
    },
    extractOutput: (b) => b.text,
    renderTask(c: CaseDef<Body>, fixture: Fixture | null) {
      if (!fixture) throw new HarnessError(`${cfg.id}: hakem görevi için fikstür gerekli`, "harness_error");
      return [
        "İSTEK",
        `- Araç: ${cfg.label}`,
        renderAtolyeCase(fixture as AtolyeFixture),
        cfg.notSent ?? ATOLYE_GITMEYEN,
        ...cfg.requestLines(c.body),
        `- Neyi sınıyor: ${c.purpose}`,
      ]
        .filter(Boolean)
        .join("\n");
    },
    renderForJudge(output) {
      const t = typeof output === "string" ? output : "";
      return t.trim() ? kes(t) : HATA_METNI;
    },
    checks({ body, output, rawText, alias }) {
      const text = typeof output === "string" ? output : "";
      const tool = cfg.checks?.({ body, text }) ?? BOS;
      const opts = { taslakZorunlu: true, konusmaTerapistiMuaf: true };
      return markdownKontrol(cfg.id, { text, rawText, alias }, cfg.sections, opts, tool);
    },
    criteria: [...ORTAK_OLCUTLER, ...cfg.criteria],
    genericCandidate(output) {
      const t = typeof output === "string" ? output : "";
      return (cfg.generic ?? genericMarkdown)(t);
    },
  };
}
