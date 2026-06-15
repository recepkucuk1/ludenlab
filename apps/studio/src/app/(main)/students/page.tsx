"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toInputDate, formatDate } from "@/lib/utils";
import { WORK_AREA_LABEL, calcAge, getCategoryBadge } from "@/lib/constants";
import { StudentForm, StudentFormData } from "@/components/students/StudentForm";
import { PBtn, PBadge, PModal, PSelect, PProgress, PSpinner, PEmptyState, PHoverPanel } from "@/components/poster";

type FilterArea = "all" | "speech" | "language" | "hearing";
type SortBy = "name" | "birthDate-asc" | "birthDate-desc" | "lastCard" | "mostCards";

interface Student {
  id: string;
  name: string;
  birthDate: string | null;
  workArea: string;
  diagnosis: string | null;
  notes: string | null;
  createdAt: string;
  latestCardAt: string | null;
  _count: { cards: number };
  progressSummary: { completed: number; total: number };
}

const FILTER_OPTIONS: { value: FilterArea; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "speech", label: "Konuşma" },
  { value: "language", label: "Dil" },
  { value: "hearing", label: "İşitme" },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "name", label: "Ada göre (A–Z)" },
  { value: "birthDate-asc", label: "Yaşa göre (küçükten büyüğe)" },
  { value: "birthDate-desc", label: "Yaşa göre (büyükten küçüğe)" },
  { value: "lastCard", label: "En son kart üretilene göre" },
  { value: "mostCards", label: "En çok kart üretilene göre" },
];

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [filterArea, setFilterArea] = useState<FilterArea>("all");
  const [sortBy, setSortBy] = useState<SortBy>("name");

  const [curricula, setCurricula] = useState<{ id: string; area: string; title: string }[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  async function handleDelete(studentId: string) {
    setDeletingId(studentId);
    try {
      const res = await fetch(`/api/students/${studentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Silme başarısız");
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
      toast.success("Öğrenci silindi");
    } catch {
      toast.error("Bir hata oluştu, tekrar deneyin");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/students?page=1&limit=1000");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setStudents(data.students ?? []);
      setHasMore(data.hasMore ?? false);
      setCurrentPage(1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  async function loadMoreStudents() {
    const nextPage = currentPage + 1;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/students?page=${nextPage}&limit=1000`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStudents((prev) => [...prev, ...(data.students ?? [])]);
      setHasMore(data.hasMore ?? false);
      setCurrentPage(nextPage);
    } catch {
      toast.error("Öğrenciler yüklenemedi");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    fetch("/api/curriculum")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setCurricula(d.curricula ?? []))
      .catch(() => {});
  }, []);

  async function handleCreate(data: StudentFormData) {
    if (!data.name.trim()) {
      setFormError("Ad Soyad zorunludur.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          birthDate: data.birthDate || null,
          workArea: data.workArea,
          diagnosis: data.diagnosis,
          notes: data.notes,
          curriculumIds: data.curriculumIds,
        }),
      });
      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.error || "Hata oluştu");
      toast.success("Öğrenci başarıyla eklendi");
      setShowForm(false);
      fetchStudents();
    } catch (err) {
      toast.error("Bir hata oluştu, tekrar deneyin");
      setFormError(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(data: StudentFormData) {
    if (!editingStudent || !data.name.trim()) {
      setFormError("Ad Soyad zorunludur.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          birthDate: data.birthDate || null,
          workArea: data.workArea,
          diagnosis: data.diagnosis,
          notes: data.notes,
        }),
      });
      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.error || "Hata oluştu");
      setStudents((prev) =>
        prev.map((s) =>
          s.id === editingStudent.id
            ? {
                ...s,
                name: data.name,
                birthDate: data.birthDate || null,
                workArea: data.workArea,
                diagnosis: data.diagnosis || null,
                notes: data.notes || null,
              }
            : s
        )
      );
      toast.success("Değişiklikler kaydedildi");
      setEditingStudent(null);
    } catch (err) {
      toast.error("Bir hata oluştu, tekrar deneyin");
      setFormError(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = useMemo(() => {
    let list = filterArea === "all" ? students : students.filter((s) => s.workArea === filterArea);

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name, "tr");
        case "birthDate-asc":
          return (a.birthDate ?? "9999").localeCompare(b.birthDate ?? "9999");
        case "birthDate-desc":
          return (b.birthDate ?? "0000").localeCompare(a.birthDate ?? "0000");
        case "lastCard":
          return (b.latestCardAt ?? "").localeCompare(a.latestCardAt ?? "");
        case "mostCards":
          return b._count.cards - a._count.cards;
        default:
          return 0;
      }
    });

    return list;
  }, [students, filterArea, sortBy]);

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
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "var(--poster-ink)",
                letterSpacing: "-.02em",
                margin: 0,
              }}
            >
              Öğrenciler
            </h1>
            <p style={{ marginTop: 4, fontSize: 13, color: "var(--poster-ink-2)", fontWeight: 600 }}>
              {loading
                ? "Yükleniyor…"
                : filtered.length === students.length
                ? `${students.length} öğrenci`
                : `${filtered.length} / ${students.length} öğrenci gösteriliyor`}
            </p>
          </div>
          <PBtn
            type="button"
            variant="accent"
            size="md"
            icon={<Plus size={16} />}
            onClick={() => {
              setFormError(null);
              setShowForm(true);
            }}
          >
            Yeni Öğrenci
          </PBtn>
        </div>

        {/* Filter + Sort */}
        {!loading && students.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 6,
                padding: 4,
                background: "var(--poster-panel)",
                border: "2px solid var(--poster-ink)",
                borderRadius: 999,
                boxShadow: "var(--poster-shadow-sm)",
                overflowX: "auto",
              }}
            >
              {FILTER_OPTIONS.map((opt) => {
                const active = filterArea === opt.value;
                const count =
                  opt.value === "all" ? students.length : students.filter((s) => s.workArea === opt.value).length;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFilterArea(opt.value)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 999,
                      border: "none",
                      background: active ? "var(--poster-ink)" : "transparent",
                      color: active ? "var(--poster-panel)" : "var(--poster-ink-2)",
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: ".02em",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      transition: "background .15s",
                    }}
                  >
                    {opt.label}
                    <span
                      style={{
                        padding: "1px 7px",
                        fontSize: 10,
                        fontWeight: 800,
                        borderRadius: 999,
                        background: active ? "rgba(245,232,199,.2)" : "var(--poster-bg-2)",
                        color: active ? "var(--poster-panel)" : "var(--poster-ink-3)",
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--poster-ink-2)" }}>Sırala:</span>
              <PSelect
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                style={{ width: "auto", minWidth: 220, height: 40 }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </PSelect>
            </div>
          </div>
        )}

        {/* Error */}
        {fetchError && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              background: "#ffe9e9",
              border: "2px solid var(--poster-danger)",
              borderRadius: 12,
              boxShadow: "0 3px 0 var(--poster-danger)",
              fontSize: 13,
              color: "#7a1414",
            }}
          >
            <strong>Hata:</strong> {fetchError}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
            <PSpinner size={32} />
          </div>
        ) : students.length === 0 ? (
          <PEmptyState
            icon="👤"
            title="Henüz öğrenci eklenmedi"
            subtitle="İlk öğrencinizi ekleyerek raporlar üretmeye başlayın."
          />
        ) : filtered.length === 0 ? (
          <PEmptyState
            title="Bu filtreye uygun öğrenci yok"
            action={
              <PBtn type="button" variant="white" size="sm" onClick={() => setFilterArea("all")}>
                Filtreyi Temizle
              </PBtn>
            }
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            {filtered.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                confirmDelete={confirmDeleteId === student.id}
                deleting={deletingId === student.id}
                onEdit={() => {
                  setFormError(null);
                  setEditingStudent(student);
                }}
                onRequestDelete={() => setConfirmDeleteId(student.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onConfirmDelete={() => handleDelete(student.id)}
              />
            ))}
          </div>
        )}

        {hasMore && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
            <PBtn type="button" variant="white" size="md" onClick={loadMoreStudents} disabled={loadingMore}>
              {loadingMore ? "Yükleniyor…" : "Daha Fazla Yükle"}
            </PBtn>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <PModal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Yeni Öğrenci Ekle"
        width={520}
      >
        <StudentForm
          curricula={curricula}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          submitting={submitting}
          error={formError}
        />
      </PModal>

      {/* Edit Modal */}
      <PModal
        open={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        title="Öğrenci Düzenle"
        width={520}
      >
        {editingStudent && (
          <StudentForm
            initialValues={{
              name: editingStudent.name,
              birthDate: toInputDate(editingStudent.birthDate) || "",
              workArea: editingStudent.workArea,
              diagnosis: editingStudent.diagnosis || "",
              notes: editingStudent.notes || "",
            }}
            curricula={curricula}
            onSubmit={handleEdit}
            onCancel={() => setEditingStudent(null)}
            submitting={submitting}
            error={formError}
          />
        )}
      </PModal>
    </div>
  );
}

