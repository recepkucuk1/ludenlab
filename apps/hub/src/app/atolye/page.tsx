import { redirect } from "next/navigation";
import { auth } from "@atolye/auth";
import { Landing } from "@atolye/components/Landing";

// auth() (cookie okuma) → prerender invariant'ını önle (deploy reçetesi).
export const dynamic = "force-dynamic";

/**
 * /atolye index:
 *  - Atölye ÜYELİĞİ olan girişli kullanıcı (@atolye/auth çözülür) → dashboard.
 *  - Girişsiz VEYA atölye üyeliği olmayan → pazarlama landing'i (üye-ol CTA'lı).
 * (Middleware /atolye index'i gate'lemez; auth burada.)
 */
export default async function AtolyeIndex() {
  const session = await auth();
  if (session?.user) redirect("/atolye/dashboard");
  return <Landing />;
}
