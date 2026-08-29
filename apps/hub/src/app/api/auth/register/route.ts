import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureModuleAccounts } from "@/lib/provision";
import { sendAlreadyRegisteredEmail, sendVerificationEmail } from "@/lib/email";
import { rateLimit, rateLimitResponse, getClientIp } from "@/lib/rateLimit";
import { canonicalEmail } from "@/lib/emailIdentity";

export const runtime = "nodejs";

// Merkezi LudenLab hesabı (billing.Account). Kredi/plan modülde — burada yalnız kimlik.
const schema = z.object({
  name: z.string().trim().min(2, "Ad en az 2 karakter").max(80),
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin").max(160),
  password: z.string().min(8, "Şifre en az 8 karakter").max(200),
  // Kayıtta seçilen modül(ler) = açılacak üyelik(ler). Verilmezse ikisi (geriye-uyumlu).
  modules: z.array(z.enum(["STUDIO", "ATOLYE"])).min(1, "En az bir modül seçin").default(["STUDIO", "ATOLYE"]),
  // KVKK rızası — kayıt için zorunlu (true olmalı); zaman damgası kaydedilir.
  kvkkAccepted: z.boolean().refine((v) => v === true, { message: "KVKK Aydınlatma Metni onayı gerekli." }),
});

export async function POST(req: Request) {
  // Public, hesap-açan + mail-gönderen uç. Kayıt NADİR bir eylemdir; eski limit
  // (5/dakika = 300/saat) toplu hesap açmaya fazlasıyla yer bırakıyordu → 10/SAAT.
  // (Okul/kurum NAT'ı arkasından birkaç uzmanın aynı seansta kaydolmasına yeter.)
  const { allowed, retryAfter } = rateLimit(`register:${getClientIp(req.headers)}`, 10, 60 * 60 * 1000);
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

  // KANONİK ADRES BAŞINA GÜNLÜK TAVAN (2026-08 denetimi #15).
  // `ali@gmail.com`, `ali+1@gmail.com`, `a.l.i@gmail.com` AYNI kutuya düşer; kanonik
  // anahtar olmadan tek kişi sınırsız FREE hesap (= sınırsız bedava üretim hakkı) açabiliyordu.
  // ÜRÜN KARARI: kayıt ENGELLENMEZ — yalnız hızı sınırlanır; `+etiket`i meşru kullananlar
  // (ör. ali+ludenlab@gmail.com) mağdur olmasın.
  const perInbox = rateLimit(`register:inbox:${canonicalEmail(email)}`, 3, 24 * 60 * 60 * 1000);
  if (!perInbox.allowed) return rateLimitResponse(perInbox.retryAfter);

  const existing = await prisma.account.findUnique({ where: { email }, select: { id: true } });

  // ── ENUMERASYON KAPISI (2026-08 güvenlik denetimi #42) ──
  // Eskiden var-olan adres 409 "Bu e-posta zaten kayıtlı." alıyordu: kimlik doğrulamadan,
  // istediğiniz adresin sistemde olup olmadığını öğrenebiliyordunuz. Parola sıfırlama ucu
  // zaten enumerasyon-güvenliydi; kayıt ucu o korumayı boşa çıkarıyordu.
  //
  // Artık iki durum da AYNI yanıtı döner ve gerçeği yalnız POSTA KUTUSUNUN SAHİBİ öğrenir:
  // var olan adrese "zaten hesabın var" bildirimi gider, yeni adrese doğrulama linki.
  //
  // ZAMANLAMA da eşitlenir: bcrypt.hash (~250 ms) her iki dalda da koşar. Yoksa var-olan
  // hesap belirgin biçimde HIZLI dönerdi ve yanıt gövdesi aynı olsa bile süre sızdırırdı.
  const passwordHash = await bcrypt.hash(password, 12);

  if (existing) {
    try {
      await sendAlreadyRegisteredEmail(email);
    } catch (mailErr) {
      console.error("POST /api/auth/register — sendAlreadyRegisteredEmail", mailErr);
    }
    return NextResponse.json({ ok: true });
  }

  // E-posta doğrulama token'ı: ham token e-postayla gider, DB'de yalnız sha256'sı saklanır.
  const verifyToken = crypto.randomUUID();
  const emailVerifyToken = crypto.createHash("sha256").update(verifyToken).digest("hex");
  const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat

  await prisma.account.create({
    data: { name, email, passwordHash, emailVerified: false, emailVerifyToken, emailVerifyExpires, kvkkAcceptedAt: new Date() },
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
