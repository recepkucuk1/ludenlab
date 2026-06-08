import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import CheckoutClient from "./CheckoutClient";

const MODULES = ["STUDIO", "ATOLYE", "BRYTAKIP"];
const INTERVALS = ["MONTHLY", "YEARLY"];

/**
 * Apex ödeme sayfası (server). Oturum yoksa /giris'e (callbackUrl korunur).
 * Plan geçerliyse client checkout bileşenini render eder.
 */
export default async function OdemePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const moduleParam = str(sp.module);
  const code = str(sp.code);
  const interval = str(sp.interval);

  const qs = new URLSearchParams({
    module: moduleParam ?? "",
    code: code ?? "",
    interval: interval ?? "",
  }).toString();

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/giris?callbackUrl=${encodeURIComponent(`/odeme?${qs}`)}`);
  }

  const valid =
    moduleParam && MODULES.includes(moduleParam) && interval && INTERVALS.includes(interval) && code;
  const plan = valid
    ? await prisma.billingPlan.findUnique({
        where: {
          module_code_interval: {
            module: moduleParam as "STUDIO" | "ATOLYE" | "BRYTAKIP",
            code: code!,
            interval: interval as "MONTHLY" | "YEARLY",
          },
        },
      })
    : null;

  if (!plan || !plan.active) {
    return (
      <div style={{ maxWidth: 480, margin: "clamp(2rem,8vh,5rem) auto", padding: "0 1rem", textAlign: "center" }}>
        <h1 className="p-h3">Plan bulunamadı</h1>
        <p className="p-body" style={{ color: "var(--poster-ink-3)" }}>
          Seçtiğin plan geçersiz görünüyor. Lütfen modül sayfasından tekrar dene.
        </p>
      </div>
    );
  }

  return (
    <CheckoutClient
      module={moduleParam!}
      code={code!}
      interval={interval!}
      planName={plan.name}
      price={Number(plan.price)}
    />
  );
}
