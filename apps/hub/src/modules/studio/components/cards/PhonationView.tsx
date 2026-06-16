import { useState } from "react";
import { cn } from "@studio/lib/utils";
import { ChevronDown, ChevronUp, Lightbulb, Info, Eye, EyeOff } from "lucide-react";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface GridCell {
  position: number;
  word: string;
  hasTargetSound: boolean;
  isLadder?: boolean;
  isSnake?: boolean;
  instruction?: string | null;
}

export interface PhonationGrid {
  rows: number;
  cols: number;
  cells: GridCell[];
}

export interface PhonationObject {
  name: string;
  hasTargetSound: boolean;
  description?: string;
}

export interface WordChainItem {
  order: number;
  word: string;
  connection?: string;
}

export interface PhonationActivityContent {
  title: string;
  activityType: "sound_hunt" | "bingo" | "snakes_ladders" | "word_chain" | "sound_maze";
  targetSounds: string[];
  difficulty: "easy" | "medium" | "hard";
  theme?: string;
  grid?: PhonationGrid | null;
  scene?: string | null;
  objects?: PhonationObject[] | null;
  wordChain?: WordChainItem[] | null;
  instructions?: string;
  expertNotes?: string;
  adaptations?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVITY_TYPE_LABEL: Record<string, string> = {
  sound_hunt:     "Ses Avı",
  bingo:          "Tombala",
  snakes_ladders: "Yılan Merdiven",
  word_chain:     "Kelime Zinciri",
  sound_maze:     "Ses Labirenti",
};

const ACTIVITY_TYPE_COLOR: Record<string, string> = {
  sound_hunt:     "bg-[var(--poster-blue-soft)] text-[var(--poster-blue)] border-[var(--poster-blue)]",
  bingo:          "bg-[var(--poster-yellow-soft)] text-[var(--poster-ink)] border-[var(--poster-yellow)]",
  snakes_ladders: "bg-[var(--poster-green-soft)] text-[var(--poster-green)] border-[var(--poster-green)]",
  word_chain:     "bg-[var(--poster-pink-soft)] text-[var(--poster-pink)] border-[var(--poster-pink)]",
  sound_maze:     "bg-[var(--poster-accent-soft)] text-[var(--poster-accent)] border-[var(--poster-accent)]",
};

const DIFFICULTY_LABEL: Record<string, string> = { easy: "Kolay", medium: "Orta", hard: "Zor" };
const DIFFICULTY_COLOR: Record<string, string> = {
  easy:   "bg-[var(--poster-green-soft)] text-[var(--poster-green)] border-[var(--poster-green)]",
  medium: "bg-[var(--poster-yellow-soft)] text-[var(--poster-ink)] border-[var(--poster-yellow)]",
  hard:   "bg-[var(--poster-danger-soft)] text-[var(--poster-danger)] border-[var(--poster-danger)]",
};

// ─── Sub-views ────────────────────────────────────────────────────────────────

function SoundHuntView({ activity }: { activity: PhonationActivityContent }) {
  const [showAnswers, setShowAnswers] = useState(false);
  const objects = Array.isArray(activity.objects) ? activity.objects : [];

  return (
    <div className="space-y-4">
      {activity.scene && (
        <div className="rounded-xl border border-[var(--alert-info-border)] bg-[var(--alert-info-bg)] p-4">
          <p className="text-xs font-semibold text-[var(--alert-info-text)] mb-1">Sahne</p>
          <p className="text-sm text-[var(--alert-info-text)] leading-relaxed">{activity.scene}</p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-[var(--poster-ink-3)]">
            Nesneler <span className="text-[var(--poster-ink-3)] font-normal">({objects.length} nesne)</span>
          </p>
          <button
            type="button"
            onClick={() => setShowAnswers((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-[var(--poster-ink-3)] hover:text-[var(--poster-ink)] transition-colors"
          >
            {showAnswers ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showAnswers ? "Cevapları Gizle" : "Cevapları Göster"}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {objects.map((obj, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg border-2 p-3 text-center transition-colors",
                showAnswers && obj.hasTargetSound
                  ? "border-[var(--poster-blue)] bg-[var(--poster-blue-soft)]"
                  : showAnswers && !obj.hasTargetSound
                  ? "border-[var(--poster-ink-faint)] bg-[var(--poster-bg-2)] opacity-50"
                  : "border-dashed border-[var(--poster-ink-faint)] bg-[var(--poster-panel)]"
              )}
            >
              <p className="text-sm font-semibold text-[var(--poster-ink)]">{obj.name}</p>
              {obj.description && (
                <p className="text-[10px] text-[var(--poster-ink-3)] mt-0.5 leading-snug">{obj.description}</p>
              )}
              {showAnswers && obj.hasTargetSound && (
                <span className="mt-1 inline-block text-[10px] font-semibold text-[var(--alert-info-text)]">✓ Hedef ses</span>
              )}
            </div>
          ))}
        </div>
        {!showAnswers && (
          <p className="mt-2 text-[11px] text-[var(--poster-ink-3)] text-center">
            Hedef sesi içeren nesneleri bulun, ardından cevapları gösterin.
          </p>
        )}
      </div>
    </div>
  );
}

function BingoView({ activity }: { activity: PhonationActivityContent }) {
  const grid = activity.grid;
  if (!grid) return <p className="text-sm text-[var(--poster-ink-3)]">Tombala verisi bulunamadı.</p>;
  const cells = Array.isArray(grid.cells) ? grid.cells : [];
  const midPos = Math.ceil((grid.rows * grid.cols) / 2);

  return (
    <div>
      <div
        className="grid gap-1.5 mx-auto"
        style={{ gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`, maxWidth: grid.cols * 90 }}
      >
        {cells.map((cell, i) => {
          const isMid = cell.position === midPos && grid.rows === grid.cols;
          return (
            <div
              key={i}
              className={cn(
                "rounded-lg border-2 p-2 flex items-center justify-center text-center min-h-[60px]",
                isMid
                  ? "border-[var(--poster-yellow)] bg-[var(--poster-yellow-soft)] font-bold"
                  : "border-[var(--poster-yellow)] bg-[var(--poster-yellow-soft)]"
              )}
            >
              <span className="text-xs font-semibold leading-snug text-[var(--poster-ink)]">
                {isMid ? "⭐ SES" : cell.word}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-[var(--poster-ink-3)] text-center">
        {grid.rows}×{grid.cols} tombala kartı · Ortadaki yıldız kare serbesttir
      </p>
    </div>
  );
}

function SnakesLaddersView({ activity }: { activity: PhonationActivityContent }) {
  const grid = activity.grid;
  if (!grid) return <p className="text-sm text-[var(--poster-ink-3)]">Yılan Merdiven verisi bulunamadı.</p>;
  const cells = Array.isArray(grid.cells) ? grid.cells : [];
  const total = grid.rows * grid.cols;

  // Build board rows from bottom to top (snakes & ladders style)
  const rows: GridCell[][] = [];
  for (let r = 0; r < grid.rows; r++) {
    const rowCells = cells.filter(
      (c) => c.position > r * grid.cols && c.position <= (r + 1) * grid.cols
    );
    // Alternate row direction
    rows.unshift((grid.rows - 1 - r) % 2 === 0 ? rowCells : [...rowCells].reverse());
  }

  return (
    <div>
      <div className="space-y-1">
        {rows.map((row, ri) => (
          <div key={ri} className={cn("grid gap-1", `grid-cols-${grid.cols}`)}>
            {row.map((cell, ci) => (
              <div
                key={ci}
                className={cn(
                  "rounded-lg border p-1.5 text-center min-h-[52px] flex flex-col items-center justify-center",
                  cell.position === 1
                    ? "border-[var(--poster-green)] bg-[var(--poster-green-soft)]"
                    : cell.position === total
                    ? "border-[var(--poster-yellow)] bg-[var(--poster-yellow-soft)]"
                    : cell.isLadder
                    ? "border-[var(--poster-green)] bg-[var(--poster-green-soft)]"
                    : cell.isSnake
                    ? "border-[var(--poster-danger)] bg-[var(--poster-danger-soft)]"
                    : "border-[var(--poster-ink-faint)] bg-[var(--poster-panel)]"
                )}
                style={grid.cols === 5 ? {} : { gridColumn: "span 1" }}
              >
                <span className="text-[9px] text-[var(--poster-ink-3)] leading-none mb-0.5">{cell.position}</span>
                {cell.position === 1 && <span className="text-[10px]">🏁</span>}
                {cell.position === total && <span className="text-[10px]">🏆</span>}
                <span className="text-[10px] font-semibold text-[var(--poster-ink)] leading-snug">{cell.word}</span>
                {cell.isLadder && <span className="text-[9px] text-[var(--alert-success-text)]">↑ Merdiven</span>}
                {cell.isSnake && <span className="text-[9px] text-[var(--alert-error-text)]">↓ Yılan</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-[var(--poster-ink-2)] justify-center flex-wrap">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-[var(--poster-green-soft)] border border-[var(--poster-green)] inline-block" /> Merdiven — doğru söylersen ilerle</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-[var(--poster-danger-soft)] border border-[var(--poster-danger)] inline-block" /> Yılan — tekrar dene</span>
      </div>
    </div>
  );
}

function WordChainView({ activity }: { activity: PhonationActivityContent }) {
  const chain = Array.isArray(activity.wordChain) ? activity.wordChain : [];

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-center gap-1 min-w-max">
        {chain.map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="rounded-lg border-2 border-[var(--poster-pink)] bg-[var(--poster-pink-soft)] px-3 py-2.5 text-center min-w-[72px]">
              <span className="block text-[10px] font-semibold text-[var(--poster-pink)] mb-0.5">{item.order}</span>
              <span className="block text-sm font-bold text-[var(--poster-ink)]">{item.word}</span>
              {item.connection && (
                <span className="block text-[9px] text-[var(--poster-ink-3)] leading-snug mt-0.5">{item.connection}</span>
              )}
            </div>
            {i < chain.length - 1 && (
              <span className="text-[var(--poster-pink)] text-lg font-light">→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SoundMazeView({ activity }: { activity: PhonationActivityContent }) {
  const [showAnswers, setShowAnswers] = useState(false);
  const grid = activity.grid;
  if (!grid) return <p className="text-sm text-[var(--poster-ink-3)]">Labirent verisi bulunamadı.</p>;
  const cells = Array.isArray(grid.cells) ? grid.cells : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-[var(--poster-ink-3)]">Labirent</p>
        <button
          type="button"
          onClick={() => setShowAnswers((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-[var(--poster-ink-3)] hover:text-[var(--poster-ink)] transition-colors"
        >
          {showAnswers ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showAnswers ? "Yolu Gizle" : "Doğru Yolu Göster"}
        </button>
      </div>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))` }}
      >
        {cells.map((cell, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg border-2 p-2 flex items-center justify-center text-center min-h-[56px] transition-colors",
              cell.position === 1
                ? "border-[var(--poster-green)] bg-[var(--poster-green-soft)]"
                : cell.position === cells.length
                ? "border-[var(--poster-yellow)] bg-[var(--poster-yellow-soft)]"
                : showAnswers && cell.hasTargetSound
                ? "border-[var(--poster-green)] bg-[var(--poster-green-soft)]"
                : showAnswers && !cell.hasTargetSound
                ? "border-[var(--poster-danger)] bg-[var(--poster-danger-soft)] opacity-60"
                : "border-dashed border-[var(--poster-ink-faint)] bg-[var(--poster-panel)]"
            )}
          >
            <div>
              {cell.position === 1 && <p className="text-[10px] text-[var(--alert-success-text)] mb-0.5">GİRİŞ</p>}
              {cell.position === cells.length && <p className="text-[10px] text-[var(--alert-warning-text)] mb-0.5">ÇIKIŞ</p>}
              <span className="text-xs font-semibold text-[var(--poster-ink)]">{cell.word}</span>
            </div>
          </div>
        ))}
      </div>
      {!showAnswers && (
        <p className="mt-2 text-[11px] text-[var(--poster-ink-3)] text-center">
          Hedef sesi içeren kelimeleri takip ederek çıkışa ulaşın.
        </p>
      )}
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function PhonationView({ activity }: { activity: PhonationActivityContent }) {
  const [showAnswers, setShowAnswers] = useState(false);

  const sounds = Array.isArray(activity.targetSounds) ? activity.targetSounds : [];

  return (
    <div className="space-y-5">
      {/* Başlık + badge'ler */}
      <div>
        <h2 className="text-lg font-bold text-[var(--poster-ink)] mb-3 leading-snug">{activity.title}</h2>
        <div className="flex flex-wrap gap-1.5">
          <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", ACTIVITY_TYPE_COLOR[activity.activityType] ?? "bg-[var(--poster-ink-faint)] text-[var(--poster-ink-2)] border-[var(--poster-ink-faint)]")}>
            {ACTIVITY_TYPE_LABEL[activity.activityType] ?? activity.activityType}
          </span>
          <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", DIFFICULTY_COLOR[activity.difficulty] ?? "bg-[var(--poster-ink-faint)] text-[var(--poster-ink-2)] border-[var(--poster-ink-faint)]")}>
            {DIFFICULTY_LABEL[activity.difficulty] ?? activity.difficulty}
          </span>
          {sounds.map((s) => (
            <span key={s} className="rounded-full border border-[var(--poster-ink-faint)] bg-[var(--poster-bg-2)] px-2.5 py-0.5 text-xs font-semibold text-[var(--poster-ink-2)]">
              {s}
            </span>
          ))}
          {activity.theme && (
            <span className="rounded-full border border-[var(--poster-ink-faint)] bg-[var(--poster-bg-2)] px-2.5 py-0.5 text-xs text-[var(--poster-ink-3)]">
              {activity.theme}
            </span>
          )}
        </div>
      </div>

      {/* Aktivite türüne göre render */}
      <div className="rounded-xl border border-[var(--poster-ink-faint)] bg-[var(--poster-panel)] p-4">
        {activity.activityType === "sound_hunt" && (
          <SoundHuntView activity={activity} />
        )}
        {activity.activityType === "bingo" && (
          <BingoView activity={activity} />
        )}
        {activity.activityType === "snakes_ladders" && (
          <SnakesLaddersView activity={activity} />
        )}
        {activity.activityType === "word_chain" && (
          <WordChainView activity={activity} />
        )}
        {activity.activityType === "sound_maze" && (
          <SoundMazeView activity={activity} />
        )}
      </div>

      {/* Talimatlar */}
      {activity.instructions && (
        <div className="rounded-xl border border-[var(--poster-ink-faint)] bg-[var(--poster-bg-2)] p-4 flex gap-3">
          <Info className="h-4 w-4 text-[var(--poster-ink-3)] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[var(--poster-ink-3)] mb-1">Nasıl Oynanır</p>
            <p className="text-sm text-[var(--poster-ink-2)] leading-relaxed">{activity.instructions}</p>
          </div>
        </div>
      )}

      {/* Uyarlama */}
      {activity.adaptations && (
        <div className="rounded-xl border border-[var(--poster-ink-faint)] bg-[var(--poster-panel)] p-4">
          <p className="text-xs font-semibold text-[var(--poster-ink-3)] mb-1.5">Uyarlama Önerileri</p>
          <p className="text-sm text-[var(--poster-ink-2)] leading-relaxed">{activity.adaptations}</p>
        </div>
      )}

      {/* Uzman Notları */}
      {activity.expertNotes && (
        <div className="rounded-xl border border-[var(--alert-warning-border)] bg-[var(--alert-warning-bg)] p-4 flex gap-3">
          <Lightbulb className="h-4 w-4 text-[var(--alert-warning-text)] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[var(--alert-warning-text)] mb-1">Uzman Notları</p>
            <p className="text-xs text-[var(--alert-warning-text)] leading-relaxed">{activity.expertNotes}</p>
          </div>
        </div>
      )}
    </div>
  );
}
