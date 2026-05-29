import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Kök: oturum varsa panele, yoksa girişe. (Pazarlama landing'i sonraki artımda.)
export default async function RootPage() {
  const session = await auth();
  redirect(session?.user ? "/dashboard" : "/giris");
}
