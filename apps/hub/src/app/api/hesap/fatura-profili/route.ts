import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * Fatura profili (e-Arşiv/e-Fatura kimliği) — hesap başına bir kayıt.
 * GET: mevcut profil (yoksa null) + ad önerisi. PUT: upsert (tip-bazlı doğrulama).
 * Ödeme (hosted form) yolu bu profil olmadan başlatılmaz (init 428) → checkout formu
 * bu ucu kullanır; /hesap/profil'den de düzenlenir.
 */

const schema = z
  .object({
    type: z.enum(["INDIVIDUAL", "CORPORATE"]),
    fullName: z.string().trim().min(3, "Ad soyad en az 3 karakter").max(120),
    tckn: z
      .string()
      .trim()
      .regex(/^\d{11}$/, "TCKN 11 haneli olmalı")
      .optional()
      .or(z.literal("")),
    companyName: z.string().trim().max(200).optional(),
    taxNumber: z.string().trim().optional(),
    taxOffice: z.string().trim().max(120).optional(),
    address: z.string().trim().max(400).optional(),
    city: z.string().trim().min(2, "İl gerekli").max(60),
    district: z.string().trim().max(60).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type !== "CORPORATE") return;
    if (!v.companyName || v.companyName.length < 2)
      ctx.addIssue({ code: "custom", path: ["companyName"], message: "Ünvan gerekli" });
    if (!v.taxNumber || !/^\d{10,11}$/.test(v.taxNumber))
      ctx.addIssue({ code: "custom", path: ["taxNumber"], message: "VKN 10 hane (şahıs şirketinde TCKN 11 hane)" });
    if (!v.taxOffice || v.taxOffice.length < 2)
      ctx.addIssue({ code: "custom", path: ["taxOffice"], message: "Vergi dairesi gerekli" });
    if (!v.address || v.address.length < 5)
      ctx.addIssue({ code: "custom", path: ["address"], message: "Açık adres gerekli" });
  });

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const [profile, account] = await Promise.all([
    prisma.billingProfile.findUnique({ where: { accountId: session.user.id } }),
    prisma.account.findUnique({ where: { id: session.user.id }, select: { name: true } }),
  ]);
  return NextResponse.json({ profile, suggestedFullName: account?.name ?? "" });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const { allowed, retryAfter } = rateLimit(`fatura-profili:${session.user.id}`, 10);
  if (!allowed) return rateLimitResponse(retryAfter);

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Form geçersiz.",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 422 },
    );
  }

  const v = parsed.data;
  // Boş string → null (kısmi alanlar tip değişiminde temiz kalsın).
  const data = {
    type: v.type,
    fullName: v.fullName,
    tckn: v.tckn || null,
    companyName: v.type === "CORPORATE" ? v.companyName || null : null,
    taxNumber: v.type === "CORPORATE" ? v.taxNumber || null : null,
    taxOffice: v.type === "CORPORATE" ? v.taxOffice || null : null,
    address: v.address || null,
    city: v.city,
    district: v.district || null,
  };

  const profile = await prisma.billingProfile.upsert({
    where: { accountId: session.user.id },
    update: data,
    create: { accountId: session.user.id, ...data },
  });
  return NextResponse.json({ ok: true, profile });
}
