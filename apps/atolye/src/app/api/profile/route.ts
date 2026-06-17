import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  specialty: z.array(z.string().max(50)).max(10).optional(),
  institution: z.string().max(200).trim().nullable().optional(),
  phone: z.string().max(20).trim().nullable().optional(),
  experienceYears: z.string().max(20).trim().nullable().optional(),
  certifications: z.string().max(2000).trim().nullable().optional(),
});

const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  specialty: true,
  avatarUrl: true,
  institution: true,
  phone: true,
  experienceYears: true,
  certifications: true,
  preferences: true,
  credits: true,
  planType: true,
  createdAt: true,
} as const;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const account = await prisma.account.findUnique({
      where: { id: session.user.id },
      select: PROFILE_SELECT,
    });

    if (!account) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ account });
  } catch (error) {
    console.error("GET /api/profile", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const parsed = profileUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz istek" }, { status: 400 });
    }
    const { name, specialty, institution, phone, experienceYears, certifications } = parsed.data;

    const account = await prisma.account.update({
      where: { id: session.user.id },
      data: {
        name,
        specialty: specialty ?? [],
        institution: institution || null,
        phone: phone || null,
        experienceYears: experienceYears || null,
        certifications: certifications || null,
      },
      select: PROFILE_SELECT,
    });

    return NextResponse.json({ account });
  } catch (error) {
    console.error("PUT /api/profile", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
