"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Lightbulb, Home, RefreshCw, Library } from "lucide-react";
import { WORK_AREA_LABEL, calcAge, getCategoryBadge } from "@studio/lib/constants";
import { PBtn, PCard, PBadge, PSelect, PLabel, PFieldHint } from "@studio/components/poster";
import { ToolShell, ToolEmptyState, ToolLoadingCard } from "@studio/components/tools/ToolShell";
import { FlashcardGrid } from "@studio/components/cards/FlashcardGrid";
import { downloadArticulationWorksheetPDF } from "@studio/components/cards/articulationWorksheetPdf";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Student {
  id: string;
  name: string;
  birthDate: string | null;
  workArea: string;
  diagnosis: string | null;
}

interface DrillItem {
  word: string;
  syllableCount: number;
  syllableBreak: string;
  position: string;
  targetSound: string;
  sentence?: string;
  visualPrompt?: string;
  imageUrl?: string;
}

interface DrillResult {
  title: string;
  targetSounds: string[];
  positions: string[];
  level: string;
  items: DrillItem[];
  expertNotes?: string;
  cueTypes?: string[];
  homeGuidance?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SOUND_GROUPS = [
  { label: "Sürtünme / Temas", sounds: ["/s/", "/z/", "/ş/", "/ç/", "/c/", "/j/"] },
  { label: "Akıcı",             sounds: ["/r/", "/l/", "/n/", "/m/"] },
  { label: "Patlayıcı",         sounds: ["/k/", "/g/", "/t/", "/d/", "/p/", "/b/"] },
  { label: "Diğer",             sounds: ["/f/", "/v/", "/h/", "/y/"] },
];

const POSITION_OPTIONS = [
  { value: "initial", label: "Başta" },
  { value: "medial",  label: "Ortada" },
  { value: "final",   label: "Sonda" },
];

const LEVEL_OPTIONS = [
  { value: "isolated",   label: "İzole Ses",    desc: "Tek başına ses tekrarı" },
  { value: "syllable",   label: "Hece Düzeyi",  desc: "Hece kombinasyonları" },
  { value: "word",       label: "Kelime",        desc: "Hedef sesi içeren kelimeler" },
  { value: "sentence",   label: "Cümle",         desc: "Kelimeleri içeren cümleler" },
  { value: "contextual", label: "Bağlam",        desc: "Paragraf düzeyinde" },
];

const ITEM_COUNTS = [10, 15, 20, 25, 30];

const THEMES = [
  { value: "none",          label: "Tema yok (karışık)" },
  { value: "Hayvanlar",     label: "Hayvanlar" },
  { value: "Yiyecekler",    label: "Yiyecekler" },
  { value: "Mevsimler ve hava", label: "Mevsimler ve hava" },
  { value: "Meslekler",     label: "Meslekler" },
  { value: "Okul eşyaları", label: "Okul eşyaları" },
  { value: "Vücut bölümleri", label: "Vücut bölümleri" },
  { value: "Spor ve oyunlar", label: "Spor ve oyunlar" },
];

const POSITION_LABEL: Record<string, string> = {
  initial: "Başta",
  medial:  "Ortada",
  final:   "Sonda",
};

const LEVEL_LABEL: Record<string, string> = {
  isolated:   "İzole Ses",
  syllable:   "Hece Düzeyi",
  word:       "Kelime Düzeyi",
  sentence:   "Cümle Düzeyi",
  contextual: "Bağlam İçi",
};

const LOADING_MSGS = [
  "Hedef ses analiz ediliyor...",
  "Türkçe kelime dağarcığı taranıyor...",
  "Ses pozisyonları kontrol ediliyor...",
  "Alıştırma materyali hazırlanıyor...",
  "Hece yapıları oluşturuluyor...",
  "Uzman önerileri ekleniyor...",
];

// ─── Loading Messages ─────────────────────────────────────────────────────────

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
    <p
      style={{
        fontSize: 13,
        color: "var(--poster-ink-2)",
        transition: "opacity .3s",
        opacity: visible ? 1 : 0,
        margin: 0,
      }}
    >
      {LOADING_MSGS[index]}
    </p>
  );
}

