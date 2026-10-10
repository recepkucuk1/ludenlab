// apps/hub/evals/lib/vakaListesi.ts
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT, type AtolyeFixture, type CaseDef, type Fixture, type StudioFixture } from "./core";
import { resolveFixture } from "./fixtures";
import { TOOL_IDS, loadAdapter } from "../tools/registry";

/* Vaka listesi dokümanı (kullanıcı onayı): araç × vaka × amaç tablosu. KAYNAK `cases.json` dosyalarıdır; doküman üretilir, elle yazılmaz.
   Çıktı deterministiktir (kayıt defteri sırası, rastgelelik yok); değişen tek şey `meta` (zaman damgası, git kısa kimliği).
   Yazan: evals/vakaListesi.eval.ts (gerçek dosya) ve evals/lib/vakaListesi.selftest.eval.ts (geçici yol). */

/** Studio öğrencisinin yaşı bu tarihe göre hesaplanır (vakalar hafta başı 2026-10-12'yi kullanır); doküman her üretimde aynı çıksın. */
export const YAS_REFERANSI = "2026-10-12";

export interface VakaMeta {
  /** ISO zaman damgası. */
  uretildi: string;
  /** git kısa kimliği (`bilinmiyor` olabilir). */
  sha: string;
}

export interface AracVakalari {
  id: string;
  label: string;
  module: "studio" | "atolye";
  cases: Array<CaseDef & { fixture: Fixture | null }>;
}

/* ── Biçimleme ── */

/** Markdown tablo hücresinde bozulma yapan karakterleri etkisizleştirir (tek satır, boru işareti, vurgu, ham HTML).
    Sözcük içi `_` (ilkokul_1_4, dehb_dikkat) vurgu başlatmaz, kaçışlanmaz — ham metin okunur kalsın. */
export function esc(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/[`*]|(?<![\p{L}\p{N}])_|_(?![\p{L}\p{N}])/gu, (m) => `\\${m}`)
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n/g, " ↵ ");
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v === "" ? '""' : esc(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    if (!v.length) return "[]";
    const nesneli = v.some((x) => x !== null && typeof x === "object");
    return v.map(formatValue).join(nesneli ? "; " : ", ");
  }
  if (typeof v === "object") {
    const parts = Object.entries(v as Record<string, unknown>)
      .filter(([, x]) => x !== undefined)
      .map(([k, x]) => `${esc(k)}: ${formatValue(x)}`);
    return `(${parts.join(", ")})`;
  }
  return esc(String(v));
}

/** Gövdeyi `anahtar: değer · anahtar: değer` olarak okunur biçimde yazar (ham JSON değil). */
export function formatBody(body: Record<string, unknown>): string {
  const parts = Object.entries(body)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${esc(k)}: ${formatValue(v)}`);
  return parts.length ? parts.join(" · ") : "—";
}

/** `YYYY-MM-DD` doğum tarihinden, referans tarihe göre tam yaş. */
export function ageOn(birthDate: string, ref: string = YAS_REFERANSI): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ry, rm, rd] = ref.split("-").map(Number);
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) age -= 1;
  return age;
}

export function formatStudent(f: Fixture | null, studentId: string | null): string {
  if (!f) return studentId ? `${esc(studentId)} (çözülemedi)` : "—";
  if ("name" in f) {
    const s = f as StudioFixture;
    const tani = s.diagnosis ? `<br>${esc(s.diagnosis)}` : "";
    return `${esc(s.name)} (${esc(s.id)})<br>${ageOn(s.birthDate)} yaş · ${esc(s.workArea)}${tani}`;
  }
  const a = f as AtolyeFixture;
  const yas = a.yas === null ? "yaş yok" : `${a.yas} yaş`;
  const duzey = a.guclukDuzeyi ? ` · ${esc(a.guclukDuzeyi)}` : "";
  return `${esc(a.code)} (${esc(a.id)})<br>${yas} · ${esc(a.kademe)}<br>${esc(a.taniProfili.join(", ") || "tanı profili yok")}${duzey}`;
}

/* ── Toplama ── */

