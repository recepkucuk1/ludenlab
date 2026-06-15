"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toInputDate, formatDate } from "@/lib/utils";
import type { GeneratedCard } from "@/lib/prompts";
import {
  WORK_AREA_LABEL,
  DIFFICULTY_LABEL,
  CARD_STATUS_LABEL,
  calcAge,
  getCategoryBadge,
  getDifficultyBadge,
} from "@/lib/constants";
import { ProgressTab } from "@/components/students/ProgressTab";
import { CurriculumPicker } from "@/components/students/CurriculumPicker";
import { Markdown } from "@/components/Md";
import { SwipeableCard } from "@/components/SwipeableCard";
import {
  PBtn,
  PCard,
  PBadge,
  PModal,
  PInput,
  PTextarea,
  PLabel,
  PAlert,
  PSpinner,
} from "@/components/poster";

function parseProfileSections(text: string): { title: string; content: string }[] {
  const result: { title: string; content: string }[] = [];
  let current: { title: string; content: string } | null = null;
  for (const line of text.split("\n")) {
    if (line.startsWith("## ")) {
      if (current) result.push(current);
      current = { title: line.slice(3).trim(), content: "" };
    } else if (current) {
      current.content += line + "\n";
    }
  }
  if (current) result.push(current);
  return result;
}

const WORK_AREAS = [
  { value: "speech", label: "Konuşma", icon: "🗣️" },
  { value: "language", label: "Dil", icon: "📚" },
  { value: "hearing", label: "İşitme", icon: "👂" },
];

import type { BadgeColor } from "@/components/poster";

interface StudentCard {
  id: string;
  title: string;
  category: string | null;
  difficulty: string;
  ageGroup: string;
  content: GeneratedCard;
  createdAt: string;
}

interface AssignedCard {
  id: string;
  status: string;
  assignedAt: string;
  card: {
    id: string;
    title: string;
    category: string | null;
    difficulty: string;
    ageGroup: string;
    createdAt: string;
  };
}

interface Student {
  id: string;
  name: string;
  birthDate: string | null;
  workArea: string;
  diagnosis: string | null;
  notes: string | null;
  curriculumIds: string[];
  aiProfile: string | null;
  createdAt: string;
  cards: StudentCard[];
  assignments: AssignedCard[];
}

