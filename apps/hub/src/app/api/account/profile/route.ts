import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({ name: z.string().trim().min(2, "Ad en az 2 karakter").max(80) });

/** Merkezi Account profilini günceller (şimdilik ad). E-posta = login kimliği, değişmez. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Form geçersiz." }, { status: 422 });
  }

  await prisma.account.update({ where: { id: session.user.id }, data: { name: parsed.data.name } });
  return NextResponse.json({ ok: true });
}
