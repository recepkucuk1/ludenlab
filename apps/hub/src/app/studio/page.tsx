import { redirect } from "next/navigation";

// /studio → /studio/dashboard (authed shell girişi; auth gate (main) layout'ta).
export default function StudioIndex() {
  redirect("/studio/dashboard");
}
