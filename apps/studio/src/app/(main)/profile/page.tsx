"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Camera, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Link from "next/link";
import { type EarnedBadge } from "@/lib/badges";
import {
  PBtn,
  PCard,
  PBadge,
  PInput,
  PTextarea,
  PLabel,
  PSelect,
  PSwitch,
  PProgress,
  PSpinner,
  PStatCard,
} from "@/components/poster";

function SupportAccessSection() {
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [days, setDays] = useState(1);
  const [reasonInput, setReasonInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile/support-access")
      .then((r) => r.json())
      .then((d) => {
        setActive(!!d.active);
        setExpiresAt(d.expiresAt ?? null);
        setReason(d.reason ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleGrant() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/support-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days, reason: reasonInput.trim() || undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setActive(true);
      setExpiresAt(d.expiresAt);
      setReason(d.reason);
      setReasonInput("");
      toast.success("Destek erişimi izni verildi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke() {
    if (!window.confirm("Destek erişimi iznini iptal etmek istediğinize emin misiniz?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile/support-access", { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "İptal edilemedi");
      }
      setActive(false);
      setExpiresAt(null);
      setReason(null);
      toast.success("Destek erişimi izni iptal edildi");
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

  if (loading) {
    return (
      <div style={{ padding: "20px 0", textAlign: "center" }}>
        <PSpinner size={24} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          padding: "12px 14px",
          borderRadius: 12,
          border: "1.5px dashed var(--poster-ink-faint)",
          background: "var(--poster-bg-2)",
          fontFamily: "var(--font-display)",
          fontSize: 13,
          color: "var(--poster-ink-2)",
          lineHeight: 1.6,
        }}
      >
        Destek talebiniz olduğunda ekibimizin hesabınıza geçici olarak erişebilmesi için bu izni verebilirsiniz. <strong style={{ color: "var(--poster-ink)" }}>İzin olmadan kimse hesabınız üzerinden işlem yapamaz.</strong> İzni dilediğiniz zaman iptal edebilirsiniz; süre sonunda otomatik düşer. Tüm erişimler kayıt altına alınır (Audit log).
      </div>

      {active && expiresAt ? (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            border: "2px solid var(--poster-green)",
            background: "color-mix(in srgb, var(--poster-green) 8%, transparent)",
            fontFamily: "var(--font-display)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--poster-green)" }}>
                Destek Erişimi Aktif
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: "var(--poster-ink)" }}>
                Bitiş: {new Date(expiresAt).toLocaleString("tr-TR")}
              </p>
              {reason && (
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--poster-ink-2)" }}>
                  Sebep: {reason}
                </p>
              )}
            </div>
            <PBtn onClick={handleRevoke} disabled={saving} variant="white" size="sm">
              İptal Et
            </PBtn>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <p style={fieldLabel}>Süre</p>
            <PSelect value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ width: "100%" }}>
              <option value={1}>1 gün</option>
              <option value={3}>3 gün</option>
              <option value={7}>7 gün (max)</option>
            </PSelect>
          </div>
          <div>
            <p style={fieldLabel}>Sebep (opsiyonel)</p>
            <PInput
              type="text"
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="Örn: PDF üretiminde sorun yaşıyorum"
              maxLength={500}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <PBtn onClick={handleGrant} disabled={saving} variant="dark" size="md">
              {saving ? "Veriliyor..." : "İzin Ver"}
            </PBtn>
          </div>
        </div>
      )}
    </div>
  );
}

interface TherapistProfile {
  id: string;
  name: string;
  email: string;
  specialty: string[];
  avatarUrl: string | null;
  institution: string | null;
  phone: string | null;
  experienceYears: string | null;
  certifications: string | null;
  preferences: UserPreferences | null;
  credits: number;
  planType: string;
  createdAt: string;
}

interface UserPreferences {
  defaultSessionDuration: string;
  defaultDifficulty: string;
  defaultTheme: string;
  showInstitutionLogo: boolean;
  emailNotifications: boolean;
}

interface UsageStats {
  thisMonth: { count: number; byToolType: Record<string, number> };
  lastMonth: { count: number };
  allTime: { byToolType: Record<string, number>; total: number };
  topToolThisMonth: string;
  students: number;
  last3Months: { month: string; count: number }[];
}

