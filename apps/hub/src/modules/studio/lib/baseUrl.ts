/**
 * Returns the application base URL.
 * Prefers AUTH_URL, falls back to NEXTAUTH_URL, then localhost in dev.
 */
export function getBaseUrl(): string {
  return (
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  );
}
