import { redirect } from "next/navigation";

// /atolye → /atolye/dashboard (authed shell girişi; auth gate middleware'de).
export default function AtolyeIndex() {
  redirect("/atolye/dashboard");
}
