import { redirect } from "next/navigation";
import { auth } from "@atolye/auth";
import { isAdmin } from "./admin";

/**
 * Atölye admin SAYFA kapısı — her admin sayfasının BAŞINDA çağrılır.
 *
 * NEDEN (2026-08 güvenlik denetimi #11): Atölye admin sayfaları yetkilendirmeyi yalnız
 * `admin/layout.tsx`'e bırakıyordu; sayfanın kendisi `listAccounts()` / `listAudit()` /
 * `usageStats()` gibi tüm-kiracı verisini doğrudan çekiyordu. App Router'da layout ile page
 * ayrı segmentlerdir ve layout'un atlandığı istek biçimleri bilinen bir sınıftır
 * (CVE-2025-29927 ailesi) — layout tek başına yetkilendirme sınırı sayılmamalıdır.
 * Studio tarafı zaten her uçta `requireAdmin()` ile derinlemesine savunma yapıyor;
 * bu yardımcı aynı disiplini Atölye sayfalarına getirir.
 *
 * Kapı BAŞTA çağrılmalı: veri çekimi (özellikle `Promise.all` ile paralel olanlar)
 * kontrolden SONRA başlamalı, yoksa yetkisiz istek için de sorgu koşar.
 */
export async function requireAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!isAdmin(session.user.role)) redirect("/atolye/dashboard");
  return session;
}
