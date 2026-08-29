import { PrismaClient } from "@/generated/atolye/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { pgSsl } from "@/lib/dbSsl";

/**
 * Atölye KLİNİK DB = AYRI Supabase (ATOLYE_DATABASE_URL) + RLS. Studio/billing DB'sinden
 * İZOLE (çocuk verisi; ROADMAP kilitli karar). Runtime url = ATOLYE_DATABASE_URL.
 */
const g = globalThis as unknown as { atolyeDb: PrismaClient | undefined };

function create() {
  const url = process.env.ATOLYE_DATABASE_URL;
  const adapter = new PrismaPg({
    connectionString: url,
    ssl: pgSsl(url),
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const atolyeDb = g.atolyeDb ?? create();
if (process.env.NODE_ENV !== "production") g.atolyeDb = atolyeDb;

/*
 * `withRls()` KALDIRILDI (2026-08 güvenlik denetimi #49).
 *
 * Fonksiyon `app.current_account_id` ayarlayıp RLS politikalarını devreye sokuyormuş gibi
 * duruyordu ve dokümantasyonu "klinik veriye erişen TÜM sorgular bundan geçmeli" diyordu.
 * Gerçekte HİÇBİR YERDEN ÇAĞRILMIYORDU; üstelik bu bağlantı `postgres` rolüyle açılıyor ve
 * o rol `rolbypassrls` taşıyor — çağrılsaydı bile RLS politikaları uygulanmazdı.
 *
 * Klinik veriyi bugün koruyan şey, uygulama katmanındaki sahiplik filtreleridir
 * (`where: { ownerId }` / `updateMany({ where: { ownerId } })`). Ölü kod + yanlış doküman
 * bırakmak, gerçekte var olmayan bir savunmaya güvenilmesine yol açar: bu yüzden silindi.
 * Gerçek RLS istenirse ayrı, BYPASSRLS'siz bir uygulama rolü + politikalar gerekir.
 */
