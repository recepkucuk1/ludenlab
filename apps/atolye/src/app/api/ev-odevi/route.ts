import { NextResponse } from "next/server";
import { estimateCredits } from "@ludenlab/ai";
import { auth } from "@/auth";
import { withCredits } from "@/lib/credits";
import { evOdeviInputSchema } from "@/lib/ev-odevi";
import { generateEvOdevi } from "@/lib/ev-odevi-prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bu işlem için giriş yapmalısınız." }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Sunucu yapılandırması eksik (ANTHROPIC_API_KEY)." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const parsed = evOdeviInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Form geçersiz.",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 422 },
    );
  }

  try {
    // 1) Kredi kontrolü ve üretimi withCredits üzerinden yapıyoruz
    const result = await withCredits(session.user.id, () => generateEvOdevi(parsed.data));

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const resData = result.result;
    return NextResponse.json({
      text: resData.text,
      model: resData.model,
      credits: estimateCredits(resData.model, resData.usage),
      creditsLeft: result.balance,
    });
  } catch (err) {
    console.error("[EV ODEVI ERROR]", err);
    const message = err instanceof Error ? err.message : "bilinmeyen hata";
    return NextResponse.json(
      { error: "Üretim sırasında bir hata oluştu: " + message },
      { status: 500 },
    );
  }
}
