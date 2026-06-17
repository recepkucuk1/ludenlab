import { redirect } from "next/navigation";
import { auth } from "@studio/auth";
import { StudioLanding } from "@studio/components/landing/StudioLanding";

// auth() (cookie okuma) → prerender invariant'ını önle (deploy reçetesi).
export const dynamic = "force-dynamic";

/**
 * /studio index:
 *  - Studio ÜYELİĞİ olan girişli kullanıcı (@studio/auth çözülür) → dashboard.
 *  - Girişsiz VEYA studio üyeliği olmayan → pazarlama landing'i (üye-ol CTA'lı).
 * (Middleware /studio index'i gate'lemez; auth burada.)
 */
export default async function StudioIndex() {
  const session = await auth();
  if (session?.user) redirect("/studio/dashboard");
  return <StudioLanding />;
}
