/**
 * Faz D — central billing.BillingPlan.iyzicoPlanRef'lerini SANDBOX → PROD'a çevir.
 *
 * Prod ref'ler BILLING_CUTOVER.md §10 (2026-06-08 read-only keşif) envanterinden.
 * Plan ref'leri API anahtarı rotasyonundan ETKİLENMEZ (planlar kalır; sadece auth değişir).
 *
 * ⚠️ Bunu hub iyzico anahtarları PROD'a geçtiğiyle EŞZAMANLI uygula (Ö4↔Ö5).
 * Erken uygularsan sandbox checkout kırılır (sandbox key + prod plan ref uyuşmaz).
 *
 * Kullanım (apps/hub içinden):
 *   node --env-file=.env scripts/set-prod-plan-refs.mjs           # DRY-RUN (sadece gösterir)
 *   node --env-file=.env scripts/set-prod-plan-refs.mjs --apply   # UYGULA
 */
import pg from "pg";

const APPLY = process.argv.includes("--apply");

// (module, code, interval) → PROD iyzicoPlanRef  (§10)
const PROD_REFS = [
  ["STUDIO", "PRO", "MONTHLY", "19ab231d-4648-4ffc-a291-5f7d751d4bfd"],
  ["STUDIO", "PRO", "YEARLY", "fef3c8a8-5065-4562-83ed-beebd8cafe6b"],
  ["STUDIO", "ADVANCED", "MONTHLY", "6a02f590-aff6-45ce-a1f2-f9fa2d3dbea6"],
  ["STUDIO", "ADVANCED", "YEARLY", "63a0a2a7-c7f9-4315-90e8-cc75b37c1084"],
  ["ATOLYE", "PRO", "MONTHLY", "010cd87c-8b21-4282-b9bd-674a362b51ef"],
  ["ATOLYE", "PRO", "YEARLY", "086ac3be-ac25-402b-8e33-4bbf4ecfaa7d"],
  ["ATOLYE", "ADVANCED", "MONTHLY", "801da161-ad16-49d9-a074-0c0285d35370"],
  ["ATOLYE", "ADVANCED", "YEARLY", "8fa33f9f-5487-4ddd-9c35-c07dcc15aa81"],
];

const c = new pg.Client({
  connectionString: process.env.HUB_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const MOD = 'billing."BillingModule"';
const INT = 'billing."BillingInterval"';
let changed = 0;
let missing = 0;

console.log(`MODE: ${APPLY ? "APPLY (yazıyor)" : "DRY-RUN (sadece gösterir)"}\n`);
for (const [module, code, interval, prodRef] of PROD_REFS) {
  const cur = await c.query(
    `SELECT id, "iyzicoPlanRef", active FROM billing."BillingPlan"
      WHERE module = $1::${MOD} AND code = $2 AND interval = $3::${INT} LIMIT 1`,
    [module, code, interval],
  );
  const row = cur.rows[0];
  if (!row) {
    console.log(`  ⚠️  YOK: ${module}/${code}/${interval} — BillingPlan satırı bulunamadı`);
    missing++;
    continue;
  }
  const same = row.iyzicoPlanRef === prodRef;
  const tag = same ? "= zaten prod" : "→ DEĞİŞECEK";
  console.log(
    `  ${same ? "  " : "✱ "}${module}/${code}/${interval}  ${String(row.iyzicoPlanRef).slice(0, 8)}… ${tag} ${prodRef.slice(0, 8)}…`,
  );
  if (!same) {
    changed++;
    if (APPLY) {
      await c.query(`UPDATE billing."BillingPlan" SET "iyzicoPlanRef" = $1 WHERE id = $2`, [prodRef, row.id]);
    }
  }
}

// Mapping'de OLMAYAN BillingPlan satırı var mı? (envanter dışı → dikkat)
const all = await c.query(`SELECT module, code, interval FROM billing."BillingPlan"`);
const keyset = new Set(PROD_REFS.map((r) => `${r[0]}/${r[1]}/${r[2]}`));
for (const r of all.rows) {
  const k = `${r.module}/${r.code}/${r.interval}`;
  if (!keyset.has(k)) console.log(`  ❓ envanter-dışı BillingPlan: ${k} (mapping'de yok — elle kontrol)`);
}

console.log(
  `\nÖZET: ${changed} satır ${APPLY ? "güncellendi" : "değişecek"}, ${missing} eksik. ${APPLY ? "" : "Uygulamak için --apply ekle."}`,
);
await c.end();
process.exit(missing ? 1 : 0);
