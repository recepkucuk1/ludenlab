import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  current: z.string().min(1, "Mevcut şifre gerekli"),
  next: z.string().min(8, "Yeni şifre en az 8 karakter").max(200),
});

/**
 * Merkezi Account şifresini değiştirir (mevcut şifre doğrulanır).
 * Login köprüde merkezi şifreyi kullanır → modül şifreleri güncellenmez (auth'ta kullanılmıyor).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Form geçersiz." }, { status: 422 });
  }

  const acc = await prisma.account.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!acc) return NextResponse.json({ error: "Hesap bulunamadı." }, { status: 404 });

  const ok = await bcrypt.compare(parsed.data.current, acc.passwordHash);
  if (!ok) return NextResponse.json({ error: "Mevcut şifre yanlış." }, { status: 400 });

  const passwordHash = await bcrypt.hash(parsed.data.next, 12);
  await prisma.account.update({ where: { id: session.user.id }, data: { passwordHash } });
  return NextResponse.json({ ok: true });
}
