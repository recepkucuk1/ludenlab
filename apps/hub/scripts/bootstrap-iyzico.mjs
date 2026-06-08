/**
 * P3 — iyzico ürün/plan → billing.BillingPlan eşleme (idempotent, env-driven).
 *
 * Ürün/plan OLUŞTURMAZ — bunlar iyzico'da (sandbox & prod) zaten var. Mevcut planları
 * (paymentInterval + price ile) eşleyip billing."BillingPlan"a upsert eder; böylece apex
 * checkout, modül+tier+interval → iyzico pricingPlanReferenceCode araması yapabilir.
 *
 * Env: apps/hub/.env (IYZICO_API_KEY/SECRET_KEY/BASE_URL, HUB_DATABASE_URL).
 *   Sandbox .env → sandbox ref'leri yazar; PROD cutover'da prod anahtarlı .env ile YENİDEN çalıştır.
 * Çalıştır: node apps/hub/scripts/bootstrap-iyzico.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

// iyzipay & pg'yi pnpm .pnpm store'undan çöz — hub'a doğrudan dep eklemeden, sürümden bağımsız.
// (Runtime app iyzico'yu @ludenlab/billing üzerinden kullanır; bu yalnız ops scripti.)
const require = createRequire(import.meta.url);
const STORE = new URL("../../../node_modules/.pnpm/", import.meta.url);
const fromStore = (pkg) => {
  const dir = readdirSync(STORE).find((d) => d.startsWith(pkg + "@"));
  if (!dir) throw new Error(pkg + " .pnpm store'da bulunamadı");
  return require(new URL(dir + "/node_modules/" + pkg, STORE).pathname);
};
const Iyzipay = fromStore("iyzipay");
const pg = fromStore("pg");

// .env'i ham oku (Next runtime yok)
const env = {};
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const iyz = new Iyzipay({
  apiKey: env.IYZICO_API_KEY,
  secretKey: env.IYZICO_SECRET_KEY,
  uri: env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com",
});
const cid = () => Date.now().toString();
const items = (r) => (r && (r.items || (r.data && r.data.items))) || [];
const listProducts = () =>
  new Promise((res, rej) =>
    iyz.subscriptionProduct.retrieveList({ locale: "TR", conversationId: cid(), page: 1, count: 100 }, (e, r) =>
      e ? rej(e) : res(r),
    ),
  );
const listPlans = (ref) =>
  new Promise((res, rej) =>
    iyz.subscriptionPricingPlan.retrieveList(
      { locale: "TR", conversationId: cid(), productReferenceCode: ref, page: 1, count: 100 },
      (e, r) => (e ? rej(e) : res(r)),
    ),
  );

// Kanonik harita: modül → ürün adı (tam eşleşme) + planlar (code, interval, beklenen fiyat).
// Eşleme price+interval ile yapılır → isim varyasyonlarına ve eski/duplike planlara dayanıklı.
const SPEC = [
  {
    module: "STUDIO",
    product: "LudenLab",
    plans: [
      { code: "PRO", interval: "MONTHLY", price: 449 },
      { code: "PRO", interval: "YEARLY", price: 4579.8 },
      { code: "ADVANCED", interval: "MONTHLY", price: 1999 },
      { code: "ADVANCED", interval: "YEARLY", price: 20389.8 },
    ],
  },
  {
    module: "ATOLYE",
    product: "LudenLab Atölye",
    plans: [
      { code: "PRO", interval: "MONTHLY", price: 449 },
      { code: "PRO", interval: "YEARLY", price: 4579.8 },
      { code: "ADVANCED", interval: "MONTHLY", price: 1999 },
      { code: "ADVANCED", interval: "YEARLY", price: 20389.8 },
    ],
  },
  {
    module: "BRYTAKIP",
    product: "BRY Takip",
    plans: [{ code: "STANDARD", interval: "MONTHLY", price: 279 }],
  },
];

const moduleLabel = (m) => (m === "STUDIO" ? "Studio" : m === "ATOLYE" ? "Atölye" : "BRY");
const trName = (m, code, interval) =>
  `${moduleLabel(m)} ${code} ${interval === "MONTHLY" ? "Aylık" : "Yıllık"}`;
// Ürün adı eşlemesi Unicode-normalize + DEBUG/test ürünlerini ele (ör. "LudenLab Atölye DEBUG").
const norm = (s) => (s || "").normalize("NFC").trim();

const main = async () => {
  const products = items(await listProducts());
  const url = env.HUB_DATABASE_URL || "";
  const client = new pg.Client({
    connectionString: url.replace(/[?&]schema=billing/, ""),
    ssl: url.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  const done = [];
  for (const spec of SPEC) {
    const product = products.find((p) => norm(p.name) === norm(spec.product));
    if (!product) {
      console.log("⚠ ürün bulunamadı:", spec.product);
      continue;
    }
    const plans = items(await listPlans(product.referenceCode));
    for (const sp of spec.plans) {
      const match = plans.find(
        (p) => p.paymentInterval === sp.interval && Math.abs(Number(p.price) - sp.price) < 0.5,
      );
      if (!match) {
        console.log("⚠ plan yok:", spec.module, sp.code, sp.interval, sp.price);
        continue;
      }
      await client.query(
        `INSERT INTO billing."BillingPlan"
           ("id","module","code","interval","name","price","iyzicoProductRef","iyzicoPlanRef","active","createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,CURRENT_TIMESTAMP)
         ON CONFLICT ("module","code","interval") DO UPDATE SET
           "name"=EXCLUDED."name", "price"=EXCLUDED."price",
           "iyzicoProductRef"=EXCLUDED."iyzicoProductRef", "iyzicoPlanRef"=EXCLUDED."iyzicoPlanRef", "active"=true`,
        [
          randomUUID(),
          spec.module,
          sp.code,
          sp.interval,
          trName(spec.module, sp.code, sp.interval),
          sp.price,
          product.referenceCode,
          match.referenceCode,
        ],
      );
      done.push(`${spec.module}/${sp.code}/${sp.interval} → ${match.referenceCode}`);
    }
  }
  const summary = await client.query(
    `SELECT "module", count(*)::int n FROM billing."BillingPlan" GROUP BY "module" ORDER BY "module"`,
  );
  await client.end();
  console.log("\n✓ BillingPlan upsert (" + done.length + "):");
  done.forEach((d) => console.log("  -", d));
  console.log("\nModül başına BillingPlan:", JSON.stringify(summary.rows));
};

main().catch((e) => {
  console.error("BOOTSTRAP ERROR:", e?.message || e);
  process.exit(1);
});
