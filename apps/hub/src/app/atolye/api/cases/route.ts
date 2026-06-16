import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createCase, listStudentsForPicker } from "@atolye/lib/cases";
import { studentSchema } from "@atolye/lib/student";

export const runtime = "nodejs";

/** Araç öğrenci-seçici + roster: owner'ın öğrencileri (AI-güvenli profil + displayName). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  }
  const students = await listStudentsForPicker(session.user.id);
  return NextResponse.json({ students });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const parsed = studentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Form geçersiz.",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 422 },
    );
  }
  const c = await createCase(session.user.id, parsed.data);
  return NextResponse.json({ ok: true, id: c.id });
}
