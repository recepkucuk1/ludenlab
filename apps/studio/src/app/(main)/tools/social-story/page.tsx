"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Lightbulb, Home, RefreshCw, Library } from "lucide-react";
import { WORK_AREA_LABEL, calcAge, getCategoryBadge } from "@/lib/constants";
import { PBtn, PCard, PBadge, PSwitch, PSelect, PInput, PLabel, PFieldHint } from "@/components/poster";
import { ToolShell, ToolEmptyState, ToolLoadingCard } from "@/components/tools/ToolShell";

interface Student {
  id: string;
  name: string;
  birthDate: string | null;
  workArea: string;
  diagnosis: string | null;
}

interface StorySentence {
  type: "descriptive" | "perspective" | "directive" | "affirmative";
  text: string;
  visualPrompt?: string;
}

interface StoryResult {
  title: string;
  sentences: StorySentence[];
  expertNotes?: string;
  homeGuidance?: string;
}

const SITUATIONS = [
  "Sıra bekleme",
  "Selamlaşma",
  "Paylaşma",
  "Duygularını ifade etme",
  "Sınıf kurallarına uyma",
  "Arkadaş edinme",
  "Çatışma çözme",
  "Özür dileme",
  "Yardım isteme",
  "Diğer",
];

const ENVIRONMENTS = ["Okul", "Ev", "Park", "Market", "Hastane", "Rehabilitasyon merkezi"];

const SENTENCE_TYPE_LABEL: Record<string, string> = {
  descriptive: "Tanımlayıcı",
  perspective: "Perspektif",
  directive: "Yönlendirici",
  affirmative: "Olumlu",
};

type BadgeColor = "accent" | "green" | "blue" | "yellow" | "pink" | "soft" | "ink";
const SENTENCE_TYPE_COLOR: Record<string, BadgeColor> = {
  descriptive: "blue",
  perspective: "ink",
  directive: "accent",
  affirmative: "yellow",
};

const LOADING_MSGS = [
  "Sosyal bağlam analiz ediliyor...",
  "Carol Gray formatı uygulanıyor...",
  "Perspektif cümleleri oluşturuluyor...",
  "Yaşa uygun dil ayarlanıyor...",
  "Hikaye yapılandırılıyor...",
  "Son dokunuşlar yapılıyor...",
];

function LoadingMessages() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      timerRef.current = setTimeout(() => {
        setIndex((i) => (i + 1) % LOADING_MSGS.length);
        setVisible(true);
      }, 300);
    }, 2600);
    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p
        style={{
          fontSize: 13,
          color: "var(--poster-ink-2)",
          fontWeight: 600,
          textAlign: "center",
          opacity: visible ? 1 : 0,
          transition: "opacity .3s",
          margin: 0,
        }}
      >
        {LOADING_MSGS[index]}
      </p>
    </div>
  );
}

