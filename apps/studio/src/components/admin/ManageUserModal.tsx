"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PBtn, PBadge, PInput, PModal } from "@/components/poster";
import { formatDate } from "@/lib/utils";

export type PlanType = "FREE" | "PRO" | "ADVANCED" | "ENTERPRISE";
export type BillingCycle = "MONTHLY" | "YEARLY";

export type ManageUserSubscription = {
  currentPeriodEnd: string;
  billingCycle: BillingCycle;
};

export type ManageUserData = {
  id: string;
  name: string;
  email: string;
  planType: PlanType;
  credits: number;
  studentLimit: number;
  pdfEnabled: boolean;
  subscriptions: ManageUserSubscription[];
};

export type ManageUserPatch = Partial<{
  planType: PlanType;
  studentLimit: number;
  pdfEnabled: boolean;
  credits: number;
  subscriptions: ManageUserSubscription[];
}>;

const PLAN_COLOR: Record<PlanType, "soft" | "blue" | "accent" | "pink"> = {
  FREE: "soft",
  PRO: "blue",
  ADVANCED: "accent",
  ENTERPRISE: "pink",
};

const PLAN_LABEL: Record<PlanType, string> = {
  FREE: "Free",
  PRO: "Pro",
  ADVANCED: "Advanced",
  ENTERPRISE: "Enterprise",
};

const PLAN_INFO: Record<PlanType, { students: string; credits: string }> = {
  FREE: { students: "2 öğrenci", credits: "40 kredi" },
  PRO: { students: "200 öğrenci", credits: "2.000 kredi" },
  ADVANCED: { students: "Sınırsız", credits: "10.000 kredi" },
  ENTERPRISE: { students: "Sınırsız", credits: "Özel" },
};

const PLANS: PlanType[] = ["FREE", "PRO", "ADVANCED", "ENTERPRISE"];
const CREDIT_PRESETS = [50, 100, 500, 1000, 2000];

function activeSub(u: ManageUserData): ManageUserSubscription | null {
  return u.subscriptions?.[0] ?? null;
}

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return formatDate(new Date(d), "short");
}