const SPECIALTY_OPTIONS = [
  { value: "speech-therapist", label: "Dil ve Konuşma Terapisti" },
  { value: "audiologist", label: "Odyolog" },
  { value: "speech-audiology", label: "Odyoloji ve Konuşma Bozuklukları Uzmanı" },
  { value: "other", label: "Diğer" },
];
const PREDEFINED_SPECIALTIES = ["speech-therapist", "audiologist", "speech-audiology"];

const EXPERIENCE_OPTIONS = [
  { value: "", label: "Belirtmek istemiyorum" },
  { value: "0-1", label: "0–1 yıl" },
  { value: "1-3", label: "1–3 yıl" },
  { value: "3-5", label: "3–5 yıl" },
  { value: "5-10", label: "5–10 yıl" },
  { value: "10+", label: "10+ yıl" },
];

const DURATION_OPTIONS = ["20", "30", "40", "45", "60"];
const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Kolay" },
  { value: "medium", label: "Orta" },
  { value: "hard", label: "Zor" },
];
const THEME_OPTIONS = [
  { value: "none", label: "Tema yok" },
  { value: "animals", label: "Hayvanlar" },
  { value: "food", label: "Yiyecekler" },
  { value: "nature", label: "Doğa" },
  { value: "sports", label: "Spor" },
  { value: "school", label: "Okul" },
];

const TOOL_LABELS: Record<string, string> = {
  LEARNING_CARD: "Öğrenme Kartı",
  SOCIAL_STORY: "Sosyal Hikaye",
  ARTICULATION_DRILL: "Artikülasyon",
  HOMEWORK_MATERIAL: "Ev Ödevi",
  WEEKLY_PLAN: "Haftalık Plan",
  SESSION_SUMMARY: "Oturum Özeti",
  MATCHING_GAME: "Kelime Eşleştirme",
  PHONATION_ACTIVITY: "Sesletim",
  COMMUNICATION_BOARD: "İletişim Panosu",
};

const TOOL_COLORS: Record<string, string> = {
  LEARNING_CARD: "var(--poster-blue)",
  SOCIAL_STORY: "var(--poster-yellow)",
  ARTICULATION_DRILL: "var(--poster-accent)",
  HOMEWORK_MATERIAL: "var(--poster-pink)",
  WEEKLY_PLAN: "var(--poster-green)",
  SESSION_SUMMARY: "#4f46e5",
  MATCHING_GAME: "#059669",
  PHONATION_ACTIVITY: "#db2777",
  COMMUNICATION_BOARD: "#7c3aed",
};

const PLAN_LABELS: Record<string, string> = {
  FREE: "Ücretsiz",
  PRO: "Pro",
  ADVANCED: "Gelişmiş",
  ENTERPRISE: "Kurumsal",
};

const DEFAULT_PREFS: UserPreferences = {
  defaultSessionDuration: "45",
  defaultDifficulty: "medium",
  defaultTheme: "none",
  showInstitutionLogo: false,
  emailNotifications: true,
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function compressAndConvert(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function Panel({
  title,
  subtitle,
  children,
  style,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <PCard rounded={20} style={{ padding: 24, background: "var(--poster-panel)", ...style }}>
      <h2
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: "var(--poster-ink)",
          letterSpacing: "-.01em",
          margin: 0,
          fontFamily: "var(--font-display)",
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          style={{
            fontSize: 12,
            color: "var(--poster-ink-3)",
            margin: "2px 0 18px",
            fontFamily: "var(--font-display)",
          }}
        >
          {subtitle}
        </p>
      )}
      {!subtitle && <div style={{ marginBottom: 18 }} />}
      {children}
    </PCard>
  );
}

