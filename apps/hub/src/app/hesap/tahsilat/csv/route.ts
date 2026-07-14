import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/** CSV alanını güvenli yaz (çift tırnak + noktalı virgül/yeni satır kaçışı). */
function esc(v: string | null | undefined): string {
  const s = v ?? "";
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Tahsilat CSV'si (admin) — e-Arşiv/e-Fatura kesimi için tüm başarılı tahsilatlar +
 * müşteri fatura profili. Noktalı virgül ayraç + UTF-8 BOM (Türkçe Excel uyumu).
 * Opsiyonel filtre: ?from=YYYY-MM-DD&to=YYYY-MM-DD (createdAt aralığı).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const createdAt: { gte?: Date; lte?: Date } = {};
  if (from && !Number.isNaN(Date.parse(from))) createdAt.gte = new Date(from);
  if (to && !Number.isNaN(Date.parse(to))) createdAt.lte = new Date(`${to}T23:59:59.999Z`);

  const payments = await prisma.payment.findMany({
    where: Object.keys(createdAt).length ? { createdAt } : undefined,
    orderBy: { createdAt: "asc" },
    include: {
      account: { select: { email: true, name: true, billingProfile: true } },
      billingPlan: { select: { name: true } },
    },
  });

  const header = [
    "tarih", "musteriEmail", "musteriAd", "faturaTipi", "adSoyad", "tckn",
    "unvan", "vknTckn", "vergiDairesi", "adres", "il", "ilce",
    "modul", "plan", "tutarTL", "tur", "paynkolayRef", "clientRef",
  ].join(";");

  const rows = payments.map((p) => {
    const bp = p.account.billingProfile;
    return [
      p.createdAt.toISOString(),
      esc(p.account.email),
      esc(p.account.name),
      bp?.type ?? "",
      esc(bp?.fullName),
      esc(bp?.tckn),
      esc(bp?.companyName),
      esc(bp?.taxNumber),
      esc(bp?.taxOffice),
      esc(bp?.address),
      esc(bp?.city),
      esc(bp?.district),
      p.module,
      esc(p.billingPlan?.name),
      String(p.amount),
      p.kind,
      esc(p.paynkolayRefCode),
      esc(p.clientRefCode),
    ].join(";");
  });

  const csv = "﻿" + [header, ...rows].join("\r\n"); // BOM: Türkçe Excel uyumu
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ludenlab-tahsilat-${stamp}.csv"`,
    },
  });
}
