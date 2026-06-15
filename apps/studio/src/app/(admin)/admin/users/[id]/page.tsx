"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Shield,
  Power,
  Trash2,
  Settings2,
  CheckCircle2,
  XCircle,
  UserCog,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { AUDIT_ACTION_LABEL } from "@/lib/audit-labels";
import {
  PBtn,
  PCard,
  PBadge,
  PSpinner,
  PTabs,
  PStatCard,
  PEmptyState,
  PModal,
  PInput,
  PSelect,
} from "@/components/poster";
import {
  ManageUserModal,
  type ManageUserData,
  type PlanType as MPlanType,
} from "@/components/admin/ManageUserModal";

type PlanType = "FREE" | "PRO" | "ADVANCED" | "ENTERPRISE";
type BillingCycle = "MONTHLY" | "YEARLY";
type SubscriptionStatus = "ACTIVE" | "CANCELLED" | "EXPIRED" | "PENDING";
type LessonStatus = "PLANNED" | "COMPLETED" | "CANCELLED";
type CreditTxnType = "EARN" | "SPEND";

interface SubscriptionRow {
  id: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodEnd: string;
  iyzicoSubscriptionRef: string | null;
  iyzicoCustomerRef: string | null;
  iyzicoPricingPlanRef: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  plan: { type: PlanType };
}

interface CreditTxn {
  id: string;
  amount: number;
  type: CreditTxnType;
  description: string;
  createdAt: string;
}

interface AuditLogRow {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  diff: unknown;
  ip: string | null;
  createdAt: string;
}

interface StudentRow {
  id: string;
  name: string;
  workArea: string;
  diagnosis: string | null;
  createdAt: string;
  _count: { lessons: number; assignments: number; progress: number };
}

interface LessonRow {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  status: LessonStatus;
  isRecurring: boolean;
  student: { id: string; name: string };
}

interface DailyUsage {
  date: string;
  cost: number;
  calls: number;
  cacheReads: number;
  cacheWrites: number;
  inputTokens: number;
  outputTokens: number;
}

interface UsageBucket {
  endpoint?: string;
  model?: string;
  cost: number;
  calls: number;
}

interface UserDetail {
  therapist: {
    id: string;
    email: string;
    name: string;
    specialty: string[];
    role: string;
    emailVerified: boolean;
    credits: number;
    studentLimit: number;
    pdfEnabled: boolean;
    planType: PlanType;
    suspended: boolean;
    lastLogin: string | null;
    avatarUrl: string | null;
    institution: string | null;
    phone: string | null;
    experienceYears: string | null;
    certifications: string | null;
    supportAccessExpiresAt: string | null;
    supportAccessReason: string | null;
    createdAt: string;
    updatedAt: string;
    _count: { students: number; cards: number; lessons: number };
  };
  cardStats: Record<string, number>;
  subscriptions: SubscriptionRow[];
  creditTxns: CreditTxn[];
  apiUsage: {
    daily: DailyUsage[];
    endpoints: UsageBucket[];
    models: UsageBucket[];
    totals: {
      cost: number;
      calls: number;
      cacheHitRate: number;
      cacheReadTokens: number;
      cacheWriteTokens: number;
      inputTokens: number;
      outputTokens: number;
    };
  };
  auditLogs: AuditLogRow[];
  students: StudentRow[];
  lessons: LessonRow[];
}

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

const SUB_STATUS_COLOR: Record<SubscriptionStatus, "soft" | "blue" | "accent" | "pink" | "ink"> = {
  ACTIVE: "accent",
  PENDING: "blue",
  CANCELLED: "pink",
  EXPIRED: "soft",
};

const LESSON_STATUS_LABEL: Record<LessonStatus, string> = {
  PLANNED: "Planlanmış",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};

const LESSON_STATUS_COLOR: Record<LessonStatus, "soft" | "blue" | "accent" | "pink"> = {
  PLANNED: "blue",
  COMPLETED: "accent",
  CANCELLED: "pink",
};

const TOOL_LABELS: Record<string, string> = {
  LEARNING_CARD: "Öğrenme Kartı",
  SOCIAL_STORY: "Sosyal Hikaye",
  ARTICULATION_DRILL: "Artikülasyon Alıştırması",
  HOMEWORK_MATERIAL: "Ev Ödevi Materyali",
  WEEKLY_PLAN: "Haftalık Plan",
  SESSION_SUMMARY: "Seans Özeti",
  MATCHING_GAME: "Eşleştirme Oyunu",
  PHONATION_ACTIVITY: "Fonasyon Aktivitesi",
  COMMUNICATION_BOARD: "İletişim Panosu",
};

const WORK_AREA_LABEL: Record<string, string> = {
  speech: "Konuşma",
  language: "Dil",
  hearing: "İşitme",
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return formatDate(new Date(d), "short");
}

function fmtDateLong(d: string | null | undefined) {
  if (!d) return "—";
  return formatDate(new Date(d), "long");
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  color: "var(--poster-ink-3)",
  fontFamily: "var(--font-display)",
  marginBottom: 10,
};

const td: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 13,
  fontFamily: "var(--font-display)",
  color: "var(--poster-ink)",
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 14px",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  color: "var(--poster-ink-2)",
  whiteSpace: "nowrap",
  borderBottom: "2px solid var(--poster-ink)",
  background: "var(--poster-bg-2)",
  fontFamily: "var(--font-display)",
};