export default function ProfilePage() {
  const { data: session } = useSession();

  const [profile, setProfile] = useState<TherapistProfile | null>(null);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [badges, setBadges] = useState<EarnedBadge[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [selectedSpec, setSelectedSpec] = useState("");
  const [otherText, setOtherText] = useState("");
  const [institution, setInstitution] = useState("");
  const [phone, setPhone] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [certifications, setCertifications] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarHover, setAvatarHover] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [prefsSaving, setPrefsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [pRes, sRes, bRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/profile/stats"),
          fetch("/api/stats/badges"),
        ]);
        const [pData, sData, bData] = await Promise.all([pRes.json(), sRes.json(), bRes.json()]);
        if (pRes.ok && pData.therapist) {
          const t: TherapistProfile = pData.therapist;
          setProfile(t);
          setName(t.name);
          setAvatarUrl(t.avatarUrl);
          setInstitution(t.institution ?? "");
          setPhone(t.phone ?? "");
          setExperienceYears(t.experienceYears ?? "");
          setCertifications(t.certifications ?? "");
          if (t.preferences) setPrefs({ ...DEFAULT_PREFS, ...t.preferences });
          const spec = t.specialty[0] ?? "";
          if (PREDEFINED_SPECIALTIES.includes(spec)) {
            setSelectedSpec(spec);
          } else if (spec) {
            setSelectedSpec("other");
            setOtherText(spec);
          }
        }
        if (sRes.ok) setStats(sData);
        if (bRes.ok) setBadges(bData.badges ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Sadece JPG, PNG veya WebP yükleyebilirsiniz");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Maksimum dosya boyutu 2MB");
      return;
    }
    setAvatarSaving(true);
    try {
      const dataUrl = await compressAndConvert(file);
      setAvatarUrl(dataUrl);
      const r = await fetch("/api/profile/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast.success("Profil fotoğrafı güncellendi");
    } catch {
      toast.error("Fotoğraf yüklenemedi");
    } finally {
      setAvatarSaving(false);
      e.target.value = "";
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const specialty =
        selectedSpec === "other" && otherText.trim()
          ? [otherText.trim()]
          : selectedSpec
          ? [selectedSpec]
          : [];
      const r = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, specialty, institution, phone, experienceYears, certifications }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success("Profil güncellendi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      toast.error("Yeni şifreler eşleşmiyor");
      return;
    }
    setPwdSaving(true);
    try {
      const r = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success("Şifre güncellendi");
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setPwdSaving(false);
    }
  }

  async function handlePrefsSave(e: React.FormEvent) {
    e.preventDefault();
    setPrefsSaving(true);
    try {
      const r = await fetch("/api/profile/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: prefs }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast.success("Tercihler kaydedildi");
    } catch {
      toast.error("Tercihler kaydedilemedi");
    } finally {
      setPrefsSaving(false);
    }
  }

  const displayName = name || session?.user?.name || "Kullanıcı";
  const specialtyLabel =
    selectedSpec === "other"
      ? otherText
      : SPECIALTY_OPTIONS.find((o) => o.value === selectedSpec)?.label ?? "";

  const thisMonthCount = stats?.thisMonth.count ?? 0;
  const lastMonthCount = stats?.lastMonth.count ?? 0;
  const monthDiff = thisMonthCount - lastMonthCount;
  const allTimeByType = stats?.allTime.byToolType ?? {};
  const allTimeTotal = stats?.allTime.total ?? 0;
  const topToolName = stats?.topToolThisMonth
    ? TOOL_LABELS[stats.topToolThisMonth] ?? stats.topToolThisMonth
    : "—";

  const earnedCount = badges.filter((b) => b.earned).length;

  if (loading) {
    return (
      <div className="poster-scope">
        <PSpinner fullPanel style={{ minHeight: "70vh" }} />
      </div>
    );
  }

  return (
    <div
      className="poster-scope"
      style={{
        minHeight: "100%",
        background: "var(--poster-bg)",
        padding: "clamp(16px, 4vw, 24px) clamp(16px, 4vw, 24px) clamp(32px, 6vw, 48px)",
        fontFamily: "var(--font-display)",
      }}
    >
      <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Hero */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "12px 0 8px" }}>
          <div
            style={{ position: "relative", cursor: "pointer" }}
            onMouseEnter={() => setAvatarHover(true)}
            onMouseLeave={() => setAvatarHover(false)}
            onClick={() => fileRef.current?.click()}
          >
            <div
              style={{
                width: 112,
                height: 112,
                borderRadius: "50%",
                overflow: "hidden",
                border: "3px solid var(--poster-ink)",
                boxShadow: "0 6px 0 var(--poster-ink)",
                background: "var(--poster-panel)",
              }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Profil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--poster-accent)",
                    color: "#fff",
                    fontSize: 32,
                    fontWeight: 800,
                    userSelect: "none",
                  }}
                >
                  {getInitials(displayName)}
                </div>
              )}
            </div>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(14,30,38,.55)",
                opacity: avatarHover || avatarSaving ? 1 : 0,
                transition: "opacity .15s",
              }}
            >
              {avatarSaving ? (
                <Loader2 className="animate-spin" style={{ width: 20, height: 20, color: "#fff" }} />
              ) : (
                <>
                  <Camera style={{ width: 20, height: 20, color: "#fff" }} />
                  <span style={{ fontSize: 10, color: "#fff", fontWeight: 700, marginTop: 2 }}>Değiştir</span>
                </>
              )}
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={handleAvatarFile}
          />
          <div style={{ textAlign: "center" }}>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "var(--poster-ink)",
                margin: 0,
                letterSpacing: "-.02em",
              }}
            >
              {displayName}
            </h1>
            {specialtyLabel && (
              <div style={{ marginTop: 6 }}>
                <PBadge color="accent">{specialtyLabel}</PBadge>
              </div>
            )}
            {profile && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 10 }}>
                <p style={{ fontSize: 12, color: "var(--poster-ink-2)", fontWeight: 600, margin: 0 }}>
                  {PLAN_LABELS[profile.planType] ?? profile.planType} Planı ·{" "}
                  <span style={{ color: "var(--poster-accent)", fontWeight: 800 }}>{profile.credits} Kredi</span>
                </p>
                <PBtn as="a" href="/subscription" variant="white" size="sm">
                  Planı Yükselt / Aboneliği Yönet
                </PBtn>
              </div>
            )}
          </div>
        </div>

        {/* Kişisel Bilgiler */}
        <Panel title="Kişisel Bilgiler">
          <form onSubmit={handleProfileSave} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
              <div>
                <PLabel htmlFor="name" required>Ad Soyad</PLabel>
                <PInput id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Adınız Soyadınız" />
              </div>
              <div>
                <PLabel>E-posta</PLabel>
                <div
                  style={{
                    height: 46,
                    display: "flex",
                    alignItems: "center",
                    padding: "0 14px",
                    background: "var(--poster-bg-2)",
                    border: "2px dashed var(--poster-ink-3)",
                    borderRadius: 12,
                    fontSize: 14,
                    color: "var(--poster-ink-2)",
                  }}
                >
                  {session?.user?.email}
                </div>
              </div>
              <div>
                <PLabel htmlFor="institution">Kurum / Merkez</PLabel>
                <PInput
                  id="institution"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Çalıştığınız kurum adı"
                />
              </div>
              <div>
                <PLabel htmlFor="phone" optional>Telefon</PLabel>
                <PInput id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+90 5XX XXX XX XX" />
              </div>
              <div>
                <PLabel htmlFor="experience">Deneyim Yılı</PLabel>
                <PSelect
                  id="experience"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                >
                  {EXPERIENCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </PSelect>
              </div>
            </div>

            <div>
              <PLabel htmlFor="certs" optional>Lisans / Sertifikalar</PLabel>
              <PTextarea
                id="certs"
                rows={2}
                value={certifications}
                onChange={(e) => setCertifications(e.target.value)}
                placeholder="Lisans, yüksek lisans, sertifika bilgileri..."
              />
            </div>

            <div>
              <PLabel>Uzmanlık Alanı</PLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
                {SPECIALTY_OPTIONS.map((opt) => {
                  const active = selectedSpec === opt.value;
                  return (
                    <div key={opt.value}>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          cursor: "pointer",
                          padding: "10px 12px",
                          background: active ? "var(--poster-bg-2)" : "var(--poster-panel)",
                          border: "2px solid var(--poster-ink)",
                          borderRadius: 12,
                          boxShadow: active ? "0 3px 0 var(--poster-accent)" : "var(--poster-shadow-sm)",
                          transition: "box-shadow .15s, background .15s",
                        }}
                      >
                        <input
                          type="radio"
                          name="specialty"
                          value={opt.value}
                          checked={active}
                          onChange={() => setSelectedSpec(opt.value)}
                          style={{ width: 16, height: 16, accentColor: "var(--poster-accent)" }}
                        />
                        <span style={{ fontSize: 14, color: "var(--poster-ink)", fontWeight: 600 }}>{opt.label}</span>
                      </label>
                      {opt.value === "other" && active && (
                        <div style={{ marginTop: 8, paddingLeft: 4 }}>
                          <PInput
                            value={otherText}
                            onChange={(e) => setOtherText(e.target.value)}
                            placeholder="Uzmanlık alanınızı yazın"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <PBtn type="submit" variant="accent" size="md" disabled={profileSaving}>
                {profileSaving ? "Kaydediliyor…" : "Bilgileri Kaydet"}
              </PBtn>
            </div>
          </form>
        </Panel>

        {/* Kullanım İstatistikleri */}
        {stats && (
          <Panel title="Kullanım İstatistikleri" subtitle={`Toplam ${allTimeTotal} materyal üretildi`}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <PStatCard
                label="Bu Ay"
                value={thisMonthCount}
                size="small"
                noAnimation
                style={{ background: "var(--poster-bg-2)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  {monthDiff > 0 ? (
                    <>
                      <TrendingUp style={{ width: 12, height: 12, color: "var(--poster-green)" }} />
                      <span style={{ fontSize: 10, color: "var(--poster-green)", fontWeight: 700 }}>
                        +{monthDiff} geçen aya göre
                      </span>
                    </>
                  ) : monthDiff < 0 ? (
                    <>
                      <TrendingDown style={{ width: 12, height: 12, color: "var(--poster-danger)" }} />
                      <span style={{ fontSize: 10, color: "var(--poster-danger)", fontWeight: 700 }}>
                        {monthDiff} geçen aya göre
                      </span>
                    </>
                  ) : (
                    <>
                      <Minus style={{ width: 12, height: 12, color: "var(--poster-ink-3)" }} />
                      <span style={{ fontSize: 10, color: "var(--poster-ink-3)" }}>değişim yok</span>
                    </>
                  )}
                </div>
              </PStatCard>
              <PStatCard
                label="Kalan Kredi"
                value={profile?.credits ?? 0}
                valueColor="var(--poster-accent)"
                size="small"
                noAnimation
                style={{ background: "var(--poster-bg-2)" }}
              >
                <div style={{ marginTop: 8 }}>
                  <PProgress value={Math.min(((profile?.credits ?? 0) / 200) * 100, 100)} color="var(--poster-accent)" />
                </div>
              </PStatCard>
              <PStatCard
                label="Aktif Öğrenci"
                value={stats.students}
                valueColor="var(--poster-blue)"
                size="small"
                noAnimation
                style={{ background: "var(--poster-bg-2)" }}
              />
              <PStatCard
                label="En Çok Araç"
                value={topToolName}
                size="small"
                noAnimation
                countUp={false}
                style={{ background: "var(--poster-bg-2)" }}
              />
            </div>

            {allTimeTotal > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--poster-ink-2)",
                    textTransform: "uppercase",
                    letterSpacing: ".1em",
                    margin: 0,
                  }}
                >
                  Araç Dağılımı
                </p>
                {Object.entries(allTimeByType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => {
                    const pct = Math.round((count / allTimeTotal) * 100);
                    const color = TOOL_COLORS[type] ?? "var(--poster-ink-3)";
                    return (
                      <div key={type} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span
                          style={{
                            width: 140,
                            fontSize: 12,
                            color: "var(--poster-ink-2)",
                            fontWeight: 600,
                            flexShrink: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {TOOL_LABELS[type] ?? type}
                        </span>
                        <div style={{ flex: 1 }}>
                          <PProgress value={pct} color={color} />
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--poster-ink-2)",
                            fontWeight: 700,
                            width: 72,
                            textAlign: "right",
                            flexShrink: 0,
                          }}
                        >
                          {count} (%{pct})
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}

            {stats.last3Months.length > 0 && (
              <div>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--poster-ink-2)",
                    textTransform: "uppercase",
                    letterSpacing: ".1em",
                    margin: "0 0 8px",
                  }}
                >
                  Aylık Trend
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  {stats.last3Months.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        textAlign: "center",
                        padding: 12,
                        background: "var(--poster-bg-2)",
                        border: "2px solid var(--poster-ink)",
                        borderRadius: 12,
                        boxShadow: "var(--poster-shadow-sm)",
                      }}
                    >
                      <p style={{ fontSize: 10, color: "var(--poster-ink-3)", margin: 0, fontWeight: 700 }}>{m.month}</p>
                      <p
                        style={{
                          fontSize: 22,
                          fontWeight: 800,
                          color: "var(--poster-ink)",
                          margin: "4px 0 0",
                          letterSpacing: "-.02em",
                        }}
                      >
                        {m.count}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        )}

        {/* Rozetlerim */}
        {badges.length > 0 && (
          <Panel title="Rozetlerim" subtitle={`${earnedCount} / ${badges.length} rozet kazanıldı`}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  style={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    padding: 14,
                    textAlign: "center",
                    background: badge.earned ? "var(--poster-panel)" : "var(--poster-bg-2)",
                    border: "2px solid var(--poster-ink)",
                    borderRadius: 14,
                    boxShadow: badge.earned ? "var(--poster-shadow-sm)" : "none",
                    opacity: badge.earned ? 1 : 0.4,
                    filter: badge.earned ? "none" : "grayscale(1)",
                  }}
                >
                  {badge.earned && (
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "var(--poster-accent)",
                        border: "2px solid var(--poster-ink)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 900,
                      }}
                    >
                      ✓
                    </div>
                  )}
                  <span style={{ fontSize: 36, lineHeight: 1 }}>{badge.emoji}</span>
                  <div>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--poster-ink)",
                        margin: 0,
                        lineHeight: 1.2,
                      }}
                    >
                      {badge.name}
                    </p>
                    <p
                      style={{
                        fontSize: 10,
                        color: "var(--poster-ink-3)",
                        margin: "2px 0 0",
                        lineHeight: 1.35,
                      }}
                    >
                      {badge.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Tercihler */}
        <Panel title="Tercihler">
          <form onSubmit={handlePrefsSave} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              <div>
                <PLabel>Varsayılan Ders Süresi</PLabel>
                <PSelect
                  value={prefs.defaultSessionDuration}
                  onChange={(e) => setPrefs((p) => ({ ...p, defaultSessionDuration: e.target.value }))}
                >
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} dk
                    </option>
                  ))}
                </PSelect>
              </div>
              <div>
                <PLabel>Varsayılan Zorluk Seviyesi</PLabel>
                <PSelect
                  value={prefs.defaultDifficulty}
                  onChange={(e) => setPrefs((p) => ({ ...p, defaultDifficulty: e.target.value }))}
                >
                  {DIFFICULTY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </PSelect>
              </div>
              <div>
                <PLabel>Varsayılan Tema</PLabel>
                <PSelect
                  value={prefs.defaultTheme}
                  onChange={(e) => setPrefs((p) => ({ ...p, defaultTheme: e.target.value }))}
                >
                  {THEME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </PSelect>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(
                [
                  {
                    key: "showInstitutionLogo" as const,
                    label: "PDF'lerde Kurum Logosu Göster",
                    desc: "İleride PDF çıktılarına kurum logosu eklensin",
                  },
                  {
                    key: "emailNotifications" as const,
                    label: "E-posta Bildirimleri",
                    desc: "Haftalık özet e-postası al",
                  },
                ] as const
              ).map(({ key, label, desc }) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "12px 14px",
                    background: "var(--poster-panel)",
                    border: "2px solid var(--poster-ink)",
                    borderRadius: 14,
                    boxShadow: "var(--poster-shadow-sm)",
                  }}
                >
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--poster-ink)", margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 12, color: "var(--poster-ink-3)", margin: "2px 0 0" }}>{desc}</p>
                  </div>
                  <PSwitch
                    checked={prefs[key] as boolean}
                    onChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))}
                  />
                </div>
              ))}
            </div>

            <div>
              <PBtn type="submit" variant="accent" size="md" disabled={prefsSaving}>
                {prefsSaving ? "Kaydediliyor…" : "Tercihleri Kaydet"}
              </PBtn>
            </div>
          </form>
        </Panel>

        {/* Şifre Değiştir */}
        <Panel title="Şifre Değiştir">
          <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <PLabel htmlFor="currentPwd" required>Mevcut Şifre</PLabel>
              <PInput
                id="currentPwd"
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <div>
                <PLabel htmlFor="newPwd" required>Yeni Şifre</PLabel>
                <PInput
                  id="newPwd"
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="En az 8 karakter"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <PLabel htmlFor="confirmPwd" required>Yeni Şifre Tekrar</PLabel>
                <PInput
                  id="confirmPwd"
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div>
              <PBtn type="submit" variant="dark" size="md" disabled={pwdSaving}>
                {pwdSaving ? "Değiştiriliyor…" : "Şifreyi Değiştir"}
              </PBtn>
            </div>
          </form>
        </Panel>

        {/* Destek Erişimi (KVKK consent) */}
        <Panel title="Destek Erişimi">
          <SupportAccessSection />
        </Panel>
      </div>
    </div>
  );
}

