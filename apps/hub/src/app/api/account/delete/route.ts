import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { deleteAccountEverywhere } from "@/lib/accountDeletion";
import { rateLimit, rateLimitResponse, getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * SELF-SERVİS HESAP SİLME (2026-08 güvenlik denetimi #03).
 *
 * NEDEN: gizlilik metni "hesabınızı silmeniz halinde verileriniz silinir" diyordu ama
 * kullanıcının bunu yapabileceği HİÇBİR yol yoktu — vaat karşılanmıyordu (KVKK m.7).
 *
 * GÜVENLİK KAPILARI (geri alınamaz + kullanıcıya dönük bir eylem):
 *   1. Oturum — `auth()` zaten her istekte DB ile doğrulanıyor (suspended/sessionVersion)
 *   2. YENİDEN KİMLİK DOĞRULAMA — mevcut şifre MERKEZİ hash'e karşı sorulur. Ele geçirilmiş
 *      bir çerez tek başına hesabı yok edememeli; şifre bilinmeden silme olmaz.
 *   3. AÇIK NİYET — kullanıcı sabit bir onay ifadesini yazmalı (yanlışlıkla tıklama olmaz)
 *   4. HIZ LİMİTİ — şifre deneme yüzeyi olarak kullanılmasın
 *
 * Silmenin kendisi `deleteAccountEverywhere` ile yürür: iyzico aboneliği iptal → fatura
 * kimliği saklanır (VUK) → 3 DB'den silinir. Sağlayıcı iptali başarısızsa HİÇBİR ŞEY
 * silinmez ve kullanıcıya sebep söylenir.
 */

/** Kullanıcının aynen yazması gereken onay ifadesi (UI'da da gösterilir). */
export const DELETE_CONFIRMATION = "HESABIMI SİL";

const schema = z.object({
  password: z.string().min(1, "Mevcut şifreni gir."),
  confirm: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  // Şifre doğrulaması içerdiği için brute-force yüzeyi — sınırla.
  const { allowed, retryAfter } = rateLimit(`account:delete:${session.user.id}`, 5);
  if (!allowed) return rateLimitResponse(retryAfter);

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Form geçersiz." },
      { status: 422 },
    );
  }

  if (parsed.data.confirm.trim() !== DELETE_CONFIRMATION) {
    return NextResponse.json(
      { error: `Onaylamak için "${DELETE_CONFIRMATION}" yazmalısın.` },
      { status: 422 },
    );
  }

  const account = await prisma.account.findUnique({
    where: { id: session.user.id },
    select: { email: true, passwordHash: true },
  });
  if (!account) return NextResponse.json({ error: "Hesap bulunamadı." }, { status: 404 });

  const ok = await bcrypt.compare(parsed.data.password, account.passwordHash);
  if (!ok) return NextResponse.json({ error: "Şifre yanlış." }, { status: 400 });

  const result = await deleteAccountEverywhere(account.email);
  if (!result.ok) {
    // Sağlayıcı iptali başarısız → hiçbir şey silinmedi. Kullanıcıya dürüst sebep.
    const status = result.reason === "not_found" ? 404 : 502;
    return NextResponse.json({ error: result.message }, { status });
  }

  // Silme kalıcı bir iz bırakmıyor (modül audit'i de hesapla gitti) → sunucu logu.
  console.warn("[account/delete] self-servis silme tamamlandı", {
    email: account.email,
    ip: getClientIp(req.headers),
    silinen: result.deleted,
  });

  // Oturumu kapat: hesap yok, çerez elde kalmasın. `auth()` zaten hesabı bulamayınca
  // null döner ama çerezi de temizlemek doğru davranış.
  await signOut({ redirect: false });

  return NextResponse.json({ ok: true, deleted: result.deleted });
}
