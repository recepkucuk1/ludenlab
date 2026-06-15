"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Filter, Plus } from "lucide-react";
import { AssignStudentsModal } from "@/components/cards/AssignStudentsModal";
import { SwipeableCard } from "@/components/SwipeableCard";
import { DIFFICULTY_LABEL, AGE_LABEL, CATEGORY_META, getCategoryBadge, getDifficultyBadge } from "@/lib/constants";
import { PBtn, PBadge, PModal, PSelect, PSpinner, PEmptyState, PHoverPanel } from "@/components/poster";

interface CardItem {
  id: string;
  title: string;
  category: string | null;
  toolType: string | null;
  difficulty: string;
  ageGroup: string;
  createdAt: string;
  curriculumGoalIds: string[];
  content: Record<string, unknown> | null;
  student: { id: string; name: string } | null;
  _count: { assignments: number };
}

type ToolTypeFilter =
  | "all"
  | "learning"
  | "social_story"
  | "articulation"
  | "homework"
  | "session_summary"
  | "matching_game"
  | "phonation"
  | "comm_board"
  | "weekly_plan";

const TOOL_TYPE_OPTIONS: { value: ToolTypeFilter; label: string; href?: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "learning", label: "Öğrenme Kartı", href: "/generate" },
  { value: "social_story", label: "Sosyal Hikaye", href: "/tools/social-story" },
  { value: "articulation", label: "Artikülasyon", href: "/tools/articulation" },
  { value: "homework", label: "Ev Ödevi", href: "/tools/homework" },
  { value: "session_summary", label: "Oturum Özeti", href: "/tools/session-summary" },
  { value: "matching_game", label: "Kelime Eşleştirme", href: "/tools/matching-game" },
  { value: "phonation", label: "Sesletim Aktivitesi", href: "/tools/phonation" },
  { value: "comm_board", label: "İletişim Panosu", href: "/tools/comm-board" },
  { value: "weekly_plan", label: "Haftalık Plan", href: "/tools/weekly-plan" },
];

const TOOL_TYPE_BADGE_COLOR: Record<string, "blue" | "accent" | "yellow" | "soft"> = {
  LEARNING_CARD: "blue",
  SOCIAL_STORY: "soft",
  ARTICULATION_DRILL: "accent",
  HOMEWORK_MATERIAL: "yellow",
  SESSION_SUMMARY: "soft",
  MATCHING_GAME: "blue",
  PHONATION_ACTIVITY: "soft",
  COMMUNICATION_BOARD: "soft",
  WEEKLY_PLAN: "yellow",
};

const TOOL_TYPE_BADGE_LABEL: Record<string, string> = {
  LEARNING_CARD: "Öğrenme Kartı",
  SOCIAL_STORY: "Sosyal Hikaye",
  ARTICULATION_DRILL: "Artikülasyon",
  HOMEWORK_MATERIAL: "Ev Ödevi",
  SESSION_SUMMARY: "Oturum Özeti",
  MATCHING_GAME: "Kelime Eşleştirme",
  PHONATION_ACTIVITY: "Sesletim Aktivitesi",
  COMMUNICATION_BOARD: "İletişim Panosu",
  WEEKLY_PLAN: "Haftalık Plan",
};


function resolveToolType(toolType: string | null): string {
  return toolType ?? "LEARNING_CARD";
}

interface Curriculum {
  id: string;
  area: string;
  title: string;
  goals: { id: string }[];
}

type SortBy = "newest" | "oldest" | "name" | "assignments";

const CATEGORY_OPTIONS = [
  { value: "all", label: "Tümü" },
  { value: "speech", label: "Konuşma" },
  { value: "language", label: "Dil" },
  { value: "hearing", label: "İşitme" },
];
const DIFFICULTY_OPTIONS = [
  { value: "all", label: "Tümü" },
  { value: "easy", label: "Kolay" },
  { value: "medium", label: "Orta" },
  { value: "hard", label: "Zor" },
];
const AGE_OPTIONS = [
  { value: "all", label: "Tümü" },
  { value: "3-6", label: "3–6 yaş" },
  { value: "7-12", label: "7–12 yaş" },
  { value: "13-18", label: "13–18 yaş" },
  { value: "adult", label: "Yetişkin" },
];
const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "newest", label: "En yeni önce" },
  { value: "oldest", label: "En eski önce" },
  { value: "name", label: "Ada göre (A–Z)" },
  { value: "assignments", label: "En çok atanan önce" },
];