function DrillResultView({ drill, cardId, onAddImage, imagesBusy }: {
  drill: DrillResult; cardId: string | null; onAddImage: (i: number) => void; imagesBusy: boolean;
}) {
  const sounds = drill.targetSounds ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--poster-ink)", margin: "0 0 10px", letterSpacing: "-.01em" }}>
          {drill.title}
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {sounds.map((s) => (
            <PBadge key={s} color="blue">{s}</PBadge>
          ))}
          {(drill.positions ?? []).map((p) => (
            <PBadge key={p} color="soft">{POSITION_LABEL[p] ?? p}</PBadge>
          ))}
          <PBadge color="accent">{LEVEL_LABEL[drill.level] ?? drill.level}</PBadge>
          <PBadge color="soft">{drill.items?.length ?? 0} öğe</PBadge>
        </div>
      </div>

      <div>
        <FlashcardGrid
          items={drill.items}
          sounds={sounds}
          showSentence={drill.level === "sentence" || drill.level === "contextual"}
          cardId={cardId}
          onAddImage={(i) => cardId && onAddImage(i)}
          busy={imagesBusy}
        />
      </div>

      {drill.cueTypes?.length ? (
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, color: "var(--poster-ink-2)", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 8px" }}>
            İpucu Türleri
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {drill.cueTypes.map((c, i) => (
              <PBadge key={i} color="soft">{c}</PBadge>
            ))}
          </div>
        </div>
      ) : null}

      {drill.expertNotes && (
        <div
          style={{
            padding: 14,
            background: "#fff3d1",
            border: "2px solid #b7791f",
            borderRadius: 12,
            boxShadow: "0 3px 0 #b7791f",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Lightbulb style={{ width: 16, height: 16, color: "#b7791f" }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: "#5a3d05" }}>Uzman Notları</span>
          </div>
          <p style={{ fontSize: 12, color: "#5a3d05", lineHeight: 1.6, margin: 0 }}>{drill.expertNotes}</p>
        </div>
      )}

      {drill.homeGuidance && (
        <div
          style={{
            padding: 14,
            background: "#e0ecfb",
            border: "2px solid var(--poster-blue)",
            borderRadius: 12,
            boxShadow: "0 3px 0 var(--poster-blue)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Home style={{ width: 16, height: 16, color: "var(--poster-blue)" }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: "#0e3a6b" }}>Veli Rehberi</span>
          </div>
          <p style={{ fontSize: 12, color: "#0e3a6b", lineHeight: 1.6, margin: 0 }}>{drill.homeGuidance}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ArticulationPage() {
  const [students, setStudents]               = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  const [studentId,      setStudentId]      = useState("");
  const [selectedSounds, setSelectedSounds] = useState<string[]>([]);
  const [positions,      setPositions]      = useState<string[]>(["initial"]);
  const [level,          setLevel]          = useState("word");
  const [itemCount,      setItemCount]      = useState(15);
  const [theme,          setTheme]          = useState("none");
  const [formKey,        setFormKey]        = useState(0);

  const [loading,       setLoading]       = useState(false);
  const [drill,         setDrill]         = useState<DrillResult | null>(null);
  const [savedCardId,   setSavedCardId]   = useState<string | null>(null);
  const [withImages,    setWithImages]    = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);

  const [studentTouched,   setStudentTouched]   = useState(false);
  const [soundsTouched,    setSoundsTouched]    = useState(false);
  const [positionsTouched, setPositionsTouched] = useState(false);

  const selectedStudent = students.find((s) => s.id === studentId) ?? null;

  const studentError   = !studentId ? "Lütfen bir öğrenci seçin" : null;
  const soundsError    = !selectedSounds.length ? "En az bir hedef ses seçin" : null;
  const positionsError = !positions.length ? "En az bir ses pozisyonu seçin" : null;
  const showStudentError   = studentTouched && studentError;
  const showSoundsError    = soundsTouched && soundsError;
  const showPositionsError = positionsTouched && positionsError;

  useEffect(() => {
    fetch("/studio/api/students")
      .then((r) => r.json())
      .then((d) => setStudents(d.students ?? []))
      .finally(() => setStudentsLoading(false));
  }, []);

  function toggleSound(sound: string) {
    setSelectedSounds((prev) =>
      prev.includes(sound) ? prev.filter((s) => s !== sound) : [...prev, sound]
    );
  }

  function togglePosition(pos: string) {
    if (pos === "all") {
      setPositions(["initial", "medial", "final"]);
      return;
    }
    setPositions((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStudentTouched(true);
    setSoundsTouched(true);
    setPositionsTouched(true);
    if (studentError || soundsError || positionsError) return;

    setLoading(true);
    setDrill(null);
    setSavedCardId(null);

    try {
      const res = await fetch("/studio/api/tools/articulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          targetSounds: selectedSounds,
          positions,
          level,
          itemCount,
          theme: theme === "none" ? undefined : theme,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Bir hata oluştu"); return; }
      setDrill(data.drill as DrillResult);
      setSavedCardId(data.cardId ?? null);
      toast.success("Alıştırma materyali üretildi!");
      if (withImages && data.cardId) {
        await generateImagesFor(data.cardId);
      }
    } catch {
      toast.error("Bağlantı hatası, tekrar deneyin");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setDrill(null);
    setSavedCardId(null);
    setFormKey((k) => k + 1);
    setStudentId("");
    setSelectedSounds([]);
    setPositions(["initial"]);
    setLevel("word");
    setItemCount(15);
    setStudentTouched(false);
    setSoundsTouched(false);
    setPositionsTouched(false);
    setTheme("none");
    setWithImages(false);
  }

  // ── Image generation ─────────────────────────────────────────────────────────
  async function generateImagesFor(cardId: string, itemIndexes?: number[]) {
    setImagesLoading(true);
    try {
      const res = await fetch("/studio/api/tools/articulation/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, itemIndexes }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Görsel üretilemedi"); return; }
      setDrill((prev) => {
        if (!prev) return prev;
        const items = prev.items.slice();
        for (const r of data.results as Array<{ index: number; imageUrl?: string }>) {
          if (r.imageUrl) items[r.index] = { ...items[r.index], imageUrl: r.imageUrl };
        }
        return { ...prev, items };
      });
      const okCount = (data.results as Array<{ imageUrl?: string }>).filter((r) => r.imageUrl).length;
      if (okCount > 0) toast.success(`${okCount} görsel eklendi (${data.creditsSpent} kredi)`);
    } catch {
      toast.error("Görsel üretiminde bağlantı hatası");
    } finally {
      setImagesLoading(false);
    }
  }

  // ── Button helpers ───────────────────────────────────────────────────────────
  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 12px",
    background: active ? "var(--poster-ink)" : "var(--poster-panel)",
    color: active ? "#fff" : "var(--poster-ink)",
    border: "2px solid var(--poster-ink)",
    borderRadius: 999,
    boxShadow: active ? "0 2px 0 var(--poster-ink)" : "var(--poster-shadow-sm)",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "var(--font-display)",
  });

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 14px",
    background: active ? "var(--poster-accent)" : "var(--poster-panel)",
    color: active ? "#fff" : "var(--poster-ink)",
    border: "2px solid var(--poster-ink)",
    borderRadius: 10,
    boxShadow: active ? "0 2px 0 var(--poster-ink)" : "var(--poster-shadow-sm)",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "var(--font-display)",
  });

  const rowStyle = (active: boolean): React.CSSProperties => ({
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    background: active ? "var(--poster-accent)" : "var(--poster-panel)",
    color: active ? "#fff" : "var(--poster-ink)",
    border: "2px solid var(--poster-ink)",
    borderRadius: 10,
    boxShadow: active ? "0 2px 0 var(--poster-ink)" : "var(--poster-shadow-sm)",
    cursor: "pointer",
    fontFamily: "var(--font-display)",
    textAlign: "left",
  });

  const countStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "8px 0",
    background: active ? "var(--poster-ink)" : "var(--poster-panel)",
    color: active ? "#fff" : "var(--poster-ink)",
    border: "2px solid var(--poster-ink)",
    borderRadius: 10,
    boxShadow: active ? "0 2px 0 var(--poster-ink)" : "var(--poster-shadow-sm)",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "var(--font-display)",
  });

  const submitStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    background: "var(--poster-accent)",
    color: "#fff",
    border: "2px solid var(--poster-ink)",
    borderRadius: 12,
    boxShadow: "0 3px 0 var(--poster-ink)",
    fontSize: 14,
    fontWeight: 800,
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.6 : 1,
    fontFamily: "var(--font-display)",
  };

  const form = (
    <form key={formKey} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Öğrenci */}
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
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </PSelect>
        {showStudentError && <PFieldHint tone="error">{studentError}</PFieldHint>}
        {selectedStudent && (
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {selectedStudent.birthDate && (
              <PBadge color="soft">{calcAge(selectedStudent.birthDate)}</PBadge>
            )}
            <PBadge color={getCategoryBadge(selectedStudent.workArea)}>
              {WORK_AREA_LABEL[selectedStudent.workArea] ?? selectedStudent.workArea}
            </PBadge>
            {selectedStudent.diagnosis && (
              <PBadge color="soft">{selectedStudent.diagnosis}</PBadge>
            )}
          </div>
        )}
      </div>

      {/* Hedef sesler */}
      <div>
        <PLabel required>
          Hedef Ses(ler){" "}
          {selectedSounds.length > 0 && (
            <span style={{ color: "var(--poster-blue)", fontWeight: 600 }}>
              ({selectedSounds.join(", ")} seçili)
            </span>
          )}
        </PLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SOUND_GROUPS.map((group) => (
            <div key={group.label}>
              <p style={{ fontSize: 10, color: "var(--poster-ink-3)", margin: "0 0 4px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>
                {group.label}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {group.sounds.map((sound) => (
                  <button
                    key={sound}
                    type="button"
                    onClick={() => {
                      toggleSound(sound);
                      setSoundsTouched(true);
                    }}
                    style={pillStyle(selectedSounds.includes(sound))}
                  >
                    {sound}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {showSoundsError && <PFieldHint tone="error">{soundsError}</PFieldHint>}
      </div>

      {/* Ses pozisyonu */}
      <div>
        <PLabel required>Ses Pozisyonu</PLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {POSITION_OPTIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => {
                togglePosition(p.value);
                setPositionsTouched(true);
              }}
              style={chipStyle(positions.includes(p.value))}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              togglePosition("all");
              setPositionsTouched(true);
            }}
            style={chipStyle(positions.length === 3)}
          >
            Tümü
          </button>
        </div>
        {showPositionsError && <PFieldHint tone="error">{positionsError}</PFieldHint>}
      </div>

      {/* Alıştırma seviyesi */}
      <div>
        <PLabel>Alıştırma Seviyesi</PLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {LEVEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setLevel(opt.value)}
              style={rowStyle(level === opt.value)}
            >
              <span style={{ fontSize: 13, fontWeight: 700 }}>{opt.label}</span>
              <span style={{ fontSize: 10, opacity: 0.75 }}>{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Öğe sayısı */}
      <div>
        <PLabel>Kelime / Öğe Sayısı</PLabel>
        <div style={{ display: "flex", gap: 6 }}>
          {ITEM_COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setItemCount(n)}
              style={countStyle(itemCount === n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Tema */}
      <div>
        <PLabel optional>Tema</PLabel>
        <PSelect value={theme} onChange={(e) => setTheme(e.target.value)}>
          {THEMES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </PSelect>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--poster-ink-2)" }}>
        <input type="checkbox" checked={withImages} onChange={(e) => setWithImages(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--poster-accent)" }} />
        Her kelime için görsel de üret (kelime başına +1 kredi)
      </label>
      <button type="submit" disabled={loading} style={submitStyle}>
        {loading ? "Üretiliyor..." : "Alıştırma Üret"}
      </button>
      <p style={{ textAlign: "center", fontSize: 11, color: "var(--poster-ink-3)", margin: 0 }}>
        15 kredi kullanılacak
      </p>
    </form>
  );

  const result = loading ? (
    <ToolLoadingCard>
      <LoadingMessages />
    </ToolLoadingCard>
  ) : drill ? (
    <>
      <PCard rounded={18} style={{ padding: 18, background: "var(--poster-panel)" }}>
        <DrillResultView drill={drill} cardId={savedCardId} onAddImage={(i) => savedCardId && generateImagesFor(savedCardId, [i])} imagesBusy={imagesLoading} />
      </PCard>
      <PCard rounded={14} style={{ padding: 14, background: "var(--poster-panel)" }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: "var(--poster-ink-2)", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 10px" }}>
          Sonraki adım
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {savedCardId && (
            <PBtn as="a" href="/studio/cards" variant="white" size="md" icon={<Library style={{ width: 16, height: 16 }} />} style={{ flex: 1, minWidth: 140 }}>
              Kütüphaneye Git
            </PBtn>
          )}
          {savedCardId && drill && (
            <PBtn as="button" variant="white" size="md"
              onClick={async () => {
                try {
                  await downloadArticulationWorksheetPDF({ title: drill.title, targetSounds: drill.targetSounds, positions: drill.positions, level: drill.level, items: drill.items });
                } catch {
                  toast.error("PDF oluşturulamadı");
                }
              }}
              style={{ flex: 1, minWidth: 140 }}>
              Çalışma Kâğıdı (PDF)
            </PBtn>
          )}
          <PBtn as="button" variant="white" size="md" onClick={handleReset} icon={<RefreshCw style={{ width: 16, height: 16 }} />} style={{ flex: 1, minWidth: 140 }}>
            Yeni Alıştırma Üret
          </PBtn>
        </div>
      </PCard>
    </>
  ) : (
    <ToolEmptyState
      icon="🎤"
      title="Henüz alıştırma üretilmedi"
      hint='Sol taraftan hedef sesleri ve parametreleri seçip "Alıştırma Üret" butonuna bas.'
    />
  );

  return (
    <ToolShell
      title="Artikülasyon Alıştırma Üretici"
      description="Konuşma sesi bozuklukları için hedef ses bazlı, kişiselleştirilmiş alıştırma materyalleri üretin."
      form={form}
      result={result}
      formWidth={400}
    />
  );
}
