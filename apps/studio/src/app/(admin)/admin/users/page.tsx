"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search, Filter, MoreVertical } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { PBtn, PCard, PBadge, PInput, PSelect, PSpinner } from "@/components/poster";
import { ManageUserModal } from "@/components/admin/ManageUserModal";
import { AdminNav } from "@/components/admin/AdminNav";
import { buildCsv, downloadCsv } from "@/lib/csv";

type PlanType = "FREE" | "PRO" | "ADVANCED" | "ENTERPRISE";
type BillingCycle = "MONTHLY" | "YEARLY";

interface Subscription {
  currentPeriodEnd: string;
  billingCycle: BillingCycle;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  specialty: string[];
  role: string;
  planType: PlanType;
  credits: number;
  studentLimit: number;
  pdfEnabled: boolean;
  suspended: boolean;
  lastLogin: string | null;
  supportAccessExpiresAt: string | null;
  createdAt: string;
  subscriptions: Subscription[];
  _count: { students: number; cards: number; lessons: number };
  cardStats?: Record<string, number>;
  monthlyUsageUsd?: number;
  monthlyApiCalls?: number;
}

interface PlanCount {
  planType: PlanType;
  _count: { _all: number };
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

function fmtDate(str: string | null | undefined) {
  if (!str) return "—";
  return formatDate(new Date(str), "short");
}

function activeSub(u: UserRow): Subscription | null {
  return u.subscriptions?.[0] ?? null;
}

function ActionDropdown({
  user,
  currentUserId,
  onManage,
  onToggleRole,
  onToggleSuspend,
  onDelete,
}: {
  user: UserRow;
  currentUserId: string;
  onManage: () => void;
  onToggleRole: () => void;
  onToggleSuspend: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isSelf = user.id === currentUserId;

  // Menü body'ye portal'lanıyor (parent overflow:hidden tarafından kesilmesin
  // diye). Konumu butonun viewport rect'inden hesaplıyoruz; scroll/resize'da
  // kapatıyoruz — pozisyonu canlı yeniden hesaplamak yerine kapatmak basit
  // ve dropdown deneyimine uygun.
  useEffect(() => {
    if (!open) return;
    function place() {
      const b = btnRef.current?.getBoundingClientRect();
      if (!b) return;
      setPos({ top: b.bottom + 6, right: window.innerWidth - b.right });
    }
    place();
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onScrollOrResize() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  const item: React.CSSProperties = {
    display: "flex",
    width: "100%",
    textAlign: "left",
    padding: "10px 14px",
    fontSize: 13,
    fontFamily: "var(--font-display)",
    background: "transparent",
    border: "none",
    color: "var(--poster-ink)",
    cursor: "pointer",
    fontWeight: 600,
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
      <PBtn onClick={onManage} variant="white" size="sm">
        Yönet
      </PBtn>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          border: "2px solid var(--poster-ink)",
          background: "var(--poster-panel)",
          color: "var(--poster-ink)",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          boxShadow: "var(--poster-shadow-sm)",
        }}
      >
        <MoreVertical style={{ width: 14, height: 14 }} />
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: pos.top,
            right: pos.right,
            minWidth: 210,
            background: "var(--poster-panel)",
            border: "2px solid var(--poster-ink)",
            borderRadius: 12,
            boxShadow: "var(--poster-shadow-lg)",
            overflow: "hidden",
            zIndex: 1000,
          }}
        >
          {!isSelf && (
            <>
              <button type="button" style={item} onClick={() => { setOpen(false); onToggleRole(); }}>
                {user.role === "admin" ? "Admin'den Çıkar" : "Admin Yap"}
              </button>
              <button
                type="button"
                style={{ ...item, color: user.suspended ? "var(--poster-green)" : "#b7791f", borderTop: "1.5px dashed var(--poster-ink-faint)" }}
                onClick={() => { setOpen(false); onToggleSuspend(); }}
              >
                {user.suspended ? "Askıyı Kaldır" : "Hesabı Askıya Al"}
              </button>
              <button
                type="button"
                style={{ ...item, color: "var(--poster-danger)", borderTop: "1.5px dashed var(--poster-ink-faint)" }}
                onClick={() => { setOpen(false); onDelete(); }}
              >
                Hesabı Sil
              </button>
            </>
          )}
          {isSelf && (
            <p style={{ ...item, cursor: "default", color: "var(--poster-ink-3)", fontStyle: "italic" }}>Kendi hesabınız</p>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}

type SortKey = "name" | "planType" | "credits" | "currentPeriodEnd" | "students" | "lastLogin" | "createdAt" | "cards" | "lessons" | "monthlyUsageUsd";
type SortDir = "asc" | "desc";

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [planCounts, setPlanCounts] = useState<PlanCount[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<PlanType | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ADMIN" | "SUSPENDED" | "SUPPORT">("ALL");

  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const [manageUser, setManageUser] = useState<UserRow | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"suspend" | "unsuspend" | "grant-credits" | "revoke-credits">("suspend");
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkRunning, setBulkRunning] = useState(false);

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

    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => {
        setUsers(d.users ?? []);
        setPlanCounts(d.planCounts ?? []);
        setLoading(false);
      });
  }, [session, status, router]);

  async function refreshUsers() {
    const r = await fetch("/api/admin/users");
    const d = await r.json();
    setUsers(d.users ?? []);
    setPlanCounts(d.planCounts ?? []);
  }

  async function runBulk() {
    if (selected.size === 0) {
      toast.error("Önce kullanıcı seçin");
      return;
    }
    const ids = Array.from(selected);
    const isCredit = bulkAction === "grant-credits" || bulkAction === "revoke-credits";
    const amount = isCredit ? parseInt(bulkAmount) : 0;
    if (isCredit && (!amount || amount < 1)) {
      toast.error("Geçerli bir miktar girin");
      return;
    }

    const labels = {
      "suspend": `${ids.length} kullanıcı askıya alınsın mı?`,
      "unsuspend": `${ids.length} kullanıcının askısı kaldırılsın mı?`,
      "grant-credits": `${ids.length} kullanıcıya ${amount} kredi eklensin mi?`,
      "revoke-credits": `${ids.length} kullanıcıdan ${amount} kredi düşülsün mü?`,
    };
    if (!window.confirm(labels[bulkAction])) return;

    setBulkRunning(true);
    try {
      const body: Record<string, unknown> = { action: bulkAction, ids };
      if (isCredit) body.amount = amount;
      if (bulkAction === "revoke-credits" && bulkReason.trim()) body.reason = bulkReason.trim();
      const res = await fetch("/api/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const skipped = data.skipped?.length ?? 0;
      const failed = data.failures?.length ?? 0;
      toast.success(`${data.affected} kullanıcı işlendi${skipped ? `, ${skipped} atlandı` : ""}${failed ? `, ${failed} hata` : ""}`);
      setSelected(new Set());
      setBulkAmount("");
      setBulkReason("");
      await refreshUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setBulkRunning(false);
    }
  }

  function planCount(pt: PlanType) {
    return planCounts.find((p) => p.planType === pt)?._count._all ?? 0;
  }

  function updateUser(id: string, patch: Partial<UserRow>) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    setManageUser((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));
  }

  async function handleToggleRole(user: UserRow) {
    const res = await fetch(`/api/admin/users/${user.id}/role`, { method: "PATCH" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error);
      return;
    }
    updateUser(user.id, { role: data.user.role });
    toast.success(data.user.role === "admin" ? "Admin yapıldı" : "Admin yetkisi alındı");
  }

  async function handleToggleSuspend(user: UserRow) {
    const res = await fetch(`/api/admin/users/${user.id}/suspend`, { method: "PATCH" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error);
      return;
    }
    updateUser(user.id, { suspended: data.user.suspended });
    toast.success(data.user.suspended ? "Hesap askıya alındı" : "Askı kaldırıldı");
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast.success("Hesap silindi");
    } else {
      toast.error((await res.json()).error);
    }
    setDeleting(false);
    setConfirmDel(null);
  }

  const filteredUsers = useMemo(() => {
    let result = [...users];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (filterPlan !== "ALL") result = result.filter((u) => u.planType === filterPlan);
    if (filterStatus === "ADMIN") result = result.filter((u) => u.role === "admin");
    else if (filterStatus === "SUSPENDED") result = result.filter((u) => u.suspended);
    else if (filterStatus === "SUPPORT") {
      const now = Date.now();
      result = result.filter((u) => u.supportAccessExpiresAt && new Date(u.supportAccessExpiresAt).getTime() > now);
    }
    return result;
  }, [users, search, filterPlan, filterStatus]);

  const sortedUsers = useMemo(() => {
    return filteredUsers.sort((a, b) => {
      let valA: any = a[sortKey as keyof UserRow];
      let valB: any = b[sortKey as keyof UserRow];

      if (sortKey === "students") {
        valA = a._count.students;
        valB = b._count.students;
      } else if (sortKey === "cards") {
        valA = a._count.cards;
        valB = b._count.cards;
      } else if (sortKey === "lessons") {
        valA = a._count.lessons || 0;
        valB = b._count.lessons || 0;
      } else if (sortKey === "monthlyUsageUsd") {
        valA = a.monthlyUsageUsd ?? 0;
        valB = b.monthlyUsageUsd ?? 0;
      } else if (sortKey === "currentPeriodEnd") {
        valA = activeSub(a)?.currentPeriodEnd || "0000-00-00";
        valB = activeSub(b)?.currentPeriodEnd || "0000-00-00";
        if (a.role === "admin") valA = "9999-99-99";
        if (b.role === "admin") valB = "9999-99-99";
      }

      if (valA === null) valA = "";
      if (valB === null) valB = "";

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, sortKey, sortDir]);

  const totalItems = sortedUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const currentPage = Math.min(page, totalPages);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return sortedUsers.slice(start, start + perPage);
  }, [sortedUsers, currentPage, perPage]);

  useEffect(() => {
    setPage(1);
  }, [search, filterPlan, filterStatus, perPage]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return <ChevronsUpDown style={{ marginLeft: 4, width: 12, height: 12, opacity: 0.3 }} />;
    return sortDir === "asc" ? (
      <ChevronUp style={{ marginLeft: 4, width: 12, height: 12, color: "var(--poster-accent)" }} />
    ) : (
      <ChevronDown style={{ marginLeft: 4, width: 12, height: 12, color: "var(--poster-accent)" }} />
    );
  };

  const th: React.CSSProperties = {
    textAlign: "left",
    padding: "12px 14px",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: ".1em",
    textTransform: "uppercase",
    color: "var(--poster-ink-2)",
    cursor: "pointer",
    whiteSpace: "nowrap",
    borderBottom: "2px solid var(--poster-ink)",
    background: "var(--poster-bg-2)",
    fontFamily: "var(--font-display)",
  };

  const td: React.CSSProperties = {
    padding: "12px 14px",
    fontSize: 13,
    fontFamily: "var(--font-display)",
    color: "var(--poster-ink)",
  };

  if (loading || status === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <PSpinner size={40} />
      </div>
    );
  }

  const totalMonthlyUsd = users.reduce((sum, u) => sum + (u.monthlyUsageUsd ?? 0), 0);

  const statCards = [
    { label: "Toplam Kullanıcı", value: users.length.toString(), color: "var(--poster-ink)" },
    { label: "Free", value: planCount("FREE").toString(), color: "var(--poster-ink-3)" },
    { label: "Pro", value: planCount("PRO").toString(), color: "var(--poster-blue)" },
    { label: "Advanced", value: planCount("ADVANCED").toString(), color: "var(--poster-accent)" },
    { label: "AI Maliyet (Bu Ay)", value: `$${totalMonthlyUsd.toFixed(2)}`, color: "var(--poster-green)" },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 24px 48px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              color: "var(--poster-ink)",
              fontFamily: "var(--font-display)",
              letterSpacing: "-.02em",
            }}
          >
            Gelişmiş Yönetim
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--poster-ink-2)", fontFamily: "var(--font-display)" }}>
            Sistemdeki tüm terapistleri ve kullanım metriklerini yönetin.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <AdminNav current="/admin/users" />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {statCards.map((card) => (
          <PCard key={card.label} rounded={16} style={{ padding: 16, borderLeft: `6px solid ${card.color}` }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--poster-ink-3)", fontFamily: "var(--font-display)" }}>
              {card.label}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 26, fontWeight: 800, color: card.color, fontFamily: "var(--font-display)" }}>
              {card.value}
            </p>
          </PCard>
        ))}
      </div>

      <PCard rounded={16} style={{ padding: 14, marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", flex: "1 1 280px", minWidth: 240 }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--poster-ink-3)" }} />
            <PInput
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="İsim veya email ile arayın..."
              style={{ paddingLeft: 36 }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Filter style={{ width: 14, height: 14, color: "var(--poster-ink-3)" }} />
            <PSelect value={filterPlan} onChange={(e) => setFilterPlan(e.target.value as any)} style={{ width: "auto", minWidth: 140 }}>
              <option value="ALL">Tüm Planlar</option>
              <option value="FREE">Free</option>
              <option value="PRO">Pro</option>
              <option value="ADVANCED">Advanced</option>
              <option value="ENTERPRISE">Enterprise</option>
            </PSelect>
          </div>

          <PSelect value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} style={{ width: "auto", minWidth: 170 }}>
            <option value="ALL">Tüm Durumlar</option>
            <option value="ADMIN">Sadece Adminler</option>
            <option value="SUSPENDED">Askıya Alınanlar</option>
            <option value="SUPPORT">Aktif Destek İzni</option>
          </PSelect>

          <PSelect value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} style={{ width: "auto", minWidth: 130 }}>
            <option value={10}>10 Göster</option>
            <option value={20}>20 Göster</option>
            <option value={50}>50 Göster</option>
            <option value={100}>100 Göster</option>
          </PSelect>

          <PBtn
            onClick={() => {
              const headers = [
                "Ad", "Email", "Rol", "Plan", "Fatura", "Kredi", "Öğrenci Limiti",
                "PDF", "Askıda", "Öğrenci Sayısı", "Materyal Sayısı", "Randevu Sayısı",
                "Aylık AI ($)", "Aylık API Çağrı", "Son Giriş", "Üyelik Bitiş", "Kayıt",
              ];
              const keys = [
                "name", "email", "role", "planType", "billingCycle", "credits", "studentLimit",
                "pdfEnabled", "suspended", "studentsCount", "cardsCount", "lessonsCount",
                "monthlyUsageUsd", "monthlyApiCalls", "lastLogin", "subEndsAt", "createdAt",
              ];
              const rows = sortedUsers.map((u) => {
                const sub = activeSub(u);
                return {
                  name: u.name,
                  email: u.email,
                  role: u.role,
                  planType: u.planType,
                  billingCycle: sub?.billingCycle ?? "",
                  credits: u.credits,
                  studentLimit: u.studentLimit === -1 ? "sınırsız" : u.studentLimit,
                  pdfEnabled: u.pdfEnabled ? "evet" : "hayır",
                  suspended: u.suspended ? "evet" : "hayır",
                  studentsCount: u._count.students,
                  cardsCount: u._count.cards,
                  lessonsCount: u._count.lessons ?? 0,
                  monthlyUsageUsd: (u.monthlyUsageUsd ?? 0).toFixed(4),
                  monthlyApiCalls: u.monthlyApiCalls ?? 0,
                  lastLogin: u.lastLogin ?? "",
                  subEndsAt: sub?.currentPeriodEnd ?? "",
                  createdAt: u.createdAt,
                };
              });
              const csv = buildCsv(headers, rows, keys);
              const ts = new Date().toISOString().slice(0, 10);
              downloadCsv(`ludenlab-users-${ts}.csv`, csv);
            }}
            variant="white"
            size="md"
          >
            CSV İndir
          </PBtn>
        </div>
      </PCard>

      {selected.size > 0 && (
        <PCard
          rounded={16}
          style={{
            padding: 14,
            marginBottom: 14,
            background: "color-mix(in srgb, var(--poster-accent) 8%, var(--poster-panel))",
            borderLeft: "6px solid var(--poster-accent)",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--poster-ink)" }}>
              {selected.size} seçili
            </span>
            <PBtn onClick={() => setSelected(new Set())} variant="white" size="sm">
              Temizle
            </PBtn>
            <span style={{ color: "var(--poster-ink-3)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12 }}>·</span>
            <PSelect
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value as typeof bulkAction)}
              style={{ width: "auto", minWidth: 180 }}
            >
              <option value="suspend">Askıya Al</option>
              <option value="unsuspend">Askıyı Kaldır</option>
              <option value="grant-credits">Kredi Ekle</option>
              <option value="revoke-credits">Kredi Geri Al</option>
            </PSelect>
            {(bulkAction === "grant-credits" || bulkAction === "revoke-credits") && (
              <PInput
                type="number"
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
                placeholder="Miktar"
                min={1}
                style={{ width: 100 }}
              />
            )}
            {bulkAction === "revoke-credits" && (
              <PInput
                type="text"
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                placeholder="Sebep (opsiyonel)"
                maxLength={200}
                style={{ flex: "1 1 200px", minWidth: 180 }}
              />
            )}
            <PBtn onClick={runBulk} disabled={bulkRunning} variant="accent" size="md">
              {bulkRunning ? "Çalışıyor..." : "Uygula"}
            </PBtn>
          </div>
        </PCard>
      )}

      <PCard rounded={18} style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-display)" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 36, cursor: "default" }}>
                  <input
                    type="checkbox"
                    aria-label="Sayfadaki tümünü seç"
                    checked={paginatedUsers.length > 0 && paginatedUsers.every((u) => u.id === session?.user?.id || selected.has(u.id))}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) {
                        for (const u of paginatedUsers) {
                          if (u.id !== session?.user?.id) next.add(u.id);
                        }
                      } else {
                        for (const u of paginatedUsers) next.delete(u.id);
                      }
                      setSelected(next);
                    }}
                    style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--poster-ink)" }}
                  />
                </th>
                <th style={th} onClick={() => toggleSort("name")}>
                  <div style={{ display: "flex", alignItems: "center" }}>Ad / Email <SortIcon columnKey="name" /></div>
                </th>
                <th style={th} onClick={() => toggleSort("planType")}>
                  <div style={{ display: "flex", alignItems: "center" }}>Plan <SortIcon columnKey="planType" /></div>
                </th>
                <th style={th} onClick={() => toggleSort("credits")}>
                  <div style={{ display: "flex", alignItems: "center" }}>Kredi <SortIcon columnKey="credits" /></div>
                </th>
                <th style={th} onClick={() => toggleSort("currentPeriodEnd")}>
                  <div style={{ display: "flex", alignItems: "center" }}>Üyelik Bitiş <SortIcon columnKey="currentPeriodEnd" /></div>
                </th>
                <th style={{ ...th, textAlign: "center" }} onClick={() => toggleSort("cards")}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>Materyal <SortIcon columnKey="cards" /></div>
                </th>
                <th style={{ ...th, textAlign: "center" }} onClick={() => toggleSort("students")}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>Öğrenci <SortIcon columnKey="students" /></div>
                </th>
                <th style={{ ...th, textAlign: "center" }} onClick={() => toggleSort("lessons")}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>Randevu <SortIcon columnKey="lessons" /></div>
                </th>
                <th style={{ ...th, textAlign: "center" }} onClick={() => toggleSort("monthlyUsageUsd")}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>AI Maliyet <SortIcon columnKey="monthlyUsageUsd" /></div>
                </th>
                <th style={th} onClick={() => toggleSort("lastLogin")}>
                  <div style={{ display: "flex", alignItems: "center" }}>Son Giriş <SortIcon columnKey="lastLogin" /></div>
                </th>
                <th style={{ ...th, cursor: "default" }} />
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((u, idx) => {
                const sub = activeSub(u);
                return (
                  <tr
                    key={u.id}
                    style={{
                      background: u.suspended ? "rgba(239, 68, 68, 0.06)" : idx % 2 === 0 ? "var(--poster-panel)" : "var(--poster-bg-2)",
                      borderTop: "1.5px dashed var(--poster-ink-faint)",
                    }}
                  >
                    <td style={{ ...td, width: 36, textAlign: "center" }}>
                      <input
                        type="checkbox"
                        aria-label={`${u.name} seç`}
                        disabled={u.id === session?.user?.id}
                        checked={selected.has(u.id)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(u.id);
                          else next.delete(u.id);
                          setSelected(next);
                        }}
                        style={{
                          width: 16,
                          height: 16,
                          cursor: u.id === session?.user?.id ? "not-allowed" : "pointer",
                          accentColor: "var(--poster-ink)",
                        }}
                      />
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <Link
                          href={`/admin/users/${u.id}`}
                          style={{
                            fontWeight: 700,
                            color: "var(--poster-ink)",
                            textDecoration: "none",
                            borderBottom: "1.5px dashed var(--poster-ink-faint)",
                          }}
                        >
                          {u.name}
                        </Link>
                        {u.role === "admin" && <PBadge color="ink">ADMIN</PBadge>}
                        {u.suspended && <PBadge color="pink">ASKIDA</PBadge>}
                        {u.supportAccessExpiresAt && new Date(u.supportAccessExpiresAt).getTime() > Date.now() && (
                          <PBadge color="accent">DESTEK</PBadge>
                        )}
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--poster-ink-3)", fontWeight: 600 }}>{u.email}</p>
                    </td>
                    <td style={td}>
                      <PBadge color={PLAN_COLOR[u.planType]}>{PLAN_LABEL[u.planType]}</PBadge>
                      {sub && (
                        <p style={{ margin: "4px 0 0", fontSize: 10, fontWeight: 800, letterSpacing: ".08em", color: "var(--poster-ink-3)" }}>
                          {sub.billingCycle === "MONTHLY" ? "AYLIK" : "YILLIK"}
                        </p>
                      )}
                    </td>
                    <td style={td}>
                      <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                        {u.credits.toLocaleString("tr-TR")}
                      </span>
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap", color: "var(--poster-ink-2)" }}>
                      {sub ? fmtDate(sub.currentPeriodEnd) : "—"}
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <span
                        title={
                          Object.entries(u.cardStats || {})
                            .sort((a, b) => b[1] - a[1])
                            .map(([k, v]) => `${TOOL_LABELS[k] || k}: ${v}`)
                            .join("\n") || "Henüz materyal üretilmedi"
                        }
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: 8,
                          background: "color-mix(in srgb, var(--poster-blue) 12%, transparent)",
                          border: "1.5px solid var(--poster-blue)",
                          color: "var(--poster-blue)",
                          fontWeight: 800,
                          fontVariantNumeric: "tabular-nums",
                          cursor: "help",
                        }}
                      >
                        {u._count.cards}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{u._count.students}</span>
                      {u.studentLimit !== -1 && (
                        <span style={{ fontSize: 11, color: "var(--poster-ink-3)", fontWeight: 700 }}> / {u.studentLimit}</span>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: 8,
                          background: "color-mix(in srgb, var(--poster-accent) 12%, transparent)",
                          border: "1.5px solid var(--poster-accent)",
                          color: "var(--poster-accent)",
                          fontWeight: 800,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {u._count.lessons || 0}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <span
                        title={(u.monthlyApiCalls ?? 0) > 0 ? `${u.monthlyApiCalls} API çağrısı` : ""}
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: 8,
                          background: (u.monthlyUsageUsd ?? 0) > 0 ? "color-mix(in srgb, var(--poster-green) 12%, transparent)" : "var(--poster-bg-2)",
                          border: `1.5px solid ${(u.monthlyUsageUsd ?? 0) > 0 ? "var(--poster-green)" : "var(--poster-ink-faint)"}`,
                          color: (u.monthlyUsageUsd ?? 0) > 0 ? "var(--poster-green)" : "var(--poster-ink-3)",
                          fontWeight: 800,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        ${(u.monthlyUsageUsd ?? 0).toFixed(4)}
                      </span>
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap", color: "var(--poster-ink-2)" }}>{fmtDate(u.lastLogin)}</td>
                    <td style={{ ...td, padding: "8px 14px" }}>
                      {confirmDel === u.id ? (
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                          <PBtn onClick={() => setConfirmDel(null)} variant="white" size="sm">
                            İptal
                          </PBtn>
                          <button
                            type="button"
                            onClick={() => handleDelete(u.id)}
                            disabled={deleting}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 10,
                              border: "2px solid var(--poster-ink)",
                              background: "var(--poster-danger)",
                              color: "#fff",
                              fontFamily: "var(--font-display)",
                              fontWeight: 700,
                              fontSize: 12,
                              cursor: "pointer",
                              boxShadow: "2px 2px 0 var(--poster-ink)",
                              opacity: deleting ? 0.5 : 1,
                            }}
                          >
                            {deleting ? "Siliniyor..." : "Sil Onayla"}
                          </button>
                        </div>
                      ) : (
                        <ActionDropdown
                          user={u}
                          currentUserId={session!.user!.id!}
                          onManage={() => setManageUser(u)}
                          onToggleRole={() => handleToggleRole(u)}
                          onToggleSuspend={() => handleToggleSuspend(u)}
                          onDelete={() => setConfirmDel(u.id)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}

              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ ...td, padding: 48, textAlign: "center", color: "var(--poster-ink-3)" }}>
                    {search || filterPlan !== "ALL" || filterStatus !== "ALL"
                      ? "Girilen filtrelere uygun kullanıcı bulunamadı."
                      : "Henüz kayıtlı kullanıcı yok."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              padding: "14px 18px",
              borderTop: "2px solid var(--poster-ink)",
              background: "var(--poster-bg-2)",
            }}
          >
            <div style={{ fontSize: 13, color: "var(--poster-ink-2)", fontFamily: "var(--font-display)" }}>
              Toplam <strong style={{ color: "var(--poster-ink)" }}>{totalItems}</strong> kayıt · Sayfa {currentPage} / {totalPages}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  width: 34,
                  height: 34,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 10,
                  border: "2px solid var(--poster-ink)",
                  background: "var(--poster-panel)",
                  color: "var(--poster-ink)",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  boxShadow: "var(--poster-shadow-sm)",
                  opacity: currentPage === 1 ? 0.5 : 1,
                }}
              >
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNum = currentPage - 2 + i;
                if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                if (pageNum < 1 || pageNum > totalPages) return null;
                const active = currentPage === pageNum;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setPage(pageNum)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      border: "2px solid var(--poster-ink)",
                      background: active ? "var(--poster-ink)" : "var(--poster-panel)",
                      color: active ? "#fff" : "var(--poster-ink)",
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: "pointer",
                      boxShadow: "var(--poster-shadow-sm)",
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  width: 34,
                  height: 34,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 10,
                  border: "2px solid var(--poster-ink)",
                  background: "var(--poster-panel)",
                  color: "var(--poster-ink)",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  boxShadow: "var(--poster-shadow-sm)",
                  opacity: currentPage === totalPages ? 0.5 : 1,
                }}
              >
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}
      </PCard>

      {manageUser && (
        <ManageUserModal
          user={manageUser}
          onClose={() => setManageUser(null)}
          onUpdate={(patch) => updateUser(manageUser.id, patch)}
        />
      )}
    </div>
  );
}
