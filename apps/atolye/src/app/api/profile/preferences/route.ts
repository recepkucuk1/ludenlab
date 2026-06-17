import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const preferencesSchema = z.object({
  preferences: z
    .record(z.string(), z.unknown())
    .refine((val) => JSON.stringify(val).length <= 10_000, "Tercihler verisi çok büyük"),
});

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const parsed = preferencesSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz tercihler" }, { status: 400 });
    }
    const { preferences } = parsed.data;

    await prisma.account.update({
      where: { id: session.user.id },
      data: { preferences: preferences as Prisma.InputJsonValue },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/profile/preferences", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