export function ManageUserModal({
  user,
  onClose,
  onUpdate,
}: {
  user: ManageUserData;
  onClose: () => void;
  onUpdate: (patch: ManageUserPatch) => void;
}) {
  const sub = activeSub(user);
  const [planType, setPlanType] = useState<PlanType>(user.planType);
  const [billing, setBilling] = useState<BillingCycle>(sub?.billingCycle ?? "YEARLY");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDirection, setCreditDirection] = useState<"grant" | "revoke">("grant");
  const [creditReason, setCreditReason] = useState("");
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingCredit, setSavingCredit] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);

  async function handleTogglePdf() {
    const next = !user.pdfEnabled;
    setSavingPdf(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/pdf-enabled`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdate({ pdfEnabled: next });
      toast.success(next ? "PDF desteği açıldı" : "PDF desteği kapatıldı");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setSavingPdf(false);
    }
  }

  async function handleSavePlan() {
    if (planType === user.planType && billing === (sub?.billingCycle ?? "YEARLY")) {
      toast("Değişiklik yok");
      return;
    }
    setSavingPlan(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType, billingCycle: billing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const periodEnd = new Date();
      if (billing === "YEARLY") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      else periodEnd.setMonth(periodEnd.getMonth() + 1);

      onUpdate({
        planType,
        studentLimit: data.user.studentLimit,
        pdfEnabled: data.user.pdfEnabled,
        subscriptions: [{ currentPeriodEnd: periodEnd.toISOString(), billingCycle: billing }],
      });
      toast.success("Plan güncellendi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setSavingPlan(false);
    }
  }

  async function handleSubmitCredit() {
    const n = parseInt(creditAmount);
    if (!n || n < 1) {
      toast.error("Geçerli bir miktar girin");
      return;
    }
    if (creditDirection === "revoke" && n > user.credits) {
      toast.error(`Yetersiz bakiye (mevcut ${user.credits})`);
      return;
    }
    setSavingCredit(true);
    try {
      const url = creditDirection === "grant"
        ? `/api/admin/users/${user.id}/credits`
        : `/api/admin/users/${user.id}/credits/revoke`;
      const body: Record<string, unknown> = { amount: n };
      if (creditDirection === "revoke" && creditReason.trim()) {
        body.reason = creditReason.trim();
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdate({ credits: data.user.credits });
      setCreditAmount("");
      setCreditReason("");
      toast.success(creditDirection === "grant" ? `${n} kredi eklendi` : `${n} kredi geri alındı`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setSavingCredit(false);
    }
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: ".1em",
    textTransform: "uppercase",
    color: "var(--poster-ink-3)",
    marginBottom: 8,
    fontFamily: "var(--font-display)",
  };

  return (
    <PModal open onClose={onClose} title="Üyelik Yönet" width={480}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <p style={{ margin: 0, fontSize: 12, color: "var(--poster-ink-3)", fontFamily: "var(--font-display)" }}>
          {user.name} · {user.email}
        </p>
        <div>
          <p style={sectionLabel}>Plan</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {PLANS.map((p) => {
              const selected = planType === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlanType(p)}
                  style={{
                    textAlign: "left",
                    padding: 12,
                    borderRadius: 12,
                    border: "2px solid var(--poster-ink)",
                    background: selected ? "var(--poster-accent)" : "var(--poster-panel)",
                    color: selected ? "#fff" : "var(--poster-ink)",
                    boxShadow: selected ? "3px 3px 0 var(--poster-ink)" : "var(--poster-shadow-sm)",
                    cursor: "pointer",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <PBadge color={selected ? "ink" : PLAN_COLOR[p]}>{PLAN_LABEL[p]}</PBadge>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, opacity: 0.85 }}>{PLAN_INFO[p].students}</p>
                  <p style={{ margin: 0, fontSize: 11, opacity: 0.85 }}>{PLAN_INFO[p].credits}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p style={sectionLabel}>Fatura Döngüsü</p>
          <div
            style={{
              display: "inline-flex",
              padding: 3,
              borderRadius: 12,
              border: "2px solid var(--poster-ink)",
              background: "var(--poster-panel)",
              boxShadow: "var(--poster-shadow-sm)",
            }}
          >
            {(["MONTHLY", "YEARLY"] as BillingCycle[]).map((b) => {
              const selected = billing === b;
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBilling(b)}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 9,
                    border: "none",
                    background: selected ? "var(--poster-ink)" : "transparent",
                    color: selected ? "#fff" : "var(--poster-ink-2)",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {b === "MONTHLY" ? "Aylık" : "Yıllık"}
                </button>
              );
            })}
          </div>
          {sub && (
            <p style={{ marginTop: 8, fontSize: 11, color: "var(--poster-ink-3)", fontFamily: "var(--font-display)" }}>
              Mevcut bitiş: {fmtDate(sub.currentPeriodEnd)}
            </p>
          )}
        </div>

        <PBtn onClick={handleSavePlan} disabled={savingPlan} variant="accent" size="md" style={{ width: "100%" }}>
          {savingPlan ? "Kaydediliyor..." : "Planı Kaydet"}
        </PBtn>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1.5px dashed var(--poster-ink-faint)",
            background: "var(--poster-bg-2)",
          }}
        >
          <div>
            <p style={{ ...sectionLabel, marginBottom: 2 }}>PDF Desteği</p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--poster-ink-3)", fontFamily: "var(--font-display)" }}>
              Plan değişiminde otomatik sıfırlanır.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={user.pdfEnabled}
            onClick={handleTogglePdf}
            disabled={savingPdf}
            style={{
              width: 52,
              height: 28,
              borderRadius: 999,
              border: "2px solid var(--poster-ink)",
              background: user.pdfEnabled ? "var(--poster-green)" : "var(--poster-panel)",
              position: "relative",
              cursor: savingPdf ? "wait" : "pointer",
              boxShadow: "var(--poster-shadow-sm)",
              transition: "background .15s",
              flexShrink: 0,
              opacity: savingPdf ? 0.6 : 1,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 1,
                left: user.pdfEnabled ? 25 : 1,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#fff",
                border: "1.5px solid var(--poster-ink)",
                transition: "left .15s",
              }}
            />
          </button>
        </div>

        <div style={{ height: 2, background: "var(--poster-ink-faint)" }} />

        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <p style={{ ...sectionLabel, marginBottom: 0 }}>Kredi</p>
            <span style={{ fontSize: 12, color: "var(--poster-ink-2)", fontFamily: "var(--font-display)" }}>
              Mevcut: <strong style={{ color: "var(--poster-ink)" }}>{user.credits.toLocaleString("tr-TR")}</strong>
            </span>
          </div>

          <div
            style={{
              display: "inline-flex",
              padding: 3,
              borderRadius: 12,
              border: "2px solid var(--poster-ink)",
              background: "var(--poster-panel)",
              boxShadow: "var(--poster-shadow-sm)",
              marginBottom: 12,
            }}
          >
            {(["grant", "revoke"] as const).map((d) => {
              const selected = creditDirection === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setCreditDirection(d)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 9,
                    border: "none",
                    background: selected ? "var(--poster-ink)" : "transparent",
                    color: selected ? "#fff" : "var(--poster-ink-2)",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {d === "grant" ? "Ekle" : "Geri Al"}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {CREDIT_PRESETS.map((n) => {
              const selected = creditAmount === String(n);
              const sign = creditDirection === "grant" ? "+" : "−";
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCreditAmount(String(n))}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 10,
                    border: "2px solid var(--poster-ink)",
                    background: selected
                      ? (creditDirection === "grant" ? "var(--poster-accent)" : "var(--poster-danger)")
                      : "var(--poster-panel)",
                    color: selected ? "#fff" : "var(--poster-ink)",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {sign}{n}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: creditDirection === "revoke" ? 8 : 0 }}>
            <PInput
              type="number"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              placeholder="Özel miktar..."
              min={1}
              style={{ flex: 1 }}
            />
            <PBtn
              onClick={handleSubmitCredit}
              disabled={savingCredit || !creditAmount}
              variant={creditDirection === "grant" ? "accent" : "white"}
              size="md"
              style={creditDirection === "revoke" ? { color: "var(--poster-danger)", borderColor: "var(--poster-danger)" } : undefined}
            >
              {savingCredit ? "..." : creditDirection === "grant" ? "Ekle" : "Geri Al"}
            </PBtn>
          </div>

          {creditDirection === "revoke" && (
            <PInput
              type="text"
              value={creditReason}
              onChange={(e) => setCreditReason(e.target.value)}
              placeholder="Sebep (opsiyonel)..."
              maxLength={200}
              style={{ width: "100%" }}
            />
          )}
        </div>
      </div>
    </PModal>
  );
}
