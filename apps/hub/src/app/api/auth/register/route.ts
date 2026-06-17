import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureModuleAccounts } from "@/lib/provision";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit, rateLimitResponse, getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Merkezi LudenLab hesabı (billing.Account). Kredi/plan modülde — burada yalnız kimlik.
const schema = z.object({
  name: z.string().trim().min(2, "Ad en az 2 karakter").max(80),
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin").max(160),
  password: z.string().min(8, "Şifre en az 8 karakter").max(200),
  // Kayıtta seçilen modül(ler) = açılacak üyelik(ler). Verilmezse ikisi (geriye-uyumlu).
  modules: z.array(z.enum(["STUDIO", "ATOLYE"])).min(1, "En az bir modül seçin").default(["STUDIO", "ATOLYE"]),
});

export async function POST(req: Request) {
  // Public, hesap-açan + mail-gönderen uç → IP başına rate-limit (spam/enumeration/mail-bomb).
  const { allowed, retryAfter } = rateLimit(`register:${getClientIp(req.headers)}`, 5);
  if (!allowed) return rateLimitResponse(retryAfter);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Form geçersiz.",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 422 },
    );
  }

  const { name, email, password, modules } = parsed.data;

  const existing = await prisma.account.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "Bu e-posta zaten kayıtlı." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // E-posta doğrulama token'ı: ham token e-postayla gider, DB'de yalnız sha256'sı saklanır.
  const verifyToken = crypto.randomUUID();
  const emailVerifyToken = crypto.createHash("sha256").update(verifyToken).digest("hex");
  const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat

  await prisma.account.create({
    data: { name, email, passwordHash, emailVerified: false, emailVerifyToken, emailVerifyExpires },
    select: { id: true },
  });

  // SEÇİLEN modül(ler)e üyelik aç (köprüler çözülsün; FREE tier). Best-effort (kayıt akışını bozmaz).
  await ensureModuleAccounts({ email, name, passwordHash, modules });

  // Doğrulama e-postası — akış dışı; gönderim başarısız olsa da kayıt geçerli (/verify-email'de resend).
  try {
    await sendVerificationEmail(email, verifyToken);
  } catch (mailErr) {
    console.error("POST /api/auth/register — sendVerificationEmail", mailErr);
  }

  return NextResponse.json({ ok: true });
}