const SITUATION_OPTIONS = [
  { value: "all", label: "Tümü" },
  { value: "Sıra bekleme", label: "Sıra bekleme" },
  { value: "Selamlaşma", label: "Selamlaşma" },
  { value: "Paylaşma", label: "Paylaşma" },
  { value: "Duygularını ifade etme", label: "Duygularını ifade etme" },
  { value: "Sınıf kurallarına uyma", label: "Sınıf kurallarına uyma" },
  { value: "Arkadaş edinme", label: "Arkadaş edinme" },
  { value: "Çatışma çözme", label: "Çatışma çözme" },
  { value: "Özür dileme", label: "Özür dileme" },
  { value: "Yardım isteme", label: "Yardım isteme" },
];
const ENVIRONMENT_OPTIONS = [
  { value: "all", label: "Tümü" },
  { value: "Okul", label: "Okul" },
  { value: "Ev", label: "Ev" },
  { value: "Park", label: "Park" },
  { value: "Market", label: "Market" },
  { value: "Hastane", label: "Hastane" },
  { value: "Rehabilitasyon merkezi", label: "Rehabilitasyon merkezi" },
];
const STORY_LENGTH_OPTIONS = [
  { value: "all", label: "Tümü" },
  { value: "short", label: "Kısa" },
  { value: "medium", label: "Orta" },
  { value: "long", label: "Uzun" },
];
const SOUND_OPTIONS = [
  "/s/", "/z/", "/ş/", "/ç/", "/r/", "/l/", "/k/", "/g/",
  "/t/", "/d/", "/n/", "/m/", "/p/", "/b/", "/f/", "/v/", "/h/",
];
const ARTICULATON_LEVEL_OPTIONS = [
  { value: "all", label: "Tümü" },
  { value: "isolated", label: "İzole Ses" },
  { value: "syllable", label: "Hece" },
  { value: "word", label: "Kelime" },
  { value: "sentence", label: "Cümle" },
  { value: "contextual", label: "Bağlam" },
];
const THEME_OPTIONS = [
  { value: "all", label: "Tümü" },
  { value: "Hayvanlar", label: "Hayvanlar" },
  { value: "Yiyecekler", label: "Yiyecekler" },
  { value: "Mevsimler ve hava", label: "Mevsimler" },
  { value: "Meslekler", label: "Meslekler" },
  { value: "Okul eşyaları", label: "Okul eşyaları" },
  { value: "Vücut bölümleri", label: "Vücut bölümleri" },
  { value: "Spor ve oyunlar", label: "Spor ve oyunlar" },
];
const HW_AREA_OPTIONS = [
  { value: "all", label: "Tümü" },
  { value: "Artikülasyon / Ses çalışması", label: "Artikülasyon" },
  { value: "Dil gelişimi / Kelime hazinesi", label: "Dil gelişimi" },
  { value: "Akıcı konuşma", label: "Akıcı konuşma" },
  { value: "Pragmatik dil / Sosyal iletişim", label: "Pragmatik dil" },
  { value: "İşitsel algı / Dinleme becerileri", label: "İşitsel algı" },
  { value: "Oral motor egzersizler", label: "Oral motor" },
  { value: "Diğer", label: "Diğer" },
];
const HW_MATERIAL_OPTIONS = [
  { value: "all", label: "Tümü" },
  { value: "exercise", label: "Ev Egzersizi" },
  { value: "observation", label: "Gözlem Formu" },
  { value: "daily_activity", label: "Günlük Aktivite" },
];
const HW_DURATION_OPTIONS = [
  { value: "all", label: "Tümü" },
  { value: "10 dakika", label: "10 dk" },
  { value: "15 dakika", label: "15 dk" },
  { value: "20 dakika", label: "20 dk" },
];
const SS_SESSION_TYPE_OPTIONS = [
  { value: "all", label: "Tümü" },
  { value: "individual", label: "Bireysel" },
  { value: "group", label: "Grup" },
  { value: "assessment", label: "Değerlendirme" },
  { value: "parent_meeting", label: "Veli Görüşmesi" },
];
const SS_PERFORMANCE_OPTIONS = [
  { value: "all", label: "Tümü" },
  { value: "above_target", label: "Beklenenin Üstünde" },
  { value: "on_target", label: "Hedefle Uyumlu" },
  { value: "progressing", label: "Gelişim Gösteriyor" },
  { value: "needs_support", label: "Ek Destek Gerekiyor" },
];
const MG_MATCH_TYPE_OPTIONS = [
  { value: "all", label: "Tümü" },
  { value: "definition", label: "Kelime — Tanım" },
  { value: "image_desc", label: "Kelime — Resim" },
  { value: "synonym", label: "Eş Anlamlı" },
  { value: "antonym", label: "Zıt Anlamlı" },
  { value: "category", label: "Kategori" },
  { value: "sentence", label: "Cümle Tamamlama" },
];
const MG_DIFFICULTY_OPTIONS = DIFFICULTY_OPTIONS;
const PA_ACTIVITY_TYPE_OPTIONS = [
  { value: "all", label: "Tümü" },
  { value: "sound_hunt", label: "Ses Avı" },
  { value: "bingo", label: "Tombala" },
  { value: "snakes_ladders", label: "Yılan Merdiven" },
  { value: "word_chain", label: "Kelime Zinciri" },
  { value: "sound_maze", label: "Ses Labirenti" },
];
const PA_DIFFICULTY_OPTIONS = DIFFICULTY_OPTIONS;
const PA_SOUND_OPTIONS = [
  "/s/", "/z/", "/ş/", "/ç/", "/c/", "/j/",
  "/r/", "/l/", "/n/", "/m/",
  "/k/", "/g/", "/t/", "/d/", "/p/", "/b/",
  "/f/", "/v/", "/h/", "/y/",
];
const CB_BOARD_TYPE_OPTIONS = [
  { value: "all", label: "Tümü" },
  { value: "basic_needs", label: "Temel İhtiyaçlar" },
  { value: "emotions", label: "Duygular" },
  { value: "daily_routines", label: "Günlük Rutinler" },
  { value: "school", label: "Okul Aktiviteleri" },
  { value: "social", label: "Sosyal İfadeler" },
  { value: "requests", label: "İstek ve Seçim" },
];
const CB_LAYOUT_OPTIONS = [
  { value: "all", label: "Tümü" },
  { value: "grid", label: "Grid" },
  { value: "strip", label: "Satır" },
];
const CB_SYMBOL_COUNT_OPTIONS = [
  { value: "all", label: "Tümü" },
  { value: "4", label: "4" },
  { value: "6", label: "6" },
  { value: "9", label: "9" },
  { value: "12", label: "12" },
];
const WP_SESSIONS_OPTIONS = [
  { value: "all", label: "Tümü" },
  { value: "2", label: "2 ders" },
  { value: "3", label: "3 ders" },
  { value: "4", label: "4 ders" },
  { value: "5", label: "5 ders" },
];

function PosterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        border: "2px solid var(--poster-ink)",
        background: active ? "var(--poster-accent)" : "var(--poster-panel)",
        color: active ? "#fff" : "var(--poster-ink-2)",
        fontSize: 12,
        fontWeight: 700,
        boxShadow: active ? "0 2px 0 var(--poster-ink)" : "none",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "background .12s",
        fontFamily: "var(--font-display)",
      }}
    >
      {label}
    </button>
  );
}

function PillGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((o) => (
        <PosterPill key={o.value} label={o.label} active={value === o.value} onClick={() => onChange(o.value)} />
      ))}
    </div>
  );
}

function MultiPillGroup({
  options,
  values,
  onChange,
}: {
  options: string[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) =>
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      <PosterPill label="Tümü" active={values.length === 0} onClick={() => onChange([])} />
      {options.map((o) => (
        <PosterPill key={o} label={o} active={values.includes(o)} onClick={() => toggle(o)} />
      ))}
    </div>
  );
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: "var(--poster-ink-3)",
          textTransform: "uppercase",
          letterSpacing: ".1em",
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

export default function CardsPage() {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [assigningCard, setAssigningCard] = useState<CardItem | null>(null);
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [filterToolType, setFilterToolType] = useState<ToolTypeFilter>("all");
  const [filterStudent, setFilterStudent] = useState("");
  const [filterAgeGroup, setFilterAgeGroup] = useState("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterCurriculum, setFilterCurriculum] = useState("");
  const [filterSituation, setFilterSituation] = useState("all");
  const [filterEnvironment, setFilterEnvironment] = useState("all");
  const [filterStoryLength, setFilterStoryLength] = useState("all");
  const [filterSounds, setFilterSounds] = useState<string[]>([]);
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterTheme, setFilterTheme] = useState("all");
  const [filterHwArea, setFilterHwArea] = useState("all");
  const [filterHwMaterial, setFilterHwMaterial] = useState("all");
  const [filterHwDuration, setFilterHwDuration] = useState("all");
  const [filterSsType, setFilterSsType] = useState("all");
  const [filterSsPerformance, setFilterSsPerformance] = useState("all");
  const [filterMgMatchType, setFilterMgMatchType] = useState("all");
  const [filterMgDifficulty, setFilterMgDifficulty] = useState("all");
  const [filterPaType, setFilterPaType] = useState("all");
  const [filterPaDifficulty, setFilterPaDifficulty] = useState("all");
  const [filterPaSounds, setFilterPaSounds] = useState<string[]>([]);
  const [filterCbBoardType, setFilterCbBoardType] = useState("all");
  const [filterCbLayout, setFilterCbLayout] = useState("all");
  const [filterCbSymbolCount, setFilterCbSymbolCount] = useState("all");
  const [filterWpSessions, setFilterWpSessions] = useState("all");

  useEffect(() => {
    Promise.all([
      fetch("/api/cards?page=1&limit=1000").then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
      fetch("/api/curriculum").then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
    ])
      .then(([cData, curData]) => {
        setCards(cData.cards ?? []);
        setHasMore(cData.hasMore ?? false);
        setPage(1);
        setCurricula(curData.curricula ?? []);
      })
      .catch(() => toast.error("Veriler yüklenemedi"))
      .finally(() => setLoading(false));
  }, []);

  async function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/cards?page=${nextPage}&limit=1000`);
      const data = await res.json();
      setCards((prev) => [...prev, ...(data.cards ?? [])]);
      setHasMore(data.hasMore ?? false);
      setPage(nextPage);
    } catch {
      toast.error("Kartlar yüklenemedi");
    } finally {
      setLoadingMore(false);
    }
  }

  function handleSaved(cardId: string, assignedCount: number) {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, _count: { assignments: assignedCount } } : c))
    );
  }

  const hasActiveFilters =
    filterStudent !== "" ||
    filterAgeGroup !== "all" ||
    filterCategory !== "all" ||
    filterDifficulty !== "all" ||
    filterCurriculum !== "" ||
    filterSituation !== "all" ||
    filterEnvironment !== "all" ||
    filterStoryLength !== "all" ||
    filterSounds.length > 0 ||
    filterLevel !== "all" ||
    filterTheme !== "all" ||
    filterHwArea !== "all" ||
    filterHwMaterial !== "all" ||
    filterHwDuration !== "all" ||
    filterSsType !== "all" ||
    filterSsPerformance !== "all" ||
    filterMgMatchType !== "all" ||
    filterMgDifficulty !== "all" ||
    filterPaType !== "all" ||
    filterPaDifficulty !== "all" ||
    filterPaSounds.length > 0 ||
    filterCbBoardType !== "all" ||
    filterCbLayout !== "all" ||
    filterCbSymbolCount !== "all" ||
    filterWpSessions !== "all";

  function clearFilters() {
    setFilterStudent("");
    setFilterAgeGroup("all");
    setFilterCategory("all");
    setFilterDifficulty("all");
    setFilterCurriculum("");
    setFilterSituation("all");
    setFilterEnvironment("all");
    setFilterStoryLength("all");
    setFilterSounds([]);
    setFilterLevel("all");
    setFilterTheme("all");
    setFilterHwArea("all");
    setFilterHwMaterial("all");
    setFilterHwDuration("all");
    setFilterSsType("all");
    setFilterSsPerformance("all");
    setFilterMgMatchType("all");
    setFilterMgDifficulty("all");
    setFilterPaType("all");
    setFilterPaDifficulty("all");
    setFilterPaSounds([]);
    setFilterCbBoardType("all");
    setFilterCbLayout("all");
    setFilterCbSymbolCount("all");
    setFilterWpSessions("all");
  }

  const goalToCurriculumId = useMemo(() => {
    const map: Record<string, string> = {};
    curricula.forEach((c) => c.goals?.forEach((g) => { map[g.id] = c.id; }));
    return map;
  }, [curricula]);

  const uniqueStudents = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; name: string }[] = [];
    cards.forEach((c) => {
      if (c.student && !seen.has(c.student.id)) {
        seen.add(c.student.id);
        result.push(c.student);
      }
    });
    return result.sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [cards]);

  const filtered = useMemo(() => {
    let list = [...cards];

    if (filterToolType !== "all") {
      list = list.filter((c) => {
        const tt = resolveToolType(c.toolType);
        if (filterToolType === "learning") return tt === "LEARNING_CARD";
        if (filterToolType === "social_story") return tt === "SOCIAL_STORY";
        if (filterToolType === "articulation") return tt === "ARTICULATION_DRILL";
        if (filterToolType === "homework") return tt === "HOMEWORK_MATERIAL";
        if (filterToolType === "session_summary") return tt === "SESSION_SUMMARY";
        if (filterToolType === "matching_game") return tt === "MATCHING_GAME";
        if (filterToolType === "phonation") return tt === "PHONATION_ACTIVITY";
        if (filterToolType === "comm_board") return tt === "COMMUNICATION_BOARD";
        if (filterToolType === "weekly_plan") return tt === "WEEKLY_PLAN";
        return true;
      });
    }

    if (filterStudent !== "") list = list.filter((c) => c.student?.id === filterStudent);
    if (filterAgeGroup !== "all") list = list.filter((c) => c.ageGroup === filterAgeGroup);

    if (filterToolType === "learning") {
      if (filterCategory !== "all") list = list.filter((c) => c.category === filterCategory);
      if (filterDifficulty !== "all") list = list.filter((c) => c.difficulty === filterDifficulty);
      if (filterCurriculum !== "")
        list = list.filter((c) => c.curriculumGoalIds.some((gId) => goalToCurriculumId[gId] === filterCurriculum));
    }

    if (filterToolType === "social_story") {
      if (filterSituation !== "all") list = list.filter((c) => (c.content?.situation as string | undefined) === filterSituation);
      if (filterEnvironment !== "all") list = list.filter((c) => (c.content?.environment as string | undefined) === filterEnvironment);
      if (filterStoryLength !== "all") {
        list = list.filter((c) => {
          const stored = c.content?.length as string | undefined;
          if (stored) return stored === filterStoryLength;
          const cnt = (c.content?.sentences as unknown[] | undefined)?.length ?? 0;
          if (filterStoryLength === "short") return cnt <= 5;
          if (filterStoryLength === "medium") return cnt >= 6 && cnt <= 10;
          if (filterStoryLength === "long") return cnt > 10;
          return true;
        });
      }
    }

    if (filterToolType === "homework") {
      if (filterHwArea !== "all") list = list.filter((c) => (c.content?.targetArea as string | undefined) === filterHwArea);
      if (filterHwMaterial !== "all") list = list.filter((c) => (c.content?.materialType as string | undefined) === filterHwMaterial);
      if (filterHwDuration !== "all") list = list.filter((c) => (c.content?.duration as string | undefined) === filterHwDuration);
    }

    if (filterToolType === "session_summary") {
      if (filterSsType !== "all") list = list.filter((c) => (c.content?.sessionType as string | undefined) === filterSsType);
      if (filterSsPerformance !== "all")
        list = list.filter((c) => (c.content?.overallPerformance as string | undefined) === filterSsPerformance);
    }

    if (filterToolType === "phonation") {
      if (filterPaType !== "all") list = list.filter((c) => (c.content?.activityType as string | undefined) === filterPaType);
      if (filterPaDifficulty !== "all") list = list.filter((c) => (c.content?.difficulty as string | undefined) === filterPaDifficulty);
      if (filterPaSounds.length > 0) {
        list = list.filter((c) => {
          const sounds = c.content?.targetSounds as string[] | undefined;
          if (!sounds) return false;
          return filterPaSounds.some((fs) => sounds.includes(fs));
        });
      }
    }

    if (filterToolType === "weekly_plan") {
      if (filterWpSessions !== "all") list = list.filter((c) => String(c.content?.sessionsPerWeek ?? "") === filterWpSessions);
    }

    if (filterToolType === "comm_board") {
      if (filterCbBoardType !== "all") list = list.filter((c) => (c.content?.boardType as string | undefined) === filterCbBoardType);
      if (filterCbLayout !== "all") list = list.filter((c) => (c.content?.layout as string | undefined) === filterCbLayout);
      if (filterCbSymbolCount !== "all") list = list.filter((c) => String(c.content?.symbolCount ?? "") === filterCbSymbolCount);
    }

    if (filterToolType === "matching_game") {
      if (filterMgMatchType !== "all") list = list.filter((c) => (c.content?.matchType as string | undefined) === filterMgMatchType);
      if (filterMgDifficulty !== "all") list = list.filter((c) => (c.content?.difficulty as string | undefined) === filterMgDifficulty);
    }

    if (filterToolType === "articulation") {
      if (filterSounds.length > 0) {
        list = list.filter((c) => {
          const sounds = c.content?.targetSounds as string[] | undefined;
          if (!sounds) return false;
          return filterSounds.some((fs) =>
            sounds.some((s) => s.toLowerCase().includes(fs.replace(/\//g, "").toLowerCase()))
          );
        });
      }
      if (filterLevel !== "all") list = list.filter((c) => (c.content?.level as string | undefined) === filterLevel);
      if (filterTheme !== "all") list = list.filter((c) => (c.content?.theme as string | undefined) === filterTheme);
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "name":
          return a.title.localeCompare(b.title, "tr");
        case "assignments":
          return b._count.assignments - a._count.assignments;
        default:
          return 0;
      }
    });
    return list;
  }, [
    cards, filterToolType, filterStudent, filterAgeGroup,
    filterCategory, filterDifficulty, filterCurriculum, goalToCurriculumId,
    filterSituation, filterEnvironment, filterStoryLength,
    filterSounds, filterLevel, filterTheme,
    filterHwArea, filterHwMaterial, filterHwDuration,
    filterSsType, filterSsPerformance,
    filterMgMatchType, filterMgDifficulty,
    filterPaType, filterPaDifficulty, filterPaSounds,
    filterCbBoardType, filterCbLayout, filterCbSymbolCount,
    filterWpSessions,
    sortBy,
  ]);

  async function handleDeleteCard(cardId: string) {
    setDeletingCardId(cardId);
    try {
      const res = await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Silme başarısız");
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      toast.success("Kart silindi");
    } catch {
      toast.error("Bir hata oluştu, tekrar deneyin");
    } finally {
      setDeletingCardId(null);
      setConfirmDeleteId(null);
    }
  }

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
              Kütüphane
            </h1>
            <p style={{ marginTop: 4, fontSize: 13, color: "var(--poster-ink-2)", fontWeight: 600 }}>
              {cards.length} materyal kayıtlı
            </p>
          </div>
          <PBtn as="a" href="/generate" variant="accent" size="md" icon={<Plus size={16} />}>
            Yeni Üret
          </PBtn>
        </div>

        {cards.length === 0 ? (
          <PEmptyState
            icon="🗂️"
            title="Henüz materyal üretilmedi"
            subtitle="Öğrencileriniz için harika materyaller üretmeye başlayın."
            action={
              <PBtn as="a" href="/generate" variant="accent" size="md">
                Materyal Üret
              </PBtn>
            }
          />
        ) : (
          <>
            {/* Tool type tabs */}
            <div style={{ marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
              <div
                style={{
                  display: "inline-flex",
                  gap: 4,
                  padding: 4,
                  background: "var(--poster-panel)",
                  border: "2px solid var(--poster-ink)",
                  borderRadius: 999,
                  boxShadow: "var(--poster-shadow-sm)",
                }}
              >
                {TOOL_TYPE_OPTIONS.map((o) => {
                  const active = filterToolType === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setFilterToolType(o.value)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 999,
                        border: "none",
                        background: active ? "var(--poster-ink)" : "transparent",
                        color: active ? "var(--poster-panel)" : "var(--poster-ink-2)",
                        fontSize: 12,
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                      }}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Advanced toggle + sort */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <PBtn
                type="button"
                variant="white"
                size="sm"
                icon={<Filter size={14} />}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                {showAdvancedFilters ? "Seçenekleri Gizle" : "Gelişmiş Seçenekler"}
                {hasActiveFilters && !showAdvancedFilters && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      marginLeft: 6,
                      borderRadius: "50%",
                      background: "var(--poster-accent)",
                      display: "inline-block",
                    }}
                  />
                )}
              </PBtn>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    style={{
                      border: "none",
                      background: "transparent",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--poster-danger)",
                      cursor: "pointer",
                    }}
                  >
                    Temizle
                  </button>
                )}
                <PSelect
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  style={{ width: "auto", minWidth: 200, height: 40 }}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </PSelect>
              </div>
            </div>

            {/* Advanced panel */}
            {showAdvancedFilters && (
              <div
                style={{
                  marginBottom: 20,
                  padding: 20,
                  background: "var(--poster-panel)",
                  border: "2px solid var(--poster-ink)",
                  borderRadius: 20,
                  boxShadow: "var(--poster-shadow-md)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: 16,
                    paddingBottom: 16,
                    borderBottom: "2px dashed var(--poster-ink-faint)",
                  }}
                >
                  {uniqueStudents.length > 0 && (
                    <FilterSection label="Öğrenci Seçimi">
                      <PSelect value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)}>
                        <option value="">Tüm Öğrenciler</option>
                        {uniqueStudents.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </PSelect>
                    </FilterSection>
                  )}
                  <FilterSection label="Hedef Yaş Grubu">
                    <PillGroup options={AGE_OPTIONS} value={filterAgeGroup} onChange={setFilterAgeGroup} />
                  </FilterSection>
                </div>

                {filterToolType === "learning" && (
                  <>
                    <FilterSection label="Kategori">
                      <PillGroup options={CATEGORY_OPTIONS} value={filterCategory} onChange={setFilterCategory} />
                    </FilterSection>
                    <FilterSection label="Zorluk">
                      <PillGroup options={DIFFICULTY_OPTIONS} value={filterDifficulty} onChange={setFilterDifficulty} />
                    </FilterSection>
                    {curricula.length > 0 && (
                      <FilterSection label="Bağlı Modül">
                        <PSelect
                          value={filterCurriculum}
                          onChange={(e) => setFilterCurriculum(e.target.value)}
                          style={{ maxWidth: 380 }}
                        >
                          <option value="">Tüm modüller</option>
                          {curricula.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </PSelect>
                      </FilterSection>
                    )}
                  </>
                )}

                {filterToolType === "social_story" && (
                  <>
                    <FilterSection label="Durum">
                      <PillGroup options={SITUATION_OPTIONS} value={filterSituation} onChange={setFilterSituation} />
                    </FilterSection>
                    <FilterSection label="Ortam">
                      <PillGroup options={ENVIRONMENT_OPTIONS} value={filterEnvironment} onChange={setFilterEnvironment} />
                    </FilterSection>
                    <FilterSection label="Uzunluk">
                      <PillGroup options={STORY_LENGTH_OPTIONS} value={filterStoryLength} onChange={setFilterStoryLength} />
                    </FilterSection>
                  </>
                )}

                {filterToolType === "session_summary" && (
                  <>
                    <FilterSection label="Oturum Türü">
                      <PillGroup options={SS_SESSION_TYPE_OPTIONS} value={filterSsType} onChange={setFilterSsType} />
                    </FilterSection>
                    <FilterSection label="Gelişim Sonucu">
                      <PillGroup
                        options={SS_PERFORMANCE_OPTIONS}
                        value={filterSsPerformance}
                        onChange={setFilterSsPerformance}
                      />
                    </FilterSection>
                  </>
                )}

                {filterToolType === "phonation" && (
                  <>
                    <FilterSection label="Aktivite Türü">
                      <PillGroup
                        options={PA_ACTIVITY_TYPE_OPTIONS}
                        value={filterPaType}
                        onChange={setFilterPaType}
                      />
                    </FilterSection>
                    <FilterSection label="Hedef Sesler (Çoklu)">
                      <MultiPillGroup options={PA_SOUND_OPTIONS} values={filterPaSounds} onChange={setFilterPaSounds} />
                    </FilterSection>
                    <FilterSection label="Zorluk">
                      <PillGroup
                        options={PA_DIFFICULTY_OPTIONS}
                        value={filterPaDifficulty}
                        onChange={setFilterPaDifficulty}
                      />
                    </FilterSection>
                  </>
                )}

                {filterToolType === "matching_game" && (
                  <>
                    <FilterSection label="Eşleştirme Modeli">
                      <PillGroup options={MG_MATCH_TYPE_OPTIONS} value={filterMgMatchType} onChange={setFilterMgMatchType} />
                    </FilterSection>
                    <FilterSection label="Zorluk">
                      <PillGroup
                        options={MG_DIFFICULTY_OPTIONS}
                        value={filterMgDifficulty}
                        onChange={setFilterMgDifficulty}
                      />
                    </FilterSection>
                  </>
                )}

                {filterToolType === "comm_board" && (
                  <>
                    <FilterSection label="Pano Konsepti">
                      <PillGroup options={CB_BOARD_TYPE_OPTIONS} value={filterCbBoardType} onChange={setFilterCbBoardType} />
                    </FilterSection>
                    <FilterSection label="Düzen">
                      <PillGroup options={CB_LAYOUT_OPTIONS} value={filterCbLayout} onChange={setFilterCbLayout} />
                    </FilterSection>
                    <FilterSection label="Eleman Sayısı">
                      <PillGroup
                        options={CB_SYMBOL_COUNT_OPTIONS}
                        value={filterCbSymbolCount}
                        onChange={setFilterCbSymbolCount}
                      />
                    </FilterSection>
                  </>
                )}

                {filterToolType === "weekly_plan" && (
                  <FilterSection label="Yoğunluk">
                    <PillGroup options={WP_SESSIONS_OPTIONS} value={filterWpSessions} onChange={setFilterWpSessions} />
                  </FilterSection>
                )}

                {filterToolType === "articulation" && (
                  <>
                    <FilterSection label="Hedef Sesler">
                      <MultiPillGroup options={SOUND_OPTIONS} values={filterSounds} onChange={setFilterSounds} />
                    </FilterSection>
                    <FilterSection label="Seviye">
                      <PillGroup options={ARTICULATON_LEVEL_OPTIONS} value={filterLevel} onChange={setFilterLevel} />
                    </FilterSection>
                    <FilterSection label="Tema">
                      <PillGroup options={THEME_OPTIONS} value={filterTheme} onChange={setFilterTheme} />
                    </FilterSection>
                  </>
                )}

                {filterToolType === "homework" && (
                  <>
                    <FilterSection label="Odak Alanı">
                      <PillGroup options={HW_AREA_OPTIONS} value={filterHwArea} onChange={setFilterHwArea} />
                    </FilterSection>
                    <FilterSection label="Materyal Tipi">
                      <PillGroup
                        options={HW_MATERIAL_OPTIONS}
                        value={filterHwMaterial}
                        onChange={setFilterHwMaterial}
                      />
                    </FilterSection>
                    <FilterSection label="Beklenen Süre">
                      <PillGroup
                        options={HW_DURATION_OPTIONS}
                        value={filterHwDuration}
                        onChange={setFilterHwDuration}
                      />
                    </FilterSection>
                  </>
                )}
              </div>
            )}

            <p style={{ fontSize: 12, color: "var(--poster-ink-3)", marginBottom: 12, fontWeight: 600 }}>
              {filtered.length === cards.length
                ? `${cards.length} kart`
                : `${filtered.length} / ${cards.length} kart gösteriliyor`}
            </p>

            {filtered.length === 0 ? (
              filterToolType !== "all" ? (
                (() => {
                  const opt = TOOL_TYPE_OPTIONS.find((o) => o.value === filterToolType);
                  return (
                    <PEmptyState
                      title={`Henüz ${opt?.label?.toLocaleLowerCase("tr") ?? "kart"} üretilmedi`}
                      action={
                        opt?.href ? (
                          <PBtn as="a" href={opt.href} variant="accent" size="md">
                            Üretmeye Başla
                          </PBtn>
                        ) : undefined
                      }
                    />
                  );
                })()
              ) : (
                <PEmptyState
                  title="Bu filtrelere uyan materyal yok"
                  action={
                    <PBtn type="button" variant="white" size="sm" onClick={clearFilters}>
                      Filtreleri Temizle
                    </PBtn>
                  }
                />
              )
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 14,
                }}
              >
                {filtered.map((card) => (
                  <SwipeableCard
                    key={card.id}
                    id={card.id}
                    openId={swipeOpenId}
                    onOpen={setSwipeOpenId}
                    onClose={() => setSwipeOpenId(null)}
                    onDeletePress={() => {
                      setSwipeOpenId(null);
                      setConfirmDeleteId(card.id);
                    }}
                  >
                    <LibraryCardTile
                      card={card}
                      onAssign={() => setAssigningCard(card)}
                      onDelete={() => setConfirmDeleteId(card.id)}
                    />
                  </SwipeableCard>
                ))}
              </div>
            )}

            {hasMore && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
                <PBtn type="button" variant="white" size="md" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Yükleniyor…" : "Daha fazla yükle"}
                </PBtn>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirm modal */}
      <PModal
        open={!!confirmDeleteId}
        onClose={() => !deletingCardId && setConfirmDeleteId(null)}
        title="Kartı Sil"
        width={400}
        footer={
          <>
            <PBtn
              type="button"
              variant="white"
              size="sm"
              onClick={() => setConfirmDeleteId(null)}
              disabled={!!deletingCardId}
            >
              İptal
            </PBtn>
            <button
              type="button"
              onClick={() => confirmDeleteId && handleDeleteCard(confirmDeleteId)}
              disabled={!!deletingCardId}
              style={{
                height: 38,
                padding: "0 16px",
                background: "var(--poster-danger)",
                color: "#fff",
                border: "2px solid var(--poster-ink)",
                borderRadius: 12,
                boxShadow: "0 3px 0 var(--poster-ink)",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                opacity: deletingCardId ? 0.6 : 1,
                fontFamily: "var(--font-display)",
              }}
            >
              {deletingCardId ? "Siliniyor…" : "Evet, Sil"}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: "var(--poster-ink-2)", margin: 0, lineHeight: 1.5 }}>
          Bu kartı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
        </p>
      </PModal>

      {assigningCard && (
        <AssignStudentsModal
          cardId={assigningCard.id}
          cardTitle={assigningCard.title}
          onClose={() => setAssigningCard(null)}
          onSaved={(count) => handleSaved(assigningCard.id, count)}
        />
      )}
    </div>
  );
}

function LibraryCardTile({
  card,
  onAssign,
  onDelete,
}: {
  card: CardItem;
  onAssign: () => void;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  const tt = resolveToolType(card.toolType);
  const toolLabel = TOOL_TYPE_BADGE_LABEL[tt];
  const toolColor = TOOL_TYPE_BADGE_COLOR[tt] ?? "soft";
  const categoryColor = getCategoryBadge(card.category);
  const difficultyColor = getDifficultyBadge(card.difficulty);

  return (
    <PHoverPanel
      onHoverChange={setHover}
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 200,
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onDelete();
        }}
        aria-label="Sil"
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 2,
          padding: "3px 8px",
          background: "var(--poster-panel)",
          border: "2px solid var(--poster-ink)",
          borderRadius: 8,
          boxShadow: "0 2px 0 var(--poster-ink)",
          fontSize: 10,
          fontWeight: 800,
          color: "var(--poster-danger)",
          cursor: "pointer",
          opacity: hover ? 1 : 0,
          transition: "opacity .15s",
          fontFamily: "var(--font-display)",
        }}
      >
        Sil
      </button>

      <Link
        href={`/cards/${card.id}`}
        style={{ textDecoration: "none", color: "inherit", display: "block", padding: 18, flex: 1 }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10, paddingRight: 40 }}>
          {toolLabel && <PBadge color={toolColor}>{toolLabel}</PBadge>}
          {card.category && CATEGORY_META[card.category] && (
            <PBadge color={categoryColor}>{CATEGORY_META[card.category].label}</PBadge>
          )}
          <PBadge color={difficultyColor}>{DIFFICULTY_LABEL[card.difficulty] ?? card.difficulty}</PBadge>
          <PBadge color="soft">{AGE_LABEL[card.ageGroup] ?? card.ageGroup}</PBadge>
        </div>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: "var(--poster-ink)",
            margin: "0 0 8px",
            lineHeight: 1.3,
            letterSpacing: "-.01em",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {card.title}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {card.student && (
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--poster-accent)", margin: 0 }}>
              Atanan: {card.student.name}
            </p>
          )}
          {card._count.assignments > 0 && (
            <p
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "var(--poster-ink-3)",
                textTransform: "uppercase",
                letterSpacing: ".1em",
                margin: 0,
              }}
            >
              {card._count.assignments} öğrenciye atandı
            </p>
          )}
        </div>
      </Link>

      <div style={{ padding: "0 14px 14px" }}>
        <button
          type="button"
          onClick={onAssign}
          style={{
            width: "100%",
            height: 36,
            background: "var(--poster-ink)",
            color: "var(--poster-panel)",
            border: "2px solid var(--poster-ink)",
            borderRadius: 10,
            boxShadow: "0 3px 0 var(--poster-ink)",
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
            fontFamily: "var(--font-display)",
          }}
        >
          Öğrenci Ata
        </button>
      </div>
    </PHoverPanel>
  );
}
