import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { logError } from "@/lib/utils";

export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  try {
    const [totalUsers, totalStudents, totalCards] = await Promise.all([
      prisma.therapist.count(),
      prisma.student.count(),
      prisma.card.count(),
    ]);
    return NextResponse.json({ totalUsers, totalStudents, totalCards });
  } catch (error) {
    logError("admin/stats", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
