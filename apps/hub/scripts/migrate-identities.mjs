/**
 * Kimlik göçü: modül kullanıcı tablolarından merkezi `billing.Account`'u doldurur.
 *
 * Kaynak  : studio `public.Therapist` (HUB/STUDIO aynı Supabase) ∪ atolye `public.Account`
 * Hedef   : `billing.Account` (HUB_DATABASE_URL, billing şeması) — Credentials provider'ın baktığı tablo
 * E-posta : tek anahtar (lowercase). Köprü (@studio/auth · @atolye/auth) e-postayla bağlar.
 * Şifre   : her iki modül de bcrypt $2b$ → hash KOPYALANIR, kullanıcı şifresini korur.
 *           Çakışma (her iki modülde, farklı hash) → STUDIO bazlı (studio = ana/çok kullanıcılı).
 * Rol     : herkes central "user" (modül admin erişimi köprüde modül rolünden korunur; central
 *           admin ayrı verilir). PRO grant'leri ayrı manuel adım.
 *
 * Idempotent: ON CONFLICT (email) DO NOTHING. Tekrar çalıştırmak güvenli.
 * KULLANIM:  node scripts/migrate-identities.mjs                → DRY-RUN (yazma YOK, plan basar)
 *            node scripts/migrate-identities.mjs --live         → CANLI yazım (TÜM hesaplar)
 *            node scripts/migrate-identities.mjs --skip-test    → @example/@test domainleri hariç
 */
import pg from "pg";
import { randomBytes } from "crypto";

const { Client } = pg;
const LIVE = process.argv.includes("--live");
const SKIP_TEST = process.argv.includes("--skip-test");
const isTestEmail = (e) => /@(example|test)\.(com|org|net)$/i.test(e) || /\+test/i.test(e);
const ssl = (u) => (u && u.includes("supabase.com") ? { rejectUnauthorized: false } : undefined);

// cuid2-benzeri id ('c' + 23 base36) — PK olarak benzersiz yeterli (gelecekteki Prisma signup'ları cuid üretir).
function cuidish() {
  const bytes = randomBytes(18);
  let s = "";
  for (const b of bytes) s += (b % 36).toString(36);
  return "c" + s.slice(0, 23);
}
const maskHash = (h) => (h ? `${h.slice(0, 4)}…(${h.length})` : "—");
const maskEmail = (e) => {
  const [u, d] = e.split("@");
  return `${u.slice(0, 2)}***@${d || "?"}`;
};

async function conn(url, label) {
  if (!url) throw new Error(`${label} DATABASE_URL yok (env)`);
  const c = new Client({ connectionString: url, ssl: ssl(url) });
  await c.connect();
  return c;
}
async function cols(c, schema, table) {
  const r = await c.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2`,
    [schema, table],
  );
  return new Set(r.rows.map((x) => x.column_name));
}

const studioC = await conn(process.env.STUDIO_DATABASE_URL, "STUDIO");
const atolyeC = await conn(process.env.ATOLYE_DATABASE_URL, "ATOLYE");
const hubC = await conn(process.env.HUB_DATABASE_URL, "HUB");

// kolon-tolerant SELECT (role/name modüle göre olmayabilir)
const sCols = await cols(studioC, "public", "Therapist");
const aCols = await cols(atolyeC, "public", "Account");
const sNameSel = sCols.has("name") ? `"name"` : `NULL AS name`;
const aNameSel = aCols.has("name") ? `"name"` : `NULL AS name`;

const sRows = (
  await studioC.query(
    `SELECT lower(email) AS email, "password" AS hash, ${sNameSel} FROM "public"."Therapist" WHERE email IS NOT NULL`,
  )
).rows;
const aRows = (
  await atolyeC.query(
    `SELECT lower(email) AS email, "passwordHash" AS hash, ${aNameSel} FROM "public"."Account" WHERE email IS NOT NULL`,
  )
).rows;

const sMap = new Map(sRows.map((r) => [r.email, r]));
const aMap = new Map(aRows.map((r) => [r.email, r]));
const emails = [...new Set([...sMap.keys(), ...aMap.keys()])].sort();

// Hâlihazırda central'da olanlar (idempotent gösterim)
const existing = new Set(
  (await hubC.query(`SELECT lower(email) AS email FROM "billing"."Account"`)).rows.map((r) => r.email),
);

const plan = emails.map((email) => {
  const s = sMap.get(email);
  const a = aMap.get(email);
  const source = s && a ? "both" : s ? "studio" : "atolye";
  const conflict = !!(s && a && s.hash !== a.hash);
  // çakışmada studio bazlı
  const hash = s?.hash || a?.hash;
  const hashFrom = s?.hash ? "studio" : "atolye";
  const name = s?.name || a?.name || null;
  return { email, source, conflict, hash, hashFrom, name, already: existing.has(email), isTest: isTestEmail(email) };
});

console.log(`\n=== KİMLİK GÖÇÜ ${LIVE ? "🔴 CANLI" : "🟡 DRY-RUN (yazma YOK)"} ===`);
console.log(`kaynak: studio ${sMap.size} ∪ atolye ${aMap.size} → ${plan.length} benzersiz · central'da zaten: ${existing.size}\n`);
console.log("  # | e-posta                | kaynak | rol  | şifre(maskeli)   | ad");
console.log("  --+------------------------+--------+------+------------------+----------------");
plan.forEach((p, i) => {
  const skipTest = SKIP_TEST && p.isTest;
  const flags = [
    p.conflict ? "⚠ÇAKIŞMA(studio baz)" : "",
    p.already ? "↺zaten-var(atlanır)" : "",
    p.isTest ? (skipTest ? "🧪test(HARİÇ)" : "🧪test") : "",
  ].filter(Boolean).join(" ");
  console.log(
    `  ${String(i + 1).padStart(2)} | ${maskEmail(p.email).padEnd(22)} | ${p.source.padEnd(6)} | user | ${maskHash(p.hash).padEnd(16)} | ${(p.name || "—").slice(0, 14).padEnd(14)} ${flags}`,
  );
});

const toInsert = plan.filter((p) => !p.already && !(SKIP_TEST && p.isTest));
const conflicts = plan.filter((p) => p.conflict);
const skippedTest = SKIP_TEST ? plan.filter((p) => p.isTest && !p.already).length : 0;
console.log(`\n  → oluşturulacak: ${toInsert.length} · zaten-var: ${plan.filter((p) => p.already).length} · test-hariç: ${skippedTest} · çakışma: ${conflicts.length} (studio baz)`);

if (!LIVE) {
  console.log("\n  DRY-RUN — hiçbir şey yazılmadı. Canlı için: node scripts/migrate-identities.mjs --live");
  await studioC.end(); await atolyeC.end(); await hubC.end();
  process.exit(0);
}

// ---- CANLI YAZIM ----
console.log("\n  CANLI yazım başlıyor (ON CONFLICT email DO NOTHING)...");
let inserted = 0;
for (const p of toInsert) {
  const r = await hubC.query(
    `INSERT INTO "billing"."Account" (id, email, name, "passwordHash", role, suspended, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, 'user', false, now(), now())
     ON CONFLICT (email) DO NOTHING`,
    [cuidish(), p.email, p.name, p.hash],
  );
  inserted += r.rowCount;
}
const finalCount = (await hubC.query(`SELECT count(*)::int n FROM "billing"."Account"`)).rows[0].n;
console.log(`  ✅ eklenen: ${inserted} · billing.Account toplam: ${finalCount}`);
await studioC.end(); await atolyeC.end(); await hubC.end();