export async function toplaVakalar(): Promise<AracVakalari[]> {
  const out: AracVakalari[] = [];
  for (const id of TOOL_IDS) {
    const a = await loadAdapter(id);
    const cases = JSON.parse(readFileSync(path.join(a.dir, "cases.json"), "utf8")) as CaseDef[];
    out.push({
      id,
      label: a.label,
      module: a.module,
      cases: cases.map((c) => ({ ...c, fixture: resolveFixture(a.module, c.student) })),
    });
  }
  return out;
}

export function gitKisaKimlik(): string {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || "bilinmiyor";
  } catch {
    return "bilinmiyor";
  }
}

export function toplamlar(araclar: AracVakalari[]): { arac: number; vaka: number; ogrencili: number } {
  const vaka = araclar.reduce((n, a) => n + a.cases.length, 0);
  const ogrencili = araclar.reduce((n, a) => n + a.cases.filter((c) => c.student).length, 0);
  return { arac: araclar.length, vaka, ogrencili };
}

/* ── Doküman ── */

const MODUL_BASLIK: Record<AracVakalari["module"], string> = { studio: "Studio", atolye: "Atölye" };

export function renderVakaListesi(araclar: AracVakalari[], meta: VakaMeta): string {
  const t = toplamlar(araclar);
  const out: string[] = [
    "# Değerlendirme vakaları (2026-10)",
    "",
    `Üretildi: ${meta.uretildi} · kaynak dal ucu: \`${meta.sha}\``,
    "",
    "**Onay için:** her aracın vakalarını okuyup onaylayın ya da düzeltin. " +
      "Düzeltme `apps/hub/evals/tools/<modül>/<araç>/cases.json`'da yapılır, doküman yeniden üretilir " +
      "(`cd apps/hub && node_modules/.bin/vitest run --config vitest.eval.config.ts evals/vakaListesi.eval.ts`). " +
      "Taban koşusundan sonra değişen vaka YENİ kimlik alır (ör. `hw-02` → `hw-02b`), eski kimlik silinir; böylece `ref/<eski>` referansı çakışmaz.",
    "",
    "Bu dosya üretilir, elle düzenlenmez. Yaşlar " + `${YAS_REFERANSI} tarihine göre hesaplanır. Gövde sütunu, uygulamanın aracına gönderilen istek alanlarını yazar (\`—\` boş/yok demektir).`,
    "",
    "## Özet",
    "",
    "| Araç | Kimlik | Modül | Vaka | Öğrencili vaka |",
    "|---|---|---|---|---|",
  ];
  for (const a of araclar) {
    out.push(`| ${esc(a.label)} | \`${a.id}\` | ${MODUL_BASLIK[a.module]} | ${a.cases.length} | ${a.cases.filter((c) => c.student).length} |`);
  }
  out.push(`| **Toplam** | | | **${t.vaka}** | **${t.ogrencili}** |`, "");

  let modul: AracVakalari["module"] | null = null;
  for (const a of araclar) {
    if (a.module !== modul) {
      modul = a.module;
      out.push(`## ${MODUL_BASLIK[modul]}`, "");
    }
    out.push(`### ${esc(a.label)} — \`${a.id}\` (${a.cases.length} vaka)`, "", "| Vaka | Öğrenci | Etiketler | Neyi sınıyor | Gövde |", "|---|---|---|---|---|");
    for (const c of a.cases) {
      out.push(`| ${esc(c.id)} | ${formatStudent(c.fixture, c.student)} | ${esc(c.tags.join(", "))} | ${esc(c.purpose)} | ${formatBody(c.body)} |`);
    }
    out.push("");
  }
  out.push(`Toplam: ${t.arac} araç, ${t.vaka} vaka (${t.ogrencili} öğrencili, ${t.vaka - t.ogrencili} öğrencisiz).`, "");
  return out.join("\n");
}

/** Dokümanı üretir ve `hedef` yoluna yazar (üst dizinler yaratılır). */
export async function writeVakaListesi(hedef: string, meta: VakaMeta = { uretildi: new Date().toISOString(), sha: gitKisaKimlik() }): Promise<{ md: string; araclar: AracVakalari[]; toplam: ReturnType<typeof toplamlar> }> {
  const araclar = await toplaVakalar();
  const md = renderVakaListesi(araclar, meta);
  mkdirSync(path.dirname(hedef), { recursive: true });
  writeFileSync(hedef, md);
  return { md, araclar, toplam: toplamlar(araclar) };
}
