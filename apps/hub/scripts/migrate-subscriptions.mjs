/**
 * Faz D — canlı abonelik göçü: atolye + Studio active subs → merkezi billing şeması.
 * Modül kullanıcı e-postası → merkezi Account (email upsert) + Subscription (iyzicoSubscriptionRef upsert);
 * billingPlanId central BillingPlan'da (module, code, interval) ile eşlenir.
 *
 * DRY-RUN VARSAYILAN (hiçbir şey yazmaz, rapor verir). Gerçek göç: --apply.
 * Env: CENTRAL_URL, ATOLYE_URL, STUDIO_URL (connection string'ler).
 *   CENTRAL_URL=.. ATOLYE_URL=.. STUDIO_URL=.. node apps/hub/scripts/migrate-subscriptions.mjs [--apply]
 *
 * NOT: iyzicoSubscriptionRef'i olmayan (comp/manuel) aktif subs OTOMATİK taşınmaz (⚠ raporlanır) —
 * onlar iyzico'suz; merkezi entitlement'ı ayrı verilmeli. Migrate edilen Account'ların passwordHash'i
 * placeholder ("!migrated"); e-posta köprüsü için login gerekmez (apex checkout'ta reset/register).
 */
import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";

const require = createRequire(import.meta.url);
const STORE = new URL("../../../node_modules/.pnpm/", import.meta.url);
const pg = require(new URL(readdirSync(STORE).find((d) => d.startsWith("pg@")) + "/node_modules/pg", STORE).pathname);

const APPLY = process.argv.includes("--apply");
const conn = (url) =>
  new pg.Client({
    connectionString: (url || "").replace(/[?&]schema=[a-z]+/, ""),
    ssl: (url || "").includes("supabase") ? { rejectUnauthorized: false } : undefined,
  });

const mapStatus = (s) =>
  ({ ACTIVE: "ACTIVE", UPGRADED: "ACTIVE", PENDING: "PENDING", UNPAID: "PAST_DUE", PAST_DUE: "PAST_DUE", CANCELED: "CANCELED", CANCELLED: "CANCELED", EXPIRED: "EXPIRED" }[s] || "PENDING");
const mapInterval = (c) => (c === "YEARLY" ? "YEARLY" : "MONTHLY");
const mapCode = (t) => t; // Plan.type (PRO/ADVANCED) → central BillingPlan.code (aynı)

const SOURCES = [
  {
    module: "ATOLYE",
    url: process.env.ATOLYE_URL,
    sql: `SELECT s.status, s."billingCycle" cycle, s."iyzicoSubscriptionRef" subref, s."iyzicoPricingPlanRef" planref, s."currentPeriodEnd" pend, a.email, p.type plan
          FROM "Subscription" s JOIN "Account" a ON a.id=s."accountId" JOIN "Plan" p ON p.id=s."planId"
          WHERE s.status::text IN ('ACTIVE','PAST_DUE','PENDING')`,
  },
  {
    module: "STUDIO",
    url: process.env.STUDIO_URL,
    sql: `SELECT s.status, s."billingCycle" cycle, s."iyzicoSubscriptionRef" subref, s."iyzicoPricingPlanRef" planref, s."currentPeriodEnd" pend, t.email, p.type plan
          FROM "Subscription" s JOIN "Therapist" t ON t.id=s."therapistId" JOIN "Plan" p ON p.id=s."planId"
          WHERE s.status::text IN ('ACTIVE','PAST_DUE','PENDING')`,
  },
];

(async () => {
  const central = conn(process.env.CENTRAL_URL);
  await central.connect();
  const plans = (await central.query(`SELECT id, module, code, interval FROM billing."BillingPlan"`)).rows;
  const findPlan = (m, c, i) => plans.find((p) => p.module === m && p.code === c && p.interval === i);
  console.log(`MOD: ${APPLY ? "APPLY (yazar!)" : "DRY-RUN (yazmaz)"} | central BillingPlan: ${plans.length} kombinasyon\n`);

  let total = 0, ok = 0;
  for (const src of SOURCES) {
    if (!src.url) { console.log(`[${src.module}] URL yok → atlandı`); continue; }
    const c = conn(src.url);
    await c.connect();
    const rows = (await c.query(src.sql)).rows;
    await c.end();
    console.log(`=== ${src.module}: ${rows.length} aday ===`);
    for (const r of rows) {
      total++;
      const code = mapCode(r.plan), interval = mapInterval(r.cycle), status = mapStatus(r.status);
      const plan = findPlan(src.module, code, interval);
      const issues = [];
      if (!r.email) issues.push("email yok");
      if (r.plan === "FREE") issues.push("FREE (iyzico'suz)");
      if (!r.subref) issues.push("iyzicoSubscriptionRef yok");
      if (!plan) issues.push(`central plan yok (${code}/${interval})`);
      const good = issues.length === 0;
      if (good) ok++;
      console.log(`  ${good ? "✓" : "⚠"} ${r.email || "(email?)"} | ${code}/${interval} | ${status} | sub=${r.subref ? r.subref.slice(0, 8) + "…" : "-"}${issues.length ? "  [" + issues.join(", ") + "]" : ""}`);
      if (APPLY && good) {
        const ares = await central.query(
          `INSERT INTO billing."Account"("id","email","passwordHash","updatedAt") VALUES($1,$2,$3,CURRENT_TIMESTAMP)
           ON CONFLICT("email") DO UPDATE SET "updatedAt"=CURRENT_TIMESTAMP RETURNING "id"`,
          [randomUUID(), r.email, "!migrated"],
        );
        await central.query(
          `INSERT INTO billing."Subscription"("id","accountId","module","billingPlanId","status","iyzicoSubscriptionRef","iyzicoPricingPlanRef","currentPeriodEnd","updatedAt")
           VALUES($1,$2,$3::billing."BillingModule",$4,$5::billing."SubscriptionStatus",$6,$7,$8,CURRENT_TIMESTAMP)
           ON CONFLICT("iyzicoSubscriptionRef") DO UPDATE SET status=EXCLUDED.status, "currentPeriodEnd"=EXCLUDED."currentPeriodEnd", "billingPlanId"=EXCLUDED."billingPlanId"`,
          [randomUUID(), ares.rows[0].id, src.module, plan.id, status, r.subref, r.planref, r.pend],
        );
      }
    }
  }
  await central.end();
  console.log(`\nÖZET: ${total} aday · ${ok} taşınabilir · ${total - ok} sorunlu/elle. ${APPLY ? "UYGULANDI." : "(dry-run — yazılmadı)"}`);
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
