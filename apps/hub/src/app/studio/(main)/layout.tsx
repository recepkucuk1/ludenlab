import { Sidebar } from "@studio/components/poster/sidebar";
import { auth } from "@/auth";
import { reconcileCentralEntitlement } from "@studio/lib/central-billing";

// auth() (cookie okuma) → prerender invariant'ı önlemek için dinamik (deploy reçetesi).
export const dynamic = "force-dynamic";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  // Apex (ludenlab.com) ödemesiyle oluşan merkezi aboneliği studio planType'ına
  // yansıt (NEXT_PUBLIC_CENTRAL_BILLING flag'li, upgrade-only, best-effort).
  const session = await auth();
  if (session?.user?.id) {
    await reconcileCentralEntitlement(session.user.id);
  }

  return (
    <div
      className="poster-scope flex min-h-screen w-full"
      style={{ background: "var(--poster-bg)", color: "var(--poster-ink)" }}
    >
      <Sidebar />
      <main
        id="main-content"
        className="flex-1 w-full flex flex-col pt-16 md:pt-0 h-screen overflow-auto"
      >
        {children}
      </main>
    </div>
  );
}
