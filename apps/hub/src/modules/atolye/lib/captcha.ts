/**
 * hCaptcha sunucu-taraflı doğrulama. HCAPTCHA_SECRET tanımlı değilse (local/dev)
 * doğrulamayı atlar — prod'da secret tanımlanınca otomatik enforce edilir.
 */
export async function verifyCaptcha(token: string | undefined): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET;
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
