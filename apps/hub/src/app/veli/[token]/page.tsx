import { prisma } from "@studio/lib/db";
import { isTokenShape } from "@studio/lib/parentLink/token";
import { ParentFeedbackForm } from "@studio/components/parent/ParentFeedbackForm";

export const dynamic = "force-dynamic";

/* SSR: aktif bağlantı → uzman adı + form; yoksa geçersiz ekranı (çocuk verisi hiç yüklenmez). */
export default async function VeliPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = isTokenShape(token)
    ? await prisma.parentLink.findUnique({ where: { token }, select: { active: true, therapist: { select: { name: true } } } })
    : null;
  if (!link || !link.active) {
    return (
      <section aria-labelledby="gecersiz">
        <h1 id="gecersiz" style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>Bu bağlantı artık geçerli değil</h1>
        <p style={{ color: "var(--poster-ink-2)" }}>Lütfen uzmanınızdan yeni bir bağlantı isteyin.</p>
      </section>
    );
  }
  return <ParentFeedbackForm token={token} therapistName={link.therapist.name} />;
}
