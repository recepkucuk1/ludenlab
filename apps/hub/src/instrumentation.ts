/**
 * Next.js açılış kancası — sunucu süreci başlarken BİR KEZ çalışır.
 * Şu an tek işi ortam denetimi (2026-08 denetimi #25): sessiz/tehlikeli varsayılanları
 * deploy anında görünür kılar. Sentry enstrümantasyonu da ileride buraya bağlanır (P3 #38).
 */
export async function register() {
  // Yalnız Node.js runtime'ında (edge/proxy derlemesinde process.env aynı değil).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // BUILD sırasında ÇALIŞTIRMA. `next build` NODE_ENV=production ile koşar; runtime env'i
  // (iyzico anahtarları vb.) build ortamında bulunmayabilir ve ölümcül kontrol DEPLOY'U
  // patlatırdı. Denetimin amacı çalışan sunucuyu doğrulamak, derlemeyi değil.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { assertEnv } = await import("@/lib/env");
  assertEnv();
}