export default function SocialStoryPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  const [studentId, setStudentId] = useState("");
  const [situation, setSituation] = useState("");
  const [customSit, setCustomSit] = useState("");
  const [environment, setEnvironment] = useState("Okul");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [visualSupport, setVisualSupport] = useState(false);

  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState<StoryResult | null>(null);
  const [savedCardId, setSavedCardId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const [studentTouched, setStudentTouched] = useState(false);
  const [situationTouched, setSituationTouched] = useState(false);

  const finalSituation = situation === "Diğer" ? customSit.trim() : situation;
  const studentError = !studentId ? "Lütfen bir öğrenci seçin" : null;
  const situationError = !finalSituation ? "Lütfen sosyal durumu belirtin" : null;
  const showStudentError = studentTouched && studentError;
  const showSituationError = situationTouched && situationError;

  const selectedStudent = students.find((s) => s.id === studentId) ?? null;

  useEffect(() => {
    fetch("/api/students")
      .then((r) => r.json())
      .then((d) => setStudents(d.students ?? []))
      .finally(() => setStudentsLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStudentTouched(true);
    setSituationTouched(true);
    if (studentError || situationError) return;

    setLoading(true);
    setStory(null);
    setSavedCardId(null);

    try {
      const res = await fetch("/api/tools/social-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, situation: finalSituation, environment, length, visualSupport }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Bir hata oluştu");
        return;
      }
      setStory(data.story as StoryResult);
      setSavedCardId(data.cardId ?? null);
      toast.success("Sosyal hikaye üretildi!");
    } catch {
      toast.error("Bağlantı hatası, tekrar deneyin");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setStory(null);
    setSavedCardId(null);
    setFormKey((k) => k + 1);
    setSituation("");
    setCustomSit("");
    setEnvironment("Okul");
    setLength("medium");
    setVisualSupport(false);
    setStudentId("");
  }

  const LENGTH_LABELS = { short: "Kısa", medium: "Orta", long: "Uzun" } as const;
  const LENGTH_SUB = { short: "3–5 cümle", medium: "6–10 cümle", long: "11–15 cümle" } as const;

  const form = (
    <form
      key={formKey}
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div>
        <PLabel required>Öğrenci</PLabel>
        <PSelect
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          onBlur={() => setStudentTouched(true)}
          invalid={!!showStudentError}
          aria-invalid={!!showStudentError}
        >
          <option value="">{studentsLoading ? "Yükleniyor..." : "Öğrenci seçin"}</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </PSelect>
        {showStudentError && <PFieldHint tone="error">{studentError}</PFieldHint>}
        {selectedStudent && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {selectedStudent.birthDate && <PBadge color="soft">{calcAge(selectedStudent.birthDate)}</PBadge>}
            <PBadge color={getCategoryBadge(selectedStudent.workArea)}>
              {WORK_AREA_LABEL[selectedStudent.workArea] ?? selectedStudent.workArea}
            </PBadge>
            {selectedStudent.diagnosis && <PBadge color="soft">{selectedStudent.diagnosis}</PBadge>}
          </div>
        )}
      </div>

      <div>
        <PLabel required>Sosyal Durum</PLabel>
        <PSelect
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          onBlur={() => setSituationTouched(true)}
          invalid={!!showSituationError}
          aria-invalid={!!showSituationError}
        >
          <option value="">Durum seçin</option>
          {SITUATIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </PSelect>
        {situation === "Diğer" && (
          <PInput
            type="text"
            placeholder="Sosyal durumu açıklayın..."
            value={customSit}
            onChange={(e) => {
              setCustomSit(e.target.value);
              setSituationTouched(true);
            }}
            required
            style={{ marginTop: 8 }}
            invalid={!!showSituationError}
          />
        )}
        {showSituationError && <PFieldHint tone="error">{situationError}</PFieldHint>}
      </div>

      <div>
        <PLabel>Ortam</PLabel>
        <PSelect value={environment} onChange={(e) => setEnvironment(e.target.value)}>
          {ENVIRONMENTS.map((env) => (
            <option key={env} value={env}>
              {env}
            </option>
          ))}
        </PSelect>
      </div>

      <div>
        <PLabel>Hikaye Uzunluğu</PLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {(["short", "medium", "long"] as const).map((l) => {
            const active = length === l;
            return (
              <button
                key={l}
                type="button"
                onClick={() => setLength(l)}
                style={{
                  padding: "10px 8px",
                  background: active ? "var(--poster-accent)" : "var(--poster-panel)",
                  color: active ? "#fff" : "var(--poster-ink)",
                  border: "2px solid var(--poster-ink)",
                  borderRadius: 12,
                  boxShadow: active ? "0 3px 0 var(--poster-ink)" : "var(--poster-shadow-sm)",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "var(--font-display)",
                }}
              >
                <span style={{ display: "block", fontSize: 12, fontWeight: 800 }}>{LENGTH_LABELS[l]}</span>
                <span
                  style={{
                    display: "block",
                    fontSize: 10,
                    fontWeight: 600,
                    opacity: active ? 0.85 : 0.6,
                  }}
                >
                  {LENGTH_SUB[l]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: 12,
          background: "var(--poster-bg-2)",
          border: "2px solid var(--poster-ink-faint)",
          borderRadius: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: "var(--poster-ink)", margin: 0 }}>
            Görsel Destek Açıklamaları
          </p>
          <p style={{ fontSize: 11, color: "var(--poster-ink-3)", margin: "2px 0 0" }}>
            Her cümle için görsel sahne notu ekle
          </p>
        </div>
        <PSwitch checked={visualSupport} onChange={setVisualSupport} />
      </div>

      <PBtn
        as="button"
        type="submit"
        variant="accent"
        size="md"
        disabled={loading}
        style={{ width: "100%", justifyContent: "center" }}
      >
        {loading ? "Üretiliyor..." : "Sosyal Hikaye Üret"}
      </PBtn>

      <p style={{ textAlign: "center", fontSize: 11, color: "var(--poster-ink-3)", margin: 0 }}>
        20 kredi kullanılacak
      </p>
    </form>
  );

  let result: React.ReactNode;
  if (loading) {
    result = (
      <ToolLoadingCard>
        <LoadingMessages />
      </ToolLoadingCard>
    );
  } else if (story) {
    result = (
      <>
        <PCard rounded={18} style={{ padding: 20, background: "var(--poster-panel)" }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "var(--poster-ink)",
              letterSpacing: "-.01em",
              margin: "0 0 16px",
            }}
          >
            {story.title}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {story.sentences?.map((sentence, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: 12,
                  background: "var(--poster-bg-2)",
                  border: "2px solid var(--poster-ink-faint)",
                  borderRadius: 12,
                }}
              >
                <PBadge color={SENTENCE_TYPE_COLOR[sentence.type] ?? "soft"}>
                  {SENTENCE_TYPE_LABEL[sentence.type] ?? sentence.type}
                </PBadge>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, color: "var(--poster-ink)", margin: 0, lineHeight: 1.55 }}>
                    {sentence.text}
                  </p>
                  {sentence.visualPrompt && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--poster-ink-3)",
                        fontStyle: "italic",
                        margin: "4px 0 0",
                      }}
                    >
                      {sentence.visualPrompt}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {story.expertNotes && (
            <div
              style={{
                marginTop: 18,
                padding: 14,
                background: "#fff3d1",
                border: "2px solid #b7791f",
                boxShadow: "0 3px 0 #b7791f",
                borderRadius: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Lightbulb style={{ width: 16, height: 16, color: "#5a3d05" }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: "#5a3d05" }}>Uzman Notları</span>
              </div>
              <p style={{ fontSize: 13, color: "#5a3d05", margin: 0, lineHeight: 1.55 }}>{story.expertNotes}</p>
            </div>
          )}

          {story.homeGuidance && (
            <div
              style={{
                marginTop: 12,
                padding: 14,
                background: "#e0ecfb",
                border: "2px solid var(--poster-blue)",
                boxShadow: "0 3px 0 var(--poster-blue)",
                borderRadius: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Home style={{ width: 16, height: 16, color: "#0e3a6b" }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: "#0e3a6b" }}>Veli Rehberi</span>
              </div>
              <p style={{ fontSize: 13, color: "#0e3a6b", margin: 0, lineHeight: 1.55 }}>{story.homeGuidance}</p>
            </div>
          )}
        </PCard>

        <PCard rounded={18} style={{ padding: 14, background: "var(--poster-panel)" }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "var(--poster-ink-3)",
              textTransform: "uppercase",
              letterSpacing: ".12em",
              margin: "0 0 10px",
            }}
          >
            Sonraki adım
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {savedCardId && (
              <PBtn
                as="a"
                href="/cards"
                variant="white"
                size="md"
                style={{ flex: "1 1 140px", justifyContent: "center" }}
              >
                <Library style={{ width: 14, height: 14, marginRight: 6 }} />
                Kütüphaneye Git
              </PBtn>
            )}
            <PBtn
              as="button"
              type="button"
              variant="white"
              size="md"
              onClick={handleReset}
              style={{ flex: "1 1 140px", justifyContent: "center" }}
            >
              <RefreshCw style={{ width: 14, height: 14, marginRight: 6 }} />
              Yeni Hikaye Üret
            </PBtn>
          </div>
        </PCard>
      </>
    );
  } else {
    result = (
      <ToolEmptyState
        icon="📖"
        title="Henüz hikaye üretilmedi"
        hint='Sol taraftan parametreleri seçip "Sosyal Hikaye Üret" butonuna bas.'
      />
    );
  }

  void Link;

  return (
    <ToolShell
      title="Sosyal Hikaye Üretici"
      description="Pragmatik dil ve sosyal iletişim becerileri için Carol Gray formatında kişiselleştirilmiş sosyal hikayeler üretin."
      form={form}
      result={result}
    />
  );
}
