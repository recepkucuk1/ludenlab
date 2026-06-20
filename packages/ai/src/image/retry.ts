/**
 * Geçici hatalarda üstel backoff'la tekrar dener. Saf/test-edilebilir: `sleep` enjekte edilir.
 * Görsel sağlayıcılarında geçici hataları (fal.ai bakiye-kilit flicker'ı, ağ blip'i, 5xx)
 * maskelemek için kullanılır — OpenAI SDK'nın maxRetries'ine FLUX tarafında eşdeğer.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: {
    attempts?: number;
    /** attempt (1-tabanlı) → bir sonraki denemeden önce beklenecek ms. */
    delayMs?: (attempt: number) => number;
    sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<T> {
  const attempts = opts.attempts ?? 4;
  const delayMs = opts.delayMs ?? ((a) => 800 * 2 ** (a - 1)); // 800ms, 1.6s, 3.2s
  const sleep = opts.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)));

  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) await sleep(delayMs(attempt));
    }
  }
  throw lastErr;
}
