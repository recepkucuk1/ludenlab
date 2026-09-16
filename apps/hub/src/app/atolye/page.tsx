import { redirect } from "next/navigation";
import { auth } from "@atolye/auth";
import { Landing } from "@atolye/components/Landing";

import type { Metadata } from "next";

/**
 * Çıplak /atolye HERKESE AÇIK pazarlama sayfasıdır (bkz. /studio eşi).
 */
export const metadata: Metadata = {
  title: "LudenLab Atölye — ÖÖG ve DEHB için BEP ve materyal araçları",
  description:
    "Özel eğitim öğretmenleri için MEB kazanımlarına dayalı BEP, davranış planı, okuma ve matematik materyalleri.",
};


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
