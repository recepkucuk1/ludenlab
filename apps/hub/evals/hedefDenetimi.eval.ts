// apps/hub/evals/hedefDenetimi.eval.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { it } from "vitest";
import { DEFAULT_MODEL, pickAlias, pseudonymizeText } from "@ludenlab/ai";
import { mebToPrompt } from "@atolye/lib/meb-program";
import { temizle } from "@/lib/hedefDenetimi";
import { HEDEF_DENETIM_SYSTEM, kullaniciPromptu } from "@/lib/hedefDenetimi/prompt";
import { HEDEF_DENETIM_MAX_TOKENS } from "@/lib/hedefDenetimi/run";
import { FLOW_DIR } from "./lib/core";
import { readResponse, requestPaths, writeRequest, type ExchangeRequest, type PendingRow } from "./lib/exchange";
import { KONTROL_ANAHTARLARI, adGeciyor, denetimKontrolleri, type HedefVakasi, type KontrolSonucu } from "./tools/hedef-denetimi/checks";

/*
 * Hedef denetçisi — HAKEMSİZ çevrimdışı koşu (spec §11). Karşılaştırılacak taban yok; ölçülen şey deterministik.
 * Yalnız dosya protokolü paylaşılır: istek `<flow>/hedef-denetimi/exchange/<id>_rep0.gen.request.md`, yanıt
 * `.response.txt` (eval-model alt-ajanı yazar), bekleyenler `pending.json` (README "Çevrimdışı (subagent) döngüsü"
 * ile aynı satır biçimi; hepsi `agentModel: "sonnet"`). Yanıtı olan vakalar kontrol edilir → `results.jsonl` + `ozet.md`
 * (her koşuda yeniden yazılır). Kapı komutuna girmez (kök dizindedir).
 *
 *   node_modules/.bin/vitest run --config vitest.eval.config.ts evals/hedefDenetimi.eval.ts
 *
 * PII kapısı: adlı vakada gerçek adın ilk kelimesi istek metninde geçerse koşu durur (istek yazılmaz).
 */

const DIR = path.join(FLOW_DIR, "hedef-denetimi");
const EXCHANGE = path.join(DIR, "exchange");

interface Satir extends KontrolSonucu { id: string; etiket: string }

function ozetTablosu(rows: Satir[], bekleyen: number, cases: HedefVakasi[]): string {
  const b = [`# Hedef denetçisi — çevrimdışı koşu`, "", `Sonuç: ${rows.length} vaka · bekleyen: ${bekleyen}`, ""];
  b.push(`| Vaka | Etiket | ${KONTROL_ANAHTARLARI.map((k) => (k === "yeniden_yazim_yok" ? "yeniden_yazim_yok (hedef kopyası ≥4 kelime)" : k)).join(" | ")} | sert |`, `|${"---|".repeat(KONTROL_ANAHTARLARI.length + 3)}`);
  for (const r of rows) b.push(`| ${r.id} | ${r.etiket} | ${KONTROL_ANAHTARLARI.map((k) => r.scores[k]!.toFixed(2)).join(" | ")} | ${r.hard.join(", ")} |`);
  if (rows.length) {
    b.push("", "Ortalama: " + KONTROL_ANAHTARLARI.map((k) => `${k}=${(rows.reduce((a, r) => a + r.scores[k]!, 0) / rows.length).toFixed(2)}`).join(" · "));
  }
  const n = cases.length;
  const say = (k: string) => rows.filter((r) => r.scores[k] === 1).length;
  const gk = (ok: boolean) => (ok ? "GEÇTİ" : "KALDI");
  const bd = rows.length ? rows.reduce((a, r) => a + r.scores.beklenen_durum!, 0) / rows.length : 0;
  const mebIds = new Set(cases.filter((c) => c.beklenenMeb).map((c) => c.id));
  const mebRows = rows.filter((r) => mebIds.has(r.id));
  const mebOk = mebRows.filter((r) => r.scores.meb_uyum === 1).length;
  b.push("", "Kabul:");
  for (const k of ["parse", "yeniden_yazim_yok", "enjeksiyon_yok", "rumuz_korundu"]) b.push(`- ${k}: ${say(k)}/${n} (gerekli ${n}/${n}) ${gk(say(k) === n)}`);
  for (const k of ["alinti_dogru", "soru_filtresi"]) b.push(`- ${k}=1: ${say(k)}/${n} (gerekli ≥7) ${gk(say(k) >= 7)}`);
  b.push(`- beklenen_durum ortalaması: ${bd.toFixed(2)} (gerekli ≥0.80) ${gk(bd >= 0.8)}`);
  b.push(`- meb_uyum (beklenenMeb'li vakalar): ${mebOk}/${mebIds.size} ${gk(mebOk === mebIds.size && mebRows.length === mebIds.size)}`);
  return b.join("\n") + "\n";
}

it("hedef denetçisi — çevrimdışı koşu", () => {
  const cases = JSON.parse(readFileSync(path.join(import.meta.dirname, "tools/hedef-denetimi/cases.json"), "utf8")) as HedefVakasi[];
  mkdirSync(EXCHANGE, { recursive: true });
  const pending: PendingRow[] = [];
  const rows: Satir[] = [];
  writeFileSync(path.join(DIR, "pending.json"), "[]\n"); // PII kapısı fırlatırsa bayat liste kalmasın

  for (const v of cases) {
    const alias = v.ad ? pickAlias(v.ad, { scope: "eval-hedef-denetimi" }) : null;
    const hedef = temizle(alias && v.ad ? pseudonymizeText(v.hedef, [{ real: v.ad, alias }]) : v.hedef);
    const meb = v.mebHedefKod ? (mebToPrompt({ hedefKod: v.mebHedefKod }) ?? undefined) : undefined;
    const req: ExchangeRequest = {
      key: `${v.id}_rep0`,
      role: "gen",
      agentModel: "sonnet",
      model: DEFAULT_MODEL,
      system: HEDEF_DENETIM_SYSTEM,
      user: kullaniciPromptu({ hedef, baglam: { ...v.baglam, meb } }),
      max_tokens: HEDEF_DENETIM_MAX_TOKENS,
    };
    if (v.ad) {
      if (adGeciyor(req.user, v.ad.split(/\s+/)[0]!)) throw new Error(`PII: ${v.id} isteğinde gerçek ad geçiyor — istek yazılmadı`);
    }
    writeRequest(EXCHANGE, req);
    const yanit = readResponse(EXCHANGE, req);
    if (yanit === null) {
      const p = requestPaths(EXCHANGE, req.key, "gen");
      pending.push({ key: req.key, role: "gen", agentModel: "sonnet", model: DEFAULT_MODEL, requestMd: p.md, responseTxt: p.response });
      continue;
    }
    rows.push({ id: v.id, etiket: v.etiket, ...denetimKontrolleri(yanit, hedef, v, Boolean(meb)) });
  }

  writeFileSync(path.join(DIR, "pending.json"), JSON.stringify(pending, null, 2) + "\n");
  writeFileSync(path.join(DIR, "results.jsonl"), rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""));
  writeFileSync(path.join(DIR, "ozet.md"), ozetTablosu(rows, pending.length, cases));
  console.log(`[hedef-denetimi] ${rows.length} sonuç, ${pending.length} bekleyen → ${DIR}`);
});