function StudentCard({
  student,
  confirmDelete,
  deleting,
  onEdit,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  student: Student;
  confirmDelete: boolean;
  deleting: boolean;
  onEdit: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  const progressPct =
    student.progressSummary.total > 0
      ? Math.round((student.progressSummary.completed / student.progressSummary.total) * 100)
      : 0;
  const areaColor = getCategoryBadge(student.workArea);

  return (
    <PHoverPanel
      style={{ display: "flex", flexDirection: "column" }}
      onHoverChange={setHover}
    >
      <Link
        href={`/students/${student.id}`}
        style={{ textDecoration: "none", color: "inherit", display: "block", padding: 18, flex: 1 }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--poster-accent)",
            border: "2px solid var(--poster-ink)",
            borderRadius: 14,
            boxShadow: "0 3px 0 var(--poster-ink)",
            color: "#fff",
            fontSize: 20,
            fontWeight: 800,
          }}
        >
          {student.name.charAt(0).toUpperCase()}
        </div>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: "var(--poster-ink)",
            margin: "0 0 10px",
            letterSpacing: "-.01em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {student.name}
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          <PBadge color={areaColor}>{WORK_AREA_LABEL[student.workArea] ?? student.workArea}</PBadge>
          {student.birthDate && <PBadge color="soft">{calcAge(student.birthDate)}</PBadge>}
          {student.diagnosis && <PBadge color="blue">{student.diagnosis}</PBadge>}
        </div>

        <div
          style={{
            marginTop: "auto",
            paddingTop: 12,
            borderTop: "2px dashed var(--poster-ink-faint)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "var(--poster-ink-2)",
                textTransform: "uppercase",
                letterSpacing: ".1em",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <span>{student._count.cards} Materyal</span>
              {student.latestCardAt && (
                <span style={{ fontSize: 9, opacity: 0.7 }}>Son: {formatDate(student.latestCardAt, "short")}</span>
              )}
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "var(--poster-accent)",
                transform: hover ? "translateX(3px)" : "none",
                transition: "transform .15s",
              }}
            >
              Detay →
            </span>
          </div>

          {student.progressSummary.total > 0 && (
            <div
              style={{
                padding: 10,
                background: "var(--poster-bg-2)",
                border: "2px solid var(--poster-ink)",
                borderRadius: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: "var(--poster-ink-2)",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                  }}
                >
                  {student.progressSummary.completed}/{student.progressSummary.total} Hedef
                </span>
                <span style={{ fontSize: 10, fontWeight: 900, color: "var(--poster-accent)" }}>{progressPct}%</span>
              </div>
              <PProgress value={progressPct} color="var(--poster-accent)" />
            </div>
          )}
        </div>
      </Link>

      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          display: "flex",
          gap: 6,
          opacity: hover ? 1 : 0,
          transition: "opacity .15s",
          zIndex: 2,
        }}
      >
        <IconBtn
          label="Düzenle"
          onClick={(e) => {
            e.preventDefault();
            onEdit();
          }}
        >
          <Pencil size={14} />
        </IconBtn>
        <IconBtn
          label="Sil"
          danger
          onClick={(e) => {
            e.preventDefault();
            onRequestDelete();
          }}
        >
          <Trash2 size={14} />
        </IconBtn>
      </div>

      {confirmDelete && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: 20,
            background: "var(--poster-panel)",
            border: "2px solid var(--poster-danger)",
            borderRadius: 18,
            zIndex: 3,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 800, color: "var(--poster-ink)", margin: 0 }}>
            Bu öğrenciyi silmek istediğinize emin misiniz?
          </p>
          <p
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "var(--poster-danger)",
              textTransform: "uppercase",
              letterSpacing: ".1em",
              margin: 0,
            }}
          >
            Tüm materyalleri de silinecektir.
          </p>
          <div style={{ display: "flex", gap: 8, width: "100%", marginTop: 8 }}>
            <PBtn type="button" variant="white" size="sm" onClick={onCancelDelete} style={{ flex: 1, justifyContent: "center" }}>
              İptal
            </PBtn>
            <button
              type="button"
              onClick={onConfirmDelete}
              disabled={deleting}
              style={{
                flex: 1,
                height: 38,
                padding: "0 14px",
                background: "var(--poster-danger)",
                color: "#fff",
                border: "2px solid var(--poster-ink)",
                borderRadius: 12,
                boxShadow: "0 3px 0 var(--poster-ink)",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                opacity: deleting ? 0.6 : 1,
                fontFamily: "var(--font-display)",
              }}
            >
              {deleting ? "Siliniyor…" : "Evet, Sil"}
            </button>
          </div>
        </div>
      )}
    </PHoverPanel>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        width: 30,
        height: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--poster-panel)",
        border: "2px solid var(--poster-ink)",
        borderRadius: 8,
        boxShadow: "0 2px 0 var(--poster-ink)",
        color: danger ? "var(--poster-danger)" : "var(--poster-ink-2)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