export default function AdminUserDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params.id;

  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tab, setTab] = useState("general");

  const [manageOpen, setManageOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.replace("/login");
      return;
    }
    if (session.user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    fetch(`/api/admin/users/${userId}`)
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error ?? "Kullanıcı yüklenemedi");
        }
        return r.json();
      })
      .then((d: UserDetail) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : "Hata oluştu");
        setLoading(false);
      });
  }, [session, status, router, userId]);

  const isSelf = data && session?.user?.id === data.therapist.id;

  function patchTherapist(patch: Partial<UserDetail["therapist"]>) {
    setData((prev) => (prev ? { ...prev, therapist: { ...prev.therapist, ...patch } } : prev));
  }

  function patchSubscriptionsForActivePlan(planType: PlanType, billing: BillingCycle, periodEndIso: string) {
    setData((prev) => {
      if (!prev) return prev;
      const existingActive = prev.subscriptions.find((s) => s.status === "ACTIVE");
      if (existingActive) {
        const updated = prev.subscriptions.map((s) =>
          s.id === existingActive.id
            ? { ...s, billingCycle: billing, currentPeriodEnd: periodEndIso, plan: { type: planType }, updatedAt: new Date().toISOString() }
            : s,
        );
        return { ...prev, subscriptions: updated };
      }
      // Subscription ID/plan referans bilgisi backend'de oluşturulmuştur — ön-uçta
      // optik bir kart yeterli; tam doğruluk için sayfa yenilenebilir.
      return {
        ...prev,
        subscriptions: [
          {
            id: `optimistic-${Date.now()}`,
            status: "ACTIVE",
            billingCycle: billing,
            currentPeriodEnd: periodEndIso,
            iyzicoSubscriptionRef: null,
            iyzicoCustomerRef: null,
            iyzicoPricingPlanRef: null,
            cancelledAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            plan: { type: planType },
          },
          ...prev.subscriptions,
        ],
      };
    });
  }

  async function handleToggleRole() {
    if (!data || isSelf) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${data.therapist.id}/role`, { method: "PATCH" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      patchTherapist({ role: j.user.role });
      toast.success(j.user.role === "admin" ? "Admin yapıldı" : "Admin yetkisi alındı");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleSuspend() {
    if (!data || isSelf) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${data.therapist.id}/suspend`, { method: "PATCH" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      patchTherapist({ suspended: j.user.suspended });
      toast.success(j.user.suspended ? "Hesap askıya alındı" : "Askı kaldırıldı");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleImpersonate() {
    if (!data || isSelf) return;
    if (!window.confirm(`${data.therapist.name} olarak giriş yapılacak. Mevcut admin oturumunuz sonlanır.`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${data.therapist.id}/impersonate`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      const result = await signIn("credentials", {
        autoLoginToken: j.token,
        redirect: false,
      });
      if (result?.error) {
        toast.error("Giriş başarısız — token geçersiz olabilir");
        return;
      }
      toast.success(`${j.target.name} olarak giriş yapıldı`);
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!data || isSelf) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users?id=${data.therapist.id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Silinemedi");
      }
      toast.success("Hesap silindi");
      router.push("/admin/users");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
      setDeleting(false);
    }
  }

  if (loading || status === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <PSpinner size={40} />
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div style={{ maxWidth: 720, margin: "60px auto", padding: 24 }}>
        <PEmptyState
          icon="⚠️"
          title="Kullanıcı yüklenemedi"
          subtitle={errorMsg ?? undefined}
          action={
            <PBtn as="a" href="/admin/users" variant="white" size="md">
              ← Listeye Dön
            </PBtn>
          }
        />
      </div>
    );
  }

  const t = data.therapist;
  const activeSub = data.subscriptions.find((s) => s.status === "ACTIVE") ?? null;

  const manageData: ManageUserData = {
    id: t.id,
    name: t.name,
    email: t.email,
    planType: t.planType as MPlanType,
    credits: t.credits,
    studentLimit: t.studentLimit,
    pdfEnabled: t.pdfEnabled,
    subscriptions: activeSub
      ? [{ currentPeriodEnd: activeSub.currentPeriodEnd, billingCycle: activeSub.billingCycle }]
      : [],
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 64px" }}>
      <div style={{ marginBottom: 18 }}>
        <Link
          href="/admin/users"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-display)",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--poster-ink-2)",
            textDecoration: "none",
          }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Listeye Dön
        </Link>
      </div>

      <PCard rounded={20} style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, minWidth: 0, flex: 1 }}>
            <div
              aria-hidden
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                border: "2px solid var(--poster-ink)",
                background: t.avatarUrl ? `center / cover no-repeat url(${t.avatarUrl})` : "var(--poster-accent)",
                color: "#fff",
                boxShadow: "var(--poster-shadow-md)",
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 24,
                flexShrink: 0,
              }}
            >
              {!t.avatarUrl && t.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 26,
                    fontWeight: 800,
                    color: "var(--poster-ink)",
                    fontFamily: "var(--font-display)",
                    letterSpacing: "-.02em",
                  }}
                >
                  {t.name}
                </h1>
                <PBadge color={PLAN_COLOR[t.planType]}>{PLAN_LABEL[t.planType]}</PBadge>
                {t.role === "admin" && <PBadge color="ink">ADMIN</PBadge>}
                {t.suspended && <PBadge color="pink">ASKIDA</PBadge>}
                {!t.emailVerified && <PBadge color="soft">DOĞRULANMAMIŞ</PBadge>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", color: "var(--poster-ink-2)", fontFamily: "var(--font-display)", fontSize: 13 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Mail style={{ width: 13, height: 13 }} /> {t.email}
                </span>
                {t.phone && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Phone style={{ width: 13, height: 13 }} /> {t.phone}
                  </span>
                )}
                {t.institution && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Building2 style={{ width: 13, height: 13 }} /> {t.institution}
                  </span>
                )}
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 11, color: "var(--poster-ink-3)", fontFamily: "var(--font-display)", fontWeight: 700 }}>
                Kayıt: {fmtDate(t.createdAt)} · Son giriş: {fmtDate(t.lastLogin)}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <PBtn onClick={() => setManageOpen(true)} variant="accent" size="md">
              <Settings2 style={{ width: 14, height: 14, marginRight: 6 }} />
              Yönet
            </PBtn>
            {!isSelf && (
              <>
                {(() => {
                  const consentActive = !!t.supportAccessExpiresAt && new Date(t.supportAccessExpiresAt) > new Date();
                  return (
                    <PBtn
                      onClick={handleImpersonate}
                      disabled={actionLoading || t.suspended || !t.emailVerified || !consentActive}
                      variant="white"
                      size="md"
                      title={
                        !consentActive
                          ? "Kullanıcı destek erişimine izin vermemiş — KVKK gereği impersonate yapılamaz"
                          : t.suspended
                          ? "Askıdaki kullanıcıya giriş yapılamaz"
                          : !t.emailVerified
                          ? "Email doğrulanmamış"
                          : `İzin ${formatDate(new Date(t.supportAccessExpiresAt!), "short")} tarihine kadar geçerli`
                      }
                    >
                      <UserCog style={{ width: 14, height: 14, marginRight: 6 }} />
                      Bu Kullanıcı Olarak Giriş
                    </PBtn>
                  );
                })()}
                <PBtn onClick={handleToggleRole} disabled={actionLoading} variant="white" size="md">
                  <Shield style={{ width: 14, height: 14, marginRight: 6 }} />
                  {t.role === "admin" ? "Admin'den Çıkar" : "Admin Yap"}
                </PBtn>
                <PBtn onClick={handleToggleSuspend} disabled={actionLoading} variant="white" size="md">
                  <Power style={{ width: 14, height: 14, marginRight: 6 }} />
                  {t.suspended ? "Askıyı Kaldır" : "Askıya Al"}
                </PBtn>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  style={{
                    padding: "9px 14px",
                    borderRadius: 12,
                    border: "2px solid var(--poster-ink)",
                    background: "var(--poster-panel)",
                    color: "var(--poster-danger)",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    boxShadow: "var(--poster-shadow-sm)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Trash2 style={{ width: 14, height: 14 }} />
                  Sil
                </button>
              </>
            )}
          </div>
        </div>
      </PCard>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <PStatCard size="small" label="Kredi" value={t.credits} valueColor="var(--poster-ink)" countUp={false} noAnimation />
        <PStatCard
          size="small"
          label="Öğrenci"
          value={t._count.students}
          sub={t.studentLimit === -1 ? "Sınırsız" : `Limit ${t.studentLimit}`}
          valueColor="var(--poster-blue)"
          countUp={false}
          noAnimation
        />
        <PStatCard size="small" label="Materyal" value={t._count.cards} valueColor="var(--poster-accent)" countUp={false} noAnimation />
        <PStatCard size="small" label="Randevu" value={t._count.lessons} valueColor="var(--poster-pink)" countUp={false} noAnimation />
        <PStatCard
          size="small"
          label="AI Maliyet (30gün)"
          value={`$${data.apiUsage.totals.cost.toFixed(2)}`}
          sub={`${data.apiUsage.totals.calls} çağrı`}
          valueColor="var(--poster-green)"
          countUp={false}
          noAnimation
        />
      </div>

      <PTabs value={tab} onValueChange={setTab}>
        <div style={{ marginBottom: 18, overflowX: "auto" }}>
          <PTabs.List>
            <PTabs.Trigger value="general">Genel</PTabs.Trigger>
            <PTabs.Trigger value="subscription">Abonelik</PTabs.Trigger>
            <PTabs.Trigger value="credits">Krediler</PTabs.Trigger>
            <PTabs.Trigger value="usage">AI Kullanım</PTabs.Trigger>
            <PTabs.Trigger value="students">Öğrenciler</PTabs.Trigger>
            <PTabs.Trigger value="lessons">Randevular</PTabs.Trigger>
            <PTabs.Trigger value="audit">Audit</PTabs.Trigger>
          </PTabs.List>
        </div>

        <PTabs.Panel value="general">
          <GeneralPanel detail={data} />
        </PTabs.Panel>

        <PTabs.Panel value="subscription">
          <SubscriptionPanel
            subs={data.subscriptions}
            active={activeSub}
            userId={t.id}
            onSubUpdated={(updated) => {
              setData((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  subscriptions: prev.subscriptions.map((s) =>
                    s.id === updated.id
                      ? {
                          ...s,
                          status: updated.status,
                          billingCycle: updated.billingCycle,
                          currentPeriodEnd: updated.currentPeriodEnd,
                          cancelledAt: updated.cancelledAt,
                          updatedAt: new Date().toISOString(),
                        }
                      : s,
                  ),
                };
              });
            }}
          />
        </PTabs.Panel>

        <PTabs.Panel value="credits">
          <CreditsPanel txns={data.creditTxns} balance={t.credits} />
        </PTabs.Panel>

        <PTabs.Panel value="usage">
          <UsagePanel usage={data.apiUsage} />
        </PTabs.Panel>

        <PTabs.Panel value="students">
          <StudentsPanel students={data.students} />
        </PTabs.Panel>

        <PTabs.Panel value="lessons">
          <LessonsPanel lessons={data.lessons} />
        </PTabs.Panel>

        <PTabs.Panel value="audit">
          <AuditPanel logs={data.auditLogs} userId={t.id} />
        </PTabs.Panel>
      </PTabs>

      {manageOpen && (
        <ManageUserModal
          user={manageData}
          onClose={() => setManageOpen(false)}
          onUpdate={(patch) => {
            if (patch.planType !== undefined || patch.studentLimit !== undefined || patch.pdfEnabled !== undefined) {
              patchTherapist({
                ...(patch.planType !== undefined ? { planType: patch.planType as PlanType } : {}),
                ...(patch.studentLimit !== undefined ? { studentLimit: patch.studentLimit } : {}),
                ...(patch.pdfEnabled !== undefined ? { pdfEnabled: patch.pdfEnabled } : {}),
              });
            }
            if (patch.credits !== undefined) {
              patchTherapist({ credits: patch.credits });
            }
            if (patch.subscriptions && patch.subscriptions[0] && patch.planType) {
              patchSubscriptionsForActivePlan(
                patch.planType as PlanType,
                patch.subscriptions[0].billingCycle,
                patch.subscriptions[0].currentPeriodEnd,
              );
            }
          }}
        />
      )}

      {confirmDelete && (
        <PModal open onClose={() => setConfirmDelete(false)} title="Hesabı Sil" width={420}>
          <p style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 14, color: "var(--poster-ink-2)" }}>
            <strong style={{ color: "var(--poster-ink)" }}>{t.name}</strong> hesabı kalıcı olarak silinecek. Bu işlem geri alınamaz.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
            <PBtn onClick={() => setConfirmDelete(false)} variant="white" size="md">
              İptal
            </PBtn>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{
                padding: "9px 14px",
                borderRadius: 12,
                border: "2px solid var(--poster-ink)",
                background: "var(--poster-danger)",
                color: "#fff",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 13,
                cursor: deleting ? "not-allowed" : "pointer",
                boxShadow: "2px 2px 0 var(--poster-ink)",
                opacity: deleting ? 0.5 : 1,
              }}
            >
              {deleting ? "Siliniyor..." : "Sil Onayla"}
            </button>
          </div>
        </PModal>
      )}
    </div>
  );
}

// ── Tab panels ──────────────────────────────────────────────────────────────

function GeneralPanel({ detail }: { detail: UserDetail }) {
  const t = detail.therapist;
  const cardEntries = Object.entries(detail.cardStats).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
      <PCard rounded={16} style={{ padding: 20 }}>
        <p style={sectionLabel}>Hesap Bilgileri</p>
        <InfoRow label="Email" value={t.email} verifiedFlag={t.emailVerified} />
        <InfoRow label="Telefon" value={t.phone ?? "—"} />
        <InfoRow label="Kurum" value={t.institution ?? "—"} />
        <InfoRow label="Tecrübe" value={t.experienceYears ?? "—"} />
        <InfoRow label="Uzmanlık" value={t.specialty.length > 0 ? t.specialty.join(", ") : "—"} />
        <InfoRow label="Sertifikalar" value={t.certifications ?? "—"} />
        <InfoRow label="Kayıt Tarihi" value={fmtDateLong(t.createdAt)} />
        <InfoRow label="Son Güncelleme" value={fmtDateLong(t.updatedAt)} />
        <InfoRow label="Son Giriş" value={fmtDateLong(t.lastLogin)} />
      </PCard>

      <PCard rounded={16} style={{ padding: 20 }}>
        <p style={sectionLabel}>Plan & Yetkiler</p>
        <InfoRow
          label="Plan"
          value={<PBadge color={PLAN_COLOR[t.planType]}>{PLAN_LABEL[t.planType]}</PBadge>}
        />
        <InfoRow label="Öğrenci Limiti" value={t.studentLimit === -1 ? "Sınırsız" : String(t.studentLimit)} />
        <InfoRow
          label="PDF Desteği"
          value={
            t.pdfEnabled ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--poster-green)" }}>
                <CheckCircle2 style={{ width: 14, height: 14 }} /> Aktif
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--poster-ink-3)" }}>
                <XCircle style={{ width: 14, height: 14 }} /> Kapalı
              </span>
            )
          }
        />
        <InfoRow label="Rol" value={t.role === "admin" ? "Admin" : "Kullanıcı"} />
        <InfoRow label="Email Doğrulanmış" value={t.emailVerified ? "Evet" : "Hayır"} />
        <InfoRow
          label="Hesap Durumu"
          value={
            t.suspended ? (
              <span style={{ color: "var(--poster-danger)", fontWeight: 700 }}>Askıda</span>
            ) : (
              <span style={{ color: "var(--poster-green)", fontWeight: 700 }}>Aktif</span>
            )
          }
        />
      </PCard>

      <PCard rounded={16} style={{ padding: 20, gridColumn: "1 / -1" }}>
        <p style={sectionLabel}>Materyal Üretimi (Toplam)</p>
        {cardEntries.length === 0 ? (
          <PEmptyState variant="dashed" size="compact" title="Henüz materyal üretilmedi" />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {cardEntries.map(([toolType, count]) => (
              <div
                key={toolType}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1.5px solid var(--poster-ink-faint)",
                  background: "var(--poster-bg-2)",
                  fontFamily: "var(--font-display)",
                }}
              >
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "var(--poster-ink-3)" }}>
                  {TOOL_LABELS[toolType] ?? toolType}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "var(--poster-ink)", fontVariantNumeric: "tabular-nums" }}>
                  {count}
                </p>
              </div>
            ))}
          </div>
        )}
      </PCard>
    </div>
  );
}

function InfoRow({ label, value, verifiedFlag }: { label: string; value: React.ReactNode; verifiedFlag?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1.5px dashed var(--poster-ink-faint)" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--poster-ink-3)", letterSpacing: ".08em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: "var(--poster-ink)", fontFamily: "var(--font-display)", fontWeight: 600, textAlign: "right", display: "inline-flex", alignItems: "center", gap: 6 }}>
        {value}
        {verifiedFlag !== undefined && (verifiedFlag ? (
          <CheckCircle2 style={{ width: 14, height: 14, color: "var(--poster-green)" }} />
        ) : (
          <XCircle style={{ width: 14, height: 14, color: "var(--poster-ink-3)" }} />
        ))}
      </span>
    </div>
  );
}

// Modal: input için "YYYY-MM-DD" formatı, API'ye gönderirken UTC midnight ISO.
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function SubscriptionOverrideModal({
  sub,
  userId,
  onClose,
  onSaved,
}: {
  sub: SubscriptionRow;
  userId: string;
  onClose: () => void;
  onSaved: (updated: Pick<SubscriptionRow, "id" | "status" | "billingCycle" | "currentPeriodEnd" | "cancelledAt">) => void;
}) {
  const [status, setStatus] = useState<SubscriptionStatus>(sub.status);
  const [billing, setBilling] = useState<BillingCycle>(sub.billingCycle);
  const [periodEnd, setPeriodEnd] = useState<string>(toDateInput(sub.currentPeriodEnd));
  const [cancelledAt, setCancelledAt] = useState<string>(toDateInput(sub.cancelledAt));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!periodEnd) {
      toast.error("Bitiş tarihi zorunlu");
      return;
    }
    const body: Record<string, unknown> = {};
    if (status !== sub.status) body.status = status;
    if (billing !== sub.billingCycle) body.billingCycle = billing;
    if (periodEnd !== toDateInput(sub.currentPeriodEnd)) {
      body.currentPeriodEnd = new Date(periodEnd).toISOString();
    }
    const cancelledAtInput = cancelledAt || null;
    const cancelledAtCurrent = sub.cancelledAt ? toDateInput(sub.cancelledAt) : null;
    if (cancelledAtInput !== cancelledAtCurrent) {
      body.cancelledAt = cancelledAtInput ? new Date(cancelledAtInput).toISOString() : null;
    }

    if (Object.keys(body).length === 0) {
      toast("Değişiklik yok");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Hata oluştu");
      onSaved({
        id: j.subscription.id,
        status: j.subscription.status,
        billingCycle: j.subscription.billingCycle,
        currentPeriodEnd: j.subscription.currentPeriodEnd,
        cancelledAt: j.subscription.cancelledAt,
      });
      toast.success("Abonelik güncellendi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  const fieldLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: ".1em",
    textTransform: "uppercase",
    color: "var(--poster-ink-3)",
    fontFamily: "var(--font-display)",
    marginBottom: 6,
  };

  return (
    <PModal open onClose={onClose} title="Abonelik Manuel Düzenle" width={460}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1.5px dashed var(--poster-pink)",
            background: "color-mix(in srgb, var(--poster-pink) 8%, transparent)",
            fontFamily: "var(--font-display)",
            fontSize: 12,
            color: "var(--poster-ink-2)",
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: "var(--poster-ink)" }}>Bu işlem iyzico&apos;da değişiklik yapmaz.</strong> Yalnızca yerel DB durumunu düzeltir. Plan değiştirmek için &quot;Yönet&quot; modal&apos;ını kullanın.
        </div>

        <div>
          <p style={fieldLabel}>Plan</p>
          <PBadge color={PLAN_COLOR[sub.plan.type]}>{PLAN_LABEL[sub.plan.type]}</PBadge>
        </div>

        <div>
          <p style={fieldLabel}>Durum</p>
          <PSelect value={status} onChange={(e) => setStatus(e.target.value as SubscriptionStatus)} style={{ width: "100%" }}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PENDING">PENDING</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="EXPIRED">EXPIRED</option>
          </PSelect>
        </div>

        <div>
          <p style={fieldLabel}>Fatura Döngüsü</p>
          <PSelect value={billing} onChange={(e) => setBilling(e.target.value as BillingCycle)} style={{ width: "100%" }}>
            <option value="MONTHLY">Aylık</option>
            <option value="YEARLY">Yıllık</option>
          </PSelect>
        </div>

        <div>
          <p style={fieldLabel}>Bitiş Tarihi</p>
          <PInput type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} style={{ width: "100%" }} />
        </div>

        <div>
          <p style={fieldLabel}>İptal Tarihi (opsiyonel)</p>
          <div style={{ display: "flex", gap: 6 }}>
            <PInput type="date" value={cancelledAt} onChange={(e) => setCancelledAt(e.target.value)} style={{ flex: 1 }} />
            {cancelledAt && (
              <PBtn onClick={() => setCancelledAt("")} variant="white" size="md">
                Temizle
              </PBtn>
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <PBtn onClick={onClose} variant="white" size="md">
            İptal
          </PBtn>
          <PBtn onClick={handleSave} disabled={saving} variant="accent" size="md">
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </PBtn>
        </div>
      </div>
    </PModal>
  );
}

function SubscriptionPanel({
  subs,
  active,
  userId,
  onSubUpdated,
}: {
  subs: SubscriptionRow[];
  active: SubscriptionRow | null;
  userId: string;
  onSubUpdated: (sub: Pick<SubscriptionRow, "id" | "status" | "billingCycle" | "currentPeriodEnd" | "cancelledAt">) => void;
}) {
  const [editing, setEditing] = useState<SubscriptionRow | null>(null);
  // En yeni sub override hedefi (status fark etmez). API zaten "en son sub"u alır.
  const editTarget = subs[0] ?? null;

  if (subs.length === 0) {
    return (
      <PEmptyState
        icon="📭"
        title="Abonelik kaydı yok"
        subtitle="Bu kullanıcı için Subscription tablosunda kayıt bulunamadı. Önce 'Yönet' modal'ından plan atayın."
      />
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {active && (
        <PCard rounded={16} style={{ padding: 18, borderLeft: "6px solid var(--poster-accent)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <p style={{ ...sectionLabel, marginBottom: 0 }}>Aktif Abonelik</p>
            <PBtn onClick={() => setEditing(active)} variant="white" size="sm">
              Manuel Düzenle
            </PBtn>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <KV label="Plan" value={<PBadge color={PLAN_COLOR[active.plan.type]}>{PLAN_LABEL[active.plan.type]}</PBadge>} />
            <KV label="Fatura" value={active.billingCycle === "MONTHLY" ? "Aylık" : "Yıllık"} />
            <KV label="Bitiş" value={fmtDate(active.currentPeriodEnd)} />
            <KV label="Durum" value={<PBadge color={SUB_STATUS_COLOR[active.status]}>{active.status}</PBadge>} />
            {active.iyzicoSubscriptionRef && (
              <KV label="iyzico Sub Ref" value={<code style={{ fontSize: 11 }}>{active.iyzicoSubscriptionRef}</code>} />
            )}
            {active.iyzicoCustomerRef && (
              <KV label="iyzico Müşteri" value={<code style={{ fontSize: 11 }}>{active.iyzicoCustomerRef}</code>} />
            )}
          </div>
        </PCard>
      )}

      {!active && editTarget && (
        <PCard rounded={16} style={{ padding: 18, borderLeft: "6px solid var(--poster-pink)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <p style={{ ...sectionLabel, marginBottom: 4 }}>Aktif Abonelik Yok</p>
              <p style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 13, color: "var(--poster-ink-2)" }}>
                En son kayıt: <PBadge color={SUB_STATUS_COLOR[editTarget.status]}>{editTarget.status}</PBadge> · {fmtDate(editTarget.currentPeriodEnd)}
              </p>
            </div>
            <PBtn onClick={() => setEditing(editTarget)} variant="white" size="sm">
              Manuel Düzenle
            </PBtn>
          </div>
        </PCard>
      )}

      {editing && (
        <SubscriptionOverrideModal
          sub={editing}
          userId={userId}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            onSubUpdated(updated);
            setEditing(null);
          }}
        />
      )}

      <PCard rounded={16} style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "2px solid var(--poster-ink)", background: "var(--poster-bg-2)" }}>
          <p style={{ ...sectionLabel, marginBottom: 0 }}>Abonelik Geçmişi</p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Plan</th>
                <th style={th}>Durum</th>
                <th style={th}>Fatura</th>
                <th style={th}>Bitiş</th>
                <th style={th}>İptal</th>
                <th style={th}>Oluşturma</th>
                <th style={th}>iyzico Ref</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s, idx) => (
                <tr key={s.id} style={{ background: idx % 2 === 0 ? "var(--poster-panel)" : "var(--poster-bg-2)", borderTop: "1.5px dashed var(--poster-ink-faint)" }}>
                  <td style={td}>
                    <PBadge color={PLAN_COLOR[s.plan.type]}>{PLAN_LABEL[s.plan.type]}</PBadge>
                  </td>
                  <td style={td}>
                    <PBadge color={SUB_STATUS_COLOR[s.status]}>{s.status}</PBadge>
                  </td>
                  <td style={td}>{s.billingCycle === "MONTHLY" ? "Aylık" : "Yıllık"}</td>
                  <td style={td}>{fmtDate(s.currentPeriodEnd)}</td>
                  <td style={td}>{fmtDate(s.cancelledAt)}</td>
                  <td style={td}>{fmtDate(s.createdAt)}</td>
                  <td style={{ ...td, fontSize: 11, fontFamily: "monospace", color: "var(--poster-ink-3)" }}>
                    {s.iyzicoSubscriptionRef ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PCard>
    </div>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p style={{ ...sectionLabel, marginBottom: 4 }}>{label}</p>
      <p style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "var(--poster-ink)" }}>{value}</p>
    </div>
  );
}

function CreditsPanel({ txns, balance }: { txns: CreditTxn[]; balance: number }) {
  const earned = txns.filter((t) => t.type === "EARN").reduce((s, t) => s + t.amount, 0);
  const spent = txns.filter((t) => t.type === "SPEND").reduce((s, t) => s + t.amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <PStatCard size="small" label="Mevcut Bakiye" value={balance} valueColor="var(--poster-ink)" countUp={false} noAnimation />
        <PStatCard size="small" label="Kazanılan (Son 50)" value={earned} valueColor="var(--poster-green)" countUp={false} noAnimation />
        <PStatCard size="small" label="Harcanan (Son 50)" value={spent} valueColor="var(--poster-pink)" countUp={false} noAnimation />
      </div>
      <PCard rounded={16} style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "2px solid var(--poster-ink)", background: "var(--poster-bg-2)" }}>
          <p style={{ ...sectionLabel, marginBottom: 0 }}>Son 50 Kredi Hareketi</p>
        </div>
        {txns.length === 0 ? (
          <PEmptyState variant="dashed" size="compact" title="Hiç kredi hareketi yok" />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Tarih</th>
                  <th style={th}>Tür</th>
                  <th style={{ ...th, textAlign: "right" }}>Miktar</th>
                  <th style={th}>Açıklama</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((tx, idx) => (
                  <tr key={tx.id} style={{ background: idx % 2 === 0 ? "var(--poster-panel)" : "var(--poster-bg-2)", borderTop: "1.5px dashed var(--poster-ink-faint)" }}>
                    <td style={{ ...td, whiteSpace: "nowrap", color: "var(--poster-ink-2)" }}>{fmtDate(tx.createdAt)}</td>
                    <td style={td}>
                      <PBadge color={tx.type === "EARN" ? "accent" : "pink"}>{tx.type === "EARN" ? "+ Kazanç" : "− Harcama"}</PBadge>
                    </td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: tx.type === "EARN" ? "var(--poster-green)" : "var(--poster-danger)" }}>
                      {tx.type === "EARN" ? "+" : "−"}
                      {tx.amount.toLocaleString("tr-TR")}
                    </td>
                    <td style={{ ...td, color: "var(--poster-ink-2)" }}>{tx.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PCard>
    </div>
  );
}

function UsagePanel({ usage }: { usage: UserDetail["apiUsage"] }) {
  const maxDaily = useMemo(() => usage.daily.reduce((m, d) => Math.max(m, d.cost), 0), [usage.daily]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <PStatCard size="small" label="Toplam Maliyet (30g)" value={`$${usage.totals.cost.toFixed(4)}`} valueColor="var(--poster-green)" countUp={false} noAnimation />
        <PStatCard size="small" label="Toplam Çağrı" value={usage.totals.calls} valueColor="var(--poster-ink)" countUp={false} noAnimation />
        <PStatCard
          size="small"
          label="Cache Hit"
          value={`${(usage.totals.cacheHitRate * 100).toFixed(1)}%`}
          valueColor="var(--poster-blue)"
          sub={`${usage.totals.cacheReadTokens.toLocaleString("tr-TR")} okuma`}
          countUp={false}
          noAnimation
        />
        <PStatCard
          size="small"
          label="Token (in/out)"
          value={`${(usage.totals.inputTokens + usage.totals.cacheWriteTokens).toLocaleString("tr-TR")}`}
          sub={`${usage.totals.outputTokens.toLocaleString("tr-TR")} çıktı`}
          valueColor="var(--poster-accent)"
          countUp={false}
          noAnimation
        />
      </div>

      <PCard rounded={16} style={{ padding: 18 }}>
        <p style={sectionLabel}>Günlük Maliyet (Son 30 gün)</p>
        {usage.daily.length === 0 ? (
          <PEmptyState variant="dashed" size="compact" title="Bu dönemde API kullanımı yok" />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 4,
              height: 140,
              padding: "0 4px",
              borderLeft: "2px solid var(--poster-ink-faint)",
              borderBottom: "2px solid var(--poster-ink-faint)",
            }}
          >
            {usage.daily.map((d) => {
              const pct = maxDaily > 0 ? d.cost / maxDaily : 0;
              return (
                <div key={d.date} style={{ flex: 1, minWidth: 6, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div
                    title={`${d.date} · $${d.cost.toFixed(4)} · ${d.calls} çağrı`}
                    style={{
                      width: "100%",
                      height: `${Math.max(pct * 100, 2)}%`,
                      background: "var(--poster-green)",
                      border: "1.5px solid var(--poster-ink)",
                      borderRadius: "4px 4px 0 0",
                      cursor: "help",
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
        <p style={{ margin: "10px 0 0", fontSize: 11, color: "var(--poster-ink-3)", fontFamily: "var(--font-display)" }}>
          Bara hover ederek günlük maliyet ve çağrı sayısı görüntülenir.
        </p>
      </PCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
        <PCard rounded={16} style={{ padding: 18 }}>
          <p style={sectionLabel}>Endpoint Dağılımı</p>
          {usage.endpoints.length === 0 ? (
            <PEmptyState variant="dashed" size="compact" title="—" />
          ) : (
            <BreakdownList rows={usage.endpoints.map((e) => ({ label: e.endpoint ?? "—", cost: e.cost, calls: e.calls }))} totalCost={usage.totals.cost} />
          )}
        </PCard>

        <PCard rounded={16} style={{ padding: 18 }}>
          <p style={sectionLabel}>Model Dağılımı</p>
          {usage.models.length === 0 ? (
            <PEmptyState variant="dashed" size="compact" title="—" />
          ) : (
            <BreakdownList rows={usage.models.map((m) => ({ label: m.model ?? "—", cost: m.cost, calls: m.calls }))} totalCost={usage.totals.cost} />
          )}
        </PCard>
      </div>
    </div>
  );
}

function BreakdownList({ rows, totalCost }: { rows: Array<{ label: string; cost: number; calls: number }>; totalCost: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((r) => {
        const pct = totalCost > 0 ? (r.cost / totalCost) * 100 : 0;
        return (
          <div key={r.label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontFamily: "var(--font-display)", fontSize: 12 }}>
              <span style={{ fontWeight: 700, color: "var(--poster-ink)" }}>{r.label}</span>
              <span style={{ color: "var(--poster-ink-3)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                ${r.cost.toFixed(4)} · {r.calls}
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "var(--poster-bg-2)", border: "1.5px solid var(--poster-ink-faint)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "var(--poster-accent)" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StudentsPanel({ students }: { students: StudentRow[] }) {
  if (students.length === 0) {
    return <PEmptyState icon="🧒" title="Henüz öğrenci yok" />;
  }
  return (
    <PCard rounded={16} style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Ad</th>
              <th style={th}>Çalışma Alanı</th>
              <th style={th}>Tanı</th>
              <th style={{ ...th, textAlign: "center" }}>Randevu</th>
              <th style={{ ...th, textAlign: "center" }}>Atama</th>
              <th style={{ ...th, textAlign: "center" }}>İlerleme</th>
              <th style={th}>Kayıt</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, idx) => (
              <tr key={s.id} style={{ background: idx % 2 === 0 ? "var(--poster-panel)" : "var(--poster-bg-2)", borderTop: "1.5px dashed var(--poster-ink-faint)" }}>
                <td style={{ ...td, fontWeight: 700 }}>{s.name}</td>
                <td style={td}>{WORK_AREA_LABEL[s.workArea] ?? s.workArea}</td>
                <td style={{ ...td, color: "var(--poster-ink-2)" }}>{s.diagnosis ?? "—"}</td>
                <td style={{ ...td, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{s._count.lessons}</td>
                <td style={{ ...td, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{s._count.assignments}</td>
                <td style={{ ...td, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{s._count.progress}</td>
                <td style={{ ...td, color: "var(--poster-ink-2)" }}>{fmtDate(s.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PCard>
  );
}

function LessonsPanel({ lessons }: { lessons: LessonRow[] }) {
  if (lessons.length === 0) {
    return <PEmptyState icon="📅" title="Henüz randevu yok" />;
  }
  return (
    <PCard rounded={16} style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Tarih</th>
              <th style={th}>Saat</th>
              <th style={th}>Başlık</th>
              <th style={th}>Öğrenci</th>
              <th style={th}>Durum</th>
              <th style={{ ...th, textAlign: "center" }}>Tekrar</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((l, idx) => (
              <tr key={l.id} style={{ background: idx % 2 === 0 ? "var(--poster-panel)" : "var(--poster-bg-2)", borderTop: "1.5px dashed var(--poster-ink-faint)" }}>
                <td style={{ ...td, whiteSpace: "nowrap", color: "var(--poster-ink-2)" }}>{fmtDate(l.date)}</td>
                <td style={{ ...td, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                  {l.startTime}–{l.endTime}
                </td>
                <td style={{ ...td, fontWeight: 700 }}>{l.title}</td>
                <td style={td}>{l.student.name}</td>
                <td style={td}>
                  <PBadge color={LESSON_STATUS_COLOR[l.status]}>{LESSON_STATUS_LABEL[l.status]}</PBadge>
                </td>
                <td style={{ ...td, textAlign: "center" }}>{l.isRecurring ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PCard>
  );
}

function AuditPanel({ logs, userId }: { logs: AuditLogRow[]; userId: string }) {
  if (logs.length === 0) {
    return <PEmptyState icon="📜" title="Audit kaydı yok" subtitle="Bu kullanıcı henüz hassas bir eyleme dahil olmamış." />;
  }
  return (
    <PCard rounded={16} style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "2px solid var(--poster-ink)", background: "var(--poster-bg-2)" }}>
        <p style={{ ...sectionLabel, marginBottom: 0 }}>Son 50 Audit Kaydı</p>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--poster-ink-3)", fontFamily: "var(--font-display)" }}>
          Bu kullanıcı target ya da actor olarak yer aldığı tüm kayıtlar.
        </p>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {logs.map((log, idx) => {
          const actorIsThis = log.actorId === userId;
          const targetIsThis = log.targetType === "therapist" && log.targetId === userId;
          return (
            <li
              key={log.id}
              style={{
                padding: "12px 18px",
                borderTop: idx === 0 ? "none" : "1.5px dashed var(--poster-ink-faint)",
                background: idx % 2 === 0 ? "var(--poster-panel)" : "var(--poster-bg-2)",
                fontFamily: "var(--font-display)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: "var(--poster-ink)", fontSize: 13 }}>
                      {AUDIT_ACTION_LABEL[log.action] ?? log.action}
                    </span>
                    <code style={{ fontSize: 10, color: "var(--poster-ink-3)", padding: "2px 6px", borderRadius: 6, background: "var(--poster-bg-2)", border: "1px solid var(--poster-ink-faint)" }}>
                      {log.action}
                    </code>
                    {targetIsThis && <PBadge color="blue">target</PBadge>}
                    {actorIsThis && <PBadge color="accent">actor</PBadge>}
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--poster-ink-3)", fontWeight: 600 }}>
                    {fmtDateLong(log.createdAt)}
                    {log.actorId && !actorIsThis && (
                      <>
                        {" · "}actor: <code style={{ fontSize: 10 }}>{log.actorId.slice(0, 8)}…</code>
                      </>
                    )}
                    {log.actorId === null && " · sistem"}
                    {log.ip && <> · IP: <code style={{ fontSize: 10 }}>{log.ip}</code></>}
                  </p>
                </div>
                {log.diff != null && (
                  <details style={{ flexBasis: "100%", marginTop: 4 }}>
                    <summary style={{ fontSize: 11, color: "var(--poster-ink-3)", cursor: "pointer", fontWeight: 700 }}>diff</summary>
                    <pre
                      style={{
                        margin: "6px 0 0",
                        padding: 10,
                        fontSize: 11,
                        background: "var(--poster-bg-2)",
                        border: "1.5px dashed var(--poster-ink-faint)",
                        borderRadius: 8,
                        overflow: "auto",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {JSON.stringify(log.diff, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </PCard>
  );
}