function dangerButtonStyle(disabled = false): React.CSSProperties {
  return {
    flex: 1,
    height: 40,
    padding: "0 14px",
    background: "var(--poster-danger)",
    color: "#fff",
    border: "2px solid var(--poster-ink)",
    borderRadius: 12,
    boxShadow: "0 3px 0 var(--poster-ink)",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
    opacity: disabled ? 0.6 : 1,
    fontFamily: "var(--font-display)",
  };
}

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [curricula, setCurricula] = useState<{ id: string; area: string; title: string }[]>([]);
  const [editCurriculumIds, setEditCurriculumIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<"cards" | "progress" | "aiProfile">("cards");
  const [generatingProfile, setGeneratingProfile] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [confirmCardId, setConfirmCardId] = useState<string | null>(null);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null);

  const [upcomingLessons, setUpcomingLessons] = useState<{
    id: string; title: string; date: string;
    startTime: string; endTime: string; status: string;
  }[]>([]);

  async function handleGenerateProfile() {
    if (!student) return;
    setGeneratingProfile(true);
    setConfirmRegenerate(false);
    try {
      const res = await fetch(`/api/students/${student.id}/ai-profile`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Hata oluştu");
      setStudent((prev) => prev ? { ...prev, aiProfile: data.aiProfile } : prev);
      toast.success("Eğitim profili oluşturuldu");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Profil oluşturulamadı, tekrar deneyin");
    } finally {
      setGeneratingProfile(false);
    }
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState(false);

  async function handleDeleteStudent() {
    if (!student) return;
    setDeletingStudent(true);
    try {
      const res = await fetch(`/api/students/${student.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Silme başarısız");
      toast.success("Öğrenci silindi");
      router.push("/students");
    } catch {
      toast.error("Bir hata oluştu, tekrar deneyin");
      setDeletingStudent(false);
      setShowDeleteConfirm(false);
    }
  }

  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editWorkArea, setEditWorkArea] = useState("speech");
  const [editDiagnosis, setEditDiagnosis] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function openEdit() {
    if (!student) return;
    setEditName(student.name);
    setEditBirthDate(toInputDate(student.birthDate));
    setEditWorkArea(student.workArea);
    setEditDiagnosis(student.diagnosis ?? "");
    setEditNotes(student.notes ?? "");
    setEditCurriculumIds(student.curriculumIds ?? []);
    setEditError(null);
    setShowEdit(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!student || !editName.trim()) { setEditError("Ad Soyad zorunludur."); return; }
    setEditSubmitting(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName, birthDate: editBirthDate || null,
          workArea: editWorkArea, diagnosis: editDiagnosis, notes: editNotes,
          curriculumIds: editCurriculumIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Hata oluştu");
      setStudent((prev) =>
        prev ? { ...prev, name: editName, birthDate: editBirthDate || null, workArea: editWorkArea, diagnosis: editDiagnosis || null, notes: editNotes || null, curriculumIds: editCurriculumIds } : prev
      );
      toast.success("Değişiklikler kaydedildi");
      setShowEdit(false);
    } catch (err) {
      toast.error("Bir hata oluştu, tekrar deneyin");
      setEditError(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setEditSubmitting(false);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const [sRes, cRes, lRes] = await Promise.all([
          fetch(`/api/students/${id}`),
          fetch("/api/curriculum"),
          fetch(`/api/lessons?studentId=${id}&upcoming=true`),
        ]);
        if (sRes.status === 404) { setNotFound(true); return; }
        const [sData, cData, lData] = await Promise.all([sRes.json(), cRes.json(), lRes.json()]);
        if (!sRes.ok) throw new Error(sData.error || `HTTP ${sRes.status}`);
        setStudent(sData.student);
        setCurricula(cData.curricula ?? []);
        setUpcomingLessons(lData.lessons ?? []);
      } catch (err) {
        console.error("Öğrenci yüklenemedi:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function deleteCard(cardId: string) {
    setDeletingCardId(cardId);
    try {
      const res = await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Silme başarısız");
      setStudent((prev) =>
        prev ? { ...prev, cards: prev.cards.filter((c) => c.id !== cardId) } : prev
      );
      toast.success("Kart silindi");
    } catch {
      toast.error("Bir hata oluştu, tekrar deneyin");
    } finally {
      setDeletingCardId(null);
      setConfirmCardId(null);
    }
  }

  if (loading) {
    return (
      <div className="poster-scope">
        <PSpinner fullPanel size={40} style={{ minHeight: "100%", padding: "80px 20px" }} />
      </div>
    );
  }

  if (notFound || !student) {
    return (
      <div
        className="poster-scope"
        style={{
          minHeight: "100%",
          background: "var(--poster-bg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: "80px 20px",
          fontFamily: "var(--font-display)",
        }}
      >
        <p style={{ color: "var(--poster-ink-2)", fontWeight: 700 }}>Öğrenci bulunamadı.</p>
        <PBtn as="button" variant="white" size="md" onClick={() => router.push("/students")}>
          Öğrencilere Dön
        </PBtn>
      </div>
    );
  }

  return (
    <div
      className="poster-scope"
      style={{
        minHeight: "100%",
        background: "var(--poster-bg)",
        fontFamily: "var(--font-display)",
      }}
    >
      {/* Breadcrumb / action bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "var(--poster-panel)",
          borderBottom: "2px solid var(--poster-ink)",
          padding: "12px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
            <Link href="/students" style={{ color: "var(--poster-ink-2)", textDecoration: "none" }}>
              Öğrenciler
            </Link>
            <span style={{ color: "var(--poster-ink-3)" }}>/</span>
            <span style={{ color: "var(--poster-ink)" }}>{student.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                height: 36,
                padding: "0 14px",
                background: "var(--poster-panel)",
                color: "var(--poster-danger)",
                border: "2px solid var(--poster-danger)",
                borderRadius: 10,
                boxShadow: "0 3px 0 var(--poster-danger)",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "var(--font-display)",
              }}
            >
              Sil
            </button>
            <PBtn as="button" variant="white" size="sm" onClick={openEdit}>
              Düzenle
            </PBtn>
            <PBtn
              as="a"
              href={`/generate?studentId=${student.id}&studentName=${encodeURIComponent(student.name)}&workArea=${student.workArea}${student.birthDate ? `&birthDate=${encodeURIComponent(student.birthDate)}` : ""}`}
              variant="accent"
              size="sm"
            >
              ✨ Kart Üret
            </PBtn>
          </div>
        </div>
      </div>

      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "24px 20px 40px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Info panel */}
        <PCard rounded={18} style={{ padding: 20, background: "var(--poster-panel)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div
              style={{
                width: 64,
                height: 64,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                background: "var(--poster-accent)",
                color: "#fff",
                fontSize: 28,
                fontWeight: 800,
                border: "2px solid var(--poster-ink)",
                boxShadow: "var(--poster-shadow-sm)",
                flexShrink: 0,
              }}
            >
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "var(--poster-ink)",
                  letterSpacing: "-.02em",
                  margin: 0,
                }}
              >
                {student.name}
              </h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                <PBadge color={getCategoryBadge(student.workArea)}>
                  {WORK_AREA_LABEL[student.workArea] ?? student.workArea}
                </PBadge>
                {student.birthDate && <PBadge color="soft">{calcAge(student.birthDate)}</PBadge>}
                {student.diagnosis && <PBadge color="blue">{student.diagnosis}</PBadge>}
              </div>
            </div>
          </div>

          {(student.notes || (student.curriculumIds?.length ?? 0) > 0) && (
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "2px dashed var(--poster-ink-faint)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {student.notes && (
                <div>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: "var(--poster-ink-3)",
                      textTransform: "uppercase",
                      letterSpacing: ".12em",
                      margin: "0 0 4px",
                    }}
                  >
                    Notlar
                  </p>
                  <p style={{ fontSize: 14, color: "var(--poster-ink-2)", margin: 0 }}>{student.notes}</p>
                </div>
              )}
              {(student.curriculumIds?.length ?? 0) > 0 && (
                <div>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: "var(--poster-ink-3)",
                      textTransform: "uppercase",
                      letterSpacing: ".12em",
                      margin: "0 0 6px",
                    }}
                  >
                    Çalışma Modülleri
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {student.curriculumIds?.map((cid) => {
                      const c = curricula.find((x) => x.id === cid);
                      return c ? (
                        <PBadge key={cid} color="accent">
                          {c.title}
                        </PBadge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </PCard>

        {/* Upcoming lessons */}
        {upcomingLessons.length > 0 && (
          <PCard rounded={18} style={{ padding: 16, background: "var(--poster-panel)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: "var(--poster-ink)", margin: 0 }}>
                Yaklaşan Dersler
              </h2>
              <a
                href="/calendar"
                style={{ fontSize: 12, color: "var(--poster-accent)", fontWeight: 700, textDecoration: "underline" }}
              >
                Takvime git →
              </a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {upcomingLessons.map((l) => {
                const dateStr = formatDate(new Date(l.date), "medium");
                const statusTone: BadgeColor =
                  l.status === "COMPLETED" ? "green" : l.status === "CANCELLED" ? "soft" : "blue";
                const statusLabel =
                  l.status === "COMPLETED" ? "Tamamlandı" : l.status === "CANCELLED" ? "İptal" : "Planlandı";
                return (
                  <div
                    key={l.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      background: "var(--poster-bg-2)",
                      border: "2px solid var(--poster-ink-faint)",
                      borderRadius: 12,
                      gap: 8,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--poster-ink)", margin: 0 }}>{l.title}</p>
                      <p style={{ fontSize: 11, color: "var(--poster-ink-3)", margin: "2px 0 0" }}>
                        {dateStr} · {l.startTime}–{l.endTime}
                      </p>
                    </div>
                    <PBadge color={statusTone}>{statusLabel}</PBadge>
                  </div>
                );
              })}
            </div>
          </PCard>
        )}

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            borderBottom: "2px solid var(--poster-ink-faint)",
            paddingLeft: 4,
          }}
        >
          {([
            { key: "cards", label: "Kartlar", count: student.cards.length + student.assignments.length },
            { key: "progress", label: "İlerleme", count: null },
            { key: "aiProfile", label: "Eğitim Profili", count: null },
          ] as const).map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "12px 18px",
                  background: "transparent",
                  border: "none",
                  borderBottom: active ? "3px solid var(--poster-accent)" : "3px solid transparent",
                  marginBottom: -2,
                  fontSize: 13,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  color: active ? "var(--poster-ink)" : "var(--poster-ink-3)",
                  cursor: "pointer",
                  fontFamily: "var(--font-display)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {tab.label}
                {tab.count !== null && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: active ? "var(--poster-accent)" : "var(--poster-ink-faint)",
                      color: active ? "#fff" : "var(--poster-ink-3)",
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Progress tab */}
        {activeTab === "progress" && (
          <ProgressTab
            studentId={student.id}
            curriculumIds={student.curriculumIds ?? []}
            onEditClick={openEdit}
          />
        )}

        {/* AI profile tab */}
        {activeTab === "aiProfile" && (
          <PCard rounded={18} style={{ padding: 20, background: "var(--poster-panel)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 16,
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--poster-ink)", margin: 0 }}>
                  Eğitim Profili
                </h2>
                <p style={{ fontSize: 12, color: "var(--poster-ink-3)", margin: "2px 0 0" }}>
                  AI destekli klinik arka plan ve uzman önerileri · 20 kredi
                </p>
              </div>
              {student.aiProfile && !generatingProfile && (
                <PBtn as="button" variant="white" size="sm" onClick={() => setConfirmRegenerate(true)}>
                  Yeniden Üret
                </PBtn>
              )}
            </div>

            {confirmRegenerate && (
              <div style={{ marginBottom: 16 }}>
                <PAlert tone="warning">
                  <p style={{ margin: "0 0 4px", fontWeight: 800 }}>Mevcut profil silinecek, devam et?</p>
                  <p style={{ margin: "0 0 10px", fontSize: 12 }}>Yeni profil oluşturmak 20 kredi harcar.</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <PBtn as="button" variant="accent" size="sm" onClick={handleGenerateProfile}>
                      Evet, Yeniden Üret
                    </PBtn>
                    <PBtn as="button" variant="white" size="sm" onClick={() => setConfirmRegenerate(false)}>
                      İptal
                    </PBtn>
                  </div>
                </PAlert>
              </div>
            )}

            {!student.aiProfile && !generatingProfile && (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🧠</div>
                <p style={{ fontSize: 14, fontWeight: 800, color: "var(--poster-ink)", margin: "0 0 4px" }}>
                  Henüz eğitim profili oluşturulmadı
                </p>
                <p style={{ fontSize: 12, color: "var(--poster-ink-3)", margin: "0 0 16px" }}>
                  AI, öğrencinin bilgilerine göre klinik arka plan ve uzman önerileri hazırlar.
                </p>
                <PBtn as="button" variant="accent" size="md" onClick={handleGenerateProfile}>
                  ✨ Eğitim Profili Üret
                </PBtn>
              </div>
            )}

            {generatingProfile && (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <PSpinner size={28} label="Profil oluşturuluyor…" style={{ display: "flex" }} />
                <p style={{ fontSize: 11, color: "var(--poster-ink-3)", margin: "4px 0 0" }}>
                  Bu birkaç saniye sürebilir.
                </p>
              </div>
            )}

            {student.aiProfile && !generatingProfile && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {parseProfileSections(student.aiProfile).map((section) => (
                  <div
                    key={section.title}
                    style={{
                      padding: 16,
                      background: "var(--poster-bg-2)",
                      border: "2px solid var(--poster-ink-faint)",
                      borderRadius: 14,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: "var(--poster-ink)",
                        margin: "0 0 10px",
                        textTransform: "uppercase",
                        letterSpacing: ".08em",
                      }}
                    >
                      {section.title}
                    </h3>
                    <Markdown>{section.content.trim()}</Markdown>
                  </div>
                ))}
              </div>
            )}
          </PCard>
        )}

        {/* Cards tab */}
        {activeTab === "cards" && (
          <>
            <section>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "var(--poster-ink)",
                    letterSpacing: "-.02em",
                    margin: 0,
                  }}
                >
                  Öğrenciye Özel Üretilenler
                  <span style={{ marginLeft: 10, fontSize: 13, color: "var(--poster-ink-3)", fontWeight: 700 }}>
                    ({student.cards.length})
                  </span>
                </h2>
              </div>

              {student.cards.length === 0 ? (
                <PCard
                  rounded={18}
                  style={{
                    padding: "48px 20px",
                    textAlign: "center",
                    background: "var(--poster-bg-2)",
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🗂️</div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: "var(--poster-ink)", margin: "0 0 4px" }}>
                    Henüz özel kart üretilmedi
                  </p>
                  <p style={{ fontSize: 13, color: "var(--poster-ink-3)", margin: "0 0 14px" }}>
                    Bu öğrenci için yapay zeka destekli gelişim kartı hazırlamak çok kolay.
                  </p>
                  <PBtn
                    as="a"
                    href={`/generate?studentId=${student.id}&studentName=${encodeURIComponent(student.name)}&workArea=${student.workArea}${student.birthDate ? `&birthDate=${encodeURIComponent(student.birthDate)}` : ""}`}
                    variant="accent"
                    size="sm"
                  >
                    ✨ Kart Üret
                  </PBtn>
                </PCard>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: 14,
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  }}
                >
                  {student.cards.map((card) => (
                    <SwipeableCard
                      key={card.id}
                      id={card.id}
                      openId={swipeOpenId}
                      onOpen={setSwipeOpenId}
                      onClose={() => setSwipeOpenId(null)}
                      onDeletePress={() => {
                        setSwipeOpenId(null);
                        setConfirmCardId(card.id);
                      }}
                    >
                      <PCard
                        rounded={16}
                        style={{
                          position: "relative",
                          background: "var(--poster-panel)",
                          display: "flex",
                          flexDirection: "column",
                          height: "100%",
                          overflow: "hidden",
                        }}
                      >
                        <Link
                          href={`/cards/${card.id}`}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            flex: 1,
                            padding: 16,
                            textDecoration: "none",
                            color: "inherit",
                          }}
                        >
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10, paddingRight: 24 }}>
                            {card.category && WORK_AREA_LABEL[card.category] && (
                              <PBadge color={getCategoryBadge(card.category)}>
                                {WORK_AREA_LABEL[card.category]}
                              </PBadge>
                            )}
                            <PBadge color={getDifficultyBadge(card.difficulty)}>
                              {DIFFICULTY_LABEL[card.difficulty] ?? card.difficulty}
                            </PBadge>
                            <PBadge color="soft">{card.ageGroup}</PBadge>
                          </div>
                          <h3
                            style={{
                              fontSize: 15,
                              fontWeight: 800,
                              color: "var(--poster-ink)",
                              margin: "0 0 6px",
                              lineHeight: 1.3,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {card.title}
                          </h3>
                          {(card.content as GeneratedCard).objective && (
                            <p
                              style={{
                                fontSize: 12,
                                color: "var(--poster-ink-2)",
                                margin: "0 0 8px",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {(card.content as GeneratedCard).objective}
                            </p>
                          )}
                          <div
                            style={{
                              marginTop: "auto",
                              paddingTop: 10,
                              borderTop: "2px dashed var(--poster-ink-faint)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <p
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: "var(--poster-ink-3)",
                                margin: 0,
                                textTransform: "uppercase",
                                letterSpacing: ".1em",
                              }}
                            >
                              {formatDate(card.createdAt, "short")}
                            </p>
                            <span style={{ fontSize: 12, color: "var(--poster-accent)", fontWeight: 800 }}>Aç →</span>
                          </div>
                        </Link>

                        <button
                          type="button"
                          onClick={() => setConfirmCardId(card.id)}
                          style={{
                            position: "absolute",
                            top: 10,
                            right: 10,
                            width: 28,
                            height: 28,
                            border: "2px solid var(--poster-ink)",
                            borderRadius: 8,
                            background: "var(--poster-panel)",
                            boxShadow: "0 2px 0 var(--poster-ink)",
                            color: "var(--poster-danger)",
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: "pointer",
                            zIndex: 2,
                          }}
                        >
                          ✕
                        </button>

                        {confirmCardId === card.id && (
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: "var(--poster-panel)",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 12,
                              padding: 16,
                              zIndex: 5,
                            }}
                          >
                            <p
                              style={{
                                fontSize: 13,
                                fontWeight: 800,
                                color: "var(--poster-ink)",
                                textAlign: "center",
                                margin: 0,
                              }}
                            >
                              Bu kartı silmek istediğinize emin misiniz?
                            </p>
                            <div style={{ display: "flex", gap: 8, width: "100%" }}>
                              <PBtn
                                as="button"
                                variant="white"
                                size="sm"
                                onClick={() => setConfirmCardId(null)}
                                style={{ flex: 1, justifyContent: "center" }}
                              >
                                İptal
                              </PBtn>
                              <button
                                type="button"
                                onClick={() => deleteCard(card.id)}
                                disabled={deletingCardId === card.id}
                                style={dangerButtonStyle(deletingCardId === card.id)}
                              >
                                {deletingCardId === card.id ? "Siliniyor…" : "Evet, Sil"}
                              </button>
                            </div>
                          </div>
                        )}
                      </PCard>
                    </SwipeableCard>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "var(--poster-ink)",
                    letterSpacing: "-.02em",
                    margin: 0,
                  }}
                >
                  Kütüphaneden Atananlar
                  <span style={{ marginLeft: 10, fontSize: 13, color: "var(--poster-ink-3)", fontWeight: 700 }}>
                    ({student.assignments.length})
                  </span>
                </h2>
              </div>

              {student.assignments.length === 0 ? (
                <PCard
                  rounded={18}
                  style={{
                    padding: "48px 20px",
                    textAlign: "center",
                    background: "var(--poster-bg-2)",
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: "var(--poster-ink)", margin: "0 0 4px" }}>
                    Henüz kart atanmadı
                  </p>
                  <p style={{ fontSize: 13, color: "var(--poster-ink-3)", margin: 0 }}>
                    Kart kütüphanesinden bu öğrenciye materyal atayabilirsiniz.
                  </p>
                </PCard>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: 14,
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  }}
                >
                  {student.assignments.map((assignment) => (
                    <PCard
                      key={assignment.id}
                      rounded={16}
                      style={{
                        background: "var(--poster-panel)",
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                        overflow: "hidden",
                      }}
                    >
                      <Link
                        href={`/cards/${assignment.card.id}`}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          padding: "16px 16px 10px",
                          textDecoration: "none",
                          color: "inherit",
                          flex: 1,
                        }}
                      >
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                          {assignment.card.category && WORK_AREA_LABEL[assignment.card.category] && (
                            <PBadge color={getCategoryBadge(assignment.card.category)}>
                              {WORK_AREA_LABEL[assignment.card.category]}
                            </PBadge>
                          )}
                          <PBadge color={getDifficultyBadge(assignment.card.difficulty)}>
                            {DIFFICULTY_LABEL[assignment.card.difficulty] ?? assignment.card.difficulty}
                          </PBadge>
                          <PBadge color="soft">{assignment.card.ageGroup}</PBadge>
                        </div>
                        <h3
                          style={{
                            fontSize: 15,
                            fontWeight: 800,
                            color: "var(--poster-ink)",
                            margin: "0 0 8px",
                            lineHeight: 1.3,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {assignment.card.title}
                        </h3>
                        <p
                          style={{
                            marginTop: "auto",
                            paddingTop: 10,
                            borderTop: "2px dashed var(--poster-ink-faint)",
                            fontSize: 10,
                            fontWeight: 800,
                            color: "var(--poster-ink-3)",
                            textTransform: "uppercase",
                            letterSpacing: ".1em",
                            margin: 0,
                          }}
                        >
                          Atanma: {formatDate(assignment.assignedAt, "short")}
                        </p>
                      </Link>
                      <div
                        style={{
                          padding: "10px 14px 14px",
                          borderTop: "2px dashed var(--poster-ink-faint)",
                        }}
                      >
                        <p
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: "var(--poster-ink-3)",
                            textTransform: "uppercase",
                            letterSpacing: ".12em",
                            textAlign: "center",
                            margin: "0 0 6px",
                          }}
                        >
                          Gelişim Durumu
                        </p>
                        <div
                          style={{
                            display: "flex",
                            gap: 4,
                            padding: 4,
                            background: "var(--poster-bg-2)",
                            border: "2px solid var(--poster-ink-faint)",
                            borderRadius: 10,
                          }}
                        >
                          {(["not_started", "in_progress", "completed"] as const).map((s) => {
                            const active = assignment.status === s;
                            const activeBg =
                              s === "not_started"
                                ? "var(--poster-ink-faint)"
                                : s === "in_progress"
                                  ? "var(--poster-accent)"
                                  : "var(--poster-green)";
                            const activeColor = s === "not_started" ? "var(--poster-ink)" : "#fff";
                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={async () => {
                                  const prev = assignment.status;
                                  setStudent((p) =>
                                    p
                                      ? {
                                          ...p,
                                          assignments: p.assignments.map((a) =>
                                            a.id === assignment.id ? { ...a, status: s } : a
                                          ),
                                        }
                                      : p
                                  );
                                  try {
                                    const res = await fetch(
                                      `/api/cards/assignments/${assignment.id}/status`,
                                      {
                                        method: "PUT",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ status: s }),
                                      }
                                    );
                                    if (!res.ok) throw new Error();
                                    toast.success(`Durum Güncellendi: ${CARD_STATUS_LABEL[s]}`);
                                  } catch {
                                    setStudent((p) =>
                                      p
                                        ? {
                                            ...p,
                                            assignments: p.assignments.map((a) =>
                                              a.id === assignment.id ? { ...a, status: prev } : a
                                            ),
                                          }
                                        : p
                                    );
                                    toast.error("Durum güncellenemedi");
                                  }
                                }}
                                style={{
                                  flex: 1,
                                  padding: "6px 4px",
                                  fontSize: 9,
                                  fontWeight: 800,
                                  textTransform: "uppercase",
                                  letterSpacing: ".08em",
                                  background: active ? activeBg : "transparent",
                                  color: active ? activeColor : "var(--poster-ink-3)",
                                  border: "none",
                                  borderRadius: 6,
                                  cursor: "pointer",
                                  fontFamily: "var(--font-display)",
                                  transition: "background .15s",
                                }}
                              >
                                {CARD_STATUS_LABEL[s]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </PCard>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Delete student modal */}
      <PModal
        open={showDeleteConfirm}
        onClose={() => !deletingStudent && setShowDeleteConfirm(false)}
        title="Öğrenciyi sil"
        width={400}
        footer={
          <>
            <PBtn
              as="button"
              variant="white"
              size="md"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deletingStudent}
            >
              İptal
            </PBtn>
            <button
              type="button"
              onClick={handleDeleteStudent}
              disabled={deletingStudent}
              style={dangerButtonStyle(deletingStudent)}
            >
              {deletingStudent ? "Siliniyor…" : "Evet, Sil"}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: "var(--poster-ink)", margin: "0 0 6px" }}>
          <strong>{student.name}</strong> silinecek.
        </p>
        <p style={{ fontSize: 12, color: "var(--poster-ink-3)", margin: 0 }}>
          Bu işlem geri alınamaz. Tüm kartlar da silinecek.
        </p>
      </PModal>

      {/* Edit modal */}
      <PModal
        open={showEdit}
        onClose={() => !editSubmitting && setShowEdit(false)}
        title="Öğrenci Düzenle"
        width={520}
      >
        <form onSubmit={handleEdit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <PLabel htmlFor="edit-name">Ad Soyad *</PLabel>
            <PInput id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
          </div>
          <div>
            <PLabel htmlFor="edit-birthDate">Doğum Tarihi</PLabel>
            <PInput
              id="edit-birthDate"
              type="date"
              value={editBirthDate}
              onChange={(e) => setEditBirthDate(e.target.value)}
            />
          </div>
          <div>
            <PLabel>Çalışma Alanı *</PLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {WORK_AREAS.map((w) => {
                const active = editWorkArea === w.value;
                return (
                  <button
                    key={w.value}
                    type="button"
                    onClick={() => setEditWorkArea(w.value)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      padding: 10,
                      background: active ? "var(--poster-accent)" : "var(--poster-panel)",
                      color: active ? "#fff" : "var(--poster-ink)",
                      border: "2px solid var(--poster-ink)",
                      borderRadius: 12,
                      boxShadow: active ? "0 3px 0 var(--poster-ink)" : "var(--poster-shadow-sm)",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{w.icon}</span>
                    {w.label}
                  </button>
                );
              })}
            </div>
          </div>
          <CurriculumPicker
            key={editWorkArea}
            curricula={curricula}
            selectedIds={editCurriculumIds}
            onChange={setEditCurriculumIds}
            defaultOpenKey={editWorkArea}
          />
          <div>
            <PLabel htmlFor="edit-diagnosis">Tanı</PLabel>
            <PInput
              id="edit-diagnosis"
              value={editDiagnosis}
              onChange={(e) => setEditDiagnosis(e.target.value)}
              placeholder="Örn: Dil gelişim gecikmesi"
            />
          </div>
          <div>
            <PLabel htmlFor="edit-notes">Notlar</PLabel>
            <PTextarea
              id="edit-notes"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={2}
            />
          </div>
          {editError && <PAlert tone="error">{editError}</PAlert>}
          <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
            <PBtn
              as="button"
              type="submit"
              variant="accent"
              size="md"
              disabled={editSubmitting}
              style={{ flex: 1, justifyContent: "center" }}
            >
              {editSubmitting ? "Kaydediliyor…" : "Kaydet"}
            </PBtn>
            <PBtn
              as="button"
              type="button"
              variant="white"
              size="md"
              onClick={() => setShowEdit(false)}
              style={{ flex: 1, justifyContent: "center" }}
            >
              İptal
            </PBtn>
          </div>
        </form>
      </PModal>
    </div>
  );
}
