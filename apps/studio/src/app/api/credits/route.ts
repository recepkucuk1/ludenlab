import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/utils";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const therapist = await prisma.therapist.findUnique({
      where: { id: session.user.id },
      select: { credits: true, planType: true, pdfEnabled: true, studentLimit: true },
    });

    if (!therapist) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({
      credits: therapist.credits,
      planType: therapist.planType,
      pdfEnabled: therapist.pdfEnabled,
      studentLimit: therapist.studentLimit,
    });
  } catch (error) {
    logError("GET /api/credits", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
