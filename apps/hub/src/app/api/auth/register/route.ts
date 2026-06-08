import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// Merkezi LudenLab hesabı (billing.Account). Kredi/plan modülde — burada yalnız kimlik.
const schema = z.object({
  name: z.string().trim().min(2, "Ad en az 2 karakter").max(80),
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin").max(160),
  password: z.string().min(8, "Şifre en az 8 karakter").max(200),
});

export async function POST(req: Request) {
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

  const { name, email, password } = parsed.data;

  const existing = await prisma.account.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "Bu e-posta zaten kayıtlı." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.account.create({ data: { name, email, passwordHash }, select: { id: true } });

  return NextResponse.json({ ok: true });
}
