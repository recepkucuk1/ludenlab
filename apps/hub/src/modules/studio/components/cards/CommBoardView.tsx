"use client";

import { cn } from "@studio/lib/utils";
import { Home, Info, BookOpen, Lightbulb } from "lucide-react";

export interface CommBoardCell {
  position: number;
  word: string;
  sentence?: string;
  category: "noun" | "verb" | "adjective" | "social" | "question" | "other";
  fitzgeraldColor: "yellow" | "green" | "blue" | "pink" | "orange" | "white";
  visualDescription: string;
  usage?: string;
}

export interface CommBoardContent {
  title: string;
  boardType: string;
  layout: "grid" | "strip";
  rows: number;
  cols: number;
  cells: CommBoardCell[];
  colorCoding?: boolean;
  textMode?: "word_only" | "word_sentence";
  symbolCount?: number;
  instructions?: string;
  expertNotes?: string;
  homeGuidance?: string;
  adaptations?: string;
}

// Fitzgerald Key Color System — clinical AAC standard where hue encodes part of speech
// (yellow=noun, green=verb, blue=adjective, pink=social, orange=question). These cells stay
// intentionally light in both light/dark mode (like physical board symbols); do NOT remap to
// poster tokens or the color coding loses its clinical meaning.
const FITZGERALD_BG: Record<string, string> = {
  yellow: "bg-[#FEF3C7] border-[#F59E0B]",
  green:  "bg-[#D1FAE5] border-[#10B981]",
  blue:   "bg-[#DBEAFE] border-[#3B82F6]",
  pink:   "bg-[#FCE7F3] border-[#EC4899]",
  orange: "bg-[#FFEDD5] border-[#F97316]",
  white:  "bg-[#F9FAFB] border-[#D4D4D8]",
};

const FITZGERALD_TEXT: Record<string, string> = {
  yellow: "text-amber-800",
  green:  "text-emerald-800",
  blue:   "text-blue-800",
  pink:   "text-pink-800",
  orange: "text-orange-800",
  white:  "text-zinc-700",
};

const CATEGORY_LABEL: Record<string, string> = {
  noun:      "İsim",
  verb:      "Fiil",
  adjective: "Sıfat/Zarf",
  social:    "Sosyal",
  question:  "Soru",
  other:     "Diğer",
};

const BOARD_TYPE_LABEL: Record<string, string> = {
  basic_needs:    "Temel İhtiyaçlar",
  emotions:       "Duygular",
  daily_routines: "Günlük Rutinler",
  school:         "Okul Aktiviteleri",
  social:         "Sosyal İfadeler",
  requests:       "İstek ve Seçim",
  custom:         "Özel",
};

function BoardCell({ cell, colorCoding }: { cell: CommBoardCell; colorCoding: boolean }) {
  const color = colorCoding ? (cell.fitzgeraldColor ?? "white") : "white";
  const bgCls = FITZGERALD_BG[color] ?? FITZGERALD_BG.white;
  const txtCls = FITZGERALD_TEXT[color] ?? FITZGERALD_TEXT.white;

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border-2 border-dashed p-3 min-h-[100px]",
        bgCls
      )}
    >
      {/* Word */}
      <p className={cn("text-center font-bold text-base leading-tight mb-1", txtCls)}>
        {cell.word}
      </p>

      {/* Visual placeholder — stays light to match the always-light Fitzgerald cell */}
      <div className="flex-1 flex items-center justify-center rounded-lg bg-white/60 border border-dashed border-zinc-300 px-2 py-1.5 my-1 min-h-[48px]">
        <p className="text-[10px] text-zinc-500 italic text-center leading-snug">
          {cell.visualDescription}
        </p>
      </div>

      {/* Sentence (if provided) */}
      {cell.sentence && (
        <p className={cn("text-center text-[10px] leading-snug mt-1 opacity-70", txtCls)}>
          {cell.sentence}
        </p>
      )}

      {/* Category badge */}
      {colorCoding && (
        <span className={cn("mt-1 self-end text-[9px] font-semibold uppercase tracking-wide opacity-60", txtCls)}>
          {CATEGORY_LABEL[cell.category] ?? cell.category}
        </span>
      )}
    </div>
  );
}

export function CommBoardView({ board }: { board: CommBoardContent }) {
  const colorCoding = board.colorCoding !== false;
  const cells       = Array.isArray(board.cells) ? board.cells : [];
  const cols        = board.cols ?? 3;
  const rows        = board.rows ?? Math.ceil(cells.length / cols);

  // Build grid rows
  const gridRows: CommBoardCell[][] = [];
  for (let r = 0; r < rows; r++) {
    gridRows.push(cells.slice(r * cols, (r + 1) * cols));
  }

  return (
    <div className="space-y-6">
      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        {board.boardType && (
          <span className="rounded-full bg-[var(--poster-accent-soft)] border border-[var(--poster-accent)] px-2.5 py-0.5 text-xs font-medium text-[var(--poster-accent)]">
            {BOARD_TYPE_LABEL[board.boardType] ?? board.boardType}
          </span>
        )}
        {board.symbolCount && (
          <span className="rounded-full bg-[var(--poster-ink-faint)] border border-[var(--poster-ink-faint)] px-2.5 py-0.5 text-xs font-medium text-[var(--poster-ink-2)]">
            {board.symbolCount} sembol
          </span>
        )}
        {board.layout && (
          <span className="rounded-full bg-[var(--poster-ink-faint)] border border-[var(--poster-ink-faint)] px-2.5 py-0.5 text-xs font-medium text-[var(--poster-ink-2)]">
            {board.layout === "grid" ? "Grid" : "Satır"}
          </span>
        )}
        {colorCoding && (
          <span className="rounded-full bg-[var(--poster-yellow-soft)] border border-[var(--poster-yellow)] px-2.5 py-0.5 text-xs font-medium text-[var(--poster-ink)]">
            Fitzgerald renk kodu
          </span>
        )}
      </div>

      {/* Fitzgerald legend */}
      {colorCoding && (
        <div className="rounded-xl border border-[var(--poster-ink-faint)] bg-[var(--poster-bg-2)] px-4 py-3">
          <p className="text-[10px] font-semibold text-[var(--poster-ink-3)] uppercase tracking-wide mb-2">Fitzgerald Renk Anahtarı</p>
          <div className="flex flex-wrap gap-1.5">
            {(["yellow","green","blue","pink","orange","white"] as const).map((c) => (
              <span key={c} className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", FITZGERALD_BG[c], FITZGERALD_TEXT[c])}>
                {c === "yellow" ? "Sarı — İsim" : c === "green" ? "Yeşil — Fiil" : c === "blue" ? "Mavi — Sıfat" : c === "pink" ? "Pembe — Sosyal" : c === "orange" ? "Turuncu — Soru" : "Beyaz — Diğer"}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Board grid */}
      <div className="rounded-2xl border-2 border-dashed border-[var(--poster-ink-faint)] p-4 bg-[var(--poster-panel)]">
        <p className="text-[10px] font-semibold text-[var(--poster-ink-3)] uppercase tracking-wide mb-3 text-center">
          İLETİŞİM PANOSU — {rows}×{cols}
        </p>
        {board.layout === "strip" ? (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {cells.map((cell, i) => (
              <div key={i} className="shrink-0 w-24">
                <BoardCell cell={cell} colorCoding={colorCoding} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {gridRows.map((row, ri) => (
              <div key={ri} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                {row.map((cell, ci) => (
                  <BoardCell key={ci} cell={cell} colorCoding={colorCoding} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      {board.instructions && (
        <div className="rounded-xl border border-[var(--poster-ink-faint)] bg-[var(--poster-bg-2)] p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Info className="h-4 w-4 text-[var(--poster-ink-3)]" />
            <p className="text-xs font-semibold text-[var(--poster-ink-2)]">Kullanım Talimatları</p>
          </div>
          <p className="text-sm text-[var(--poster-ink-2)] leading-relaxed">{board.instructions}</p>
        </div>
      )}

      {/* Expert notes */}
      {board.expertNotes && (
        <div className="rounded-xl border border-[var(--alert-warning-border)] bg-[var(--alert-warning-bg)] p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="h-4 w-4 text-[var(--alert-warning-text)]" />
            <p className="text-xs font-semibold text-[var(--alert-warning-text)]">Uzman Notları</p>
          </div>
          <p className="text-sm text-[var(--alert-warning-text)] leading-relaxed">{board.expertNotes}</p>
        </div>
      )}

      {/* Home guidance */}
      {board.homeGuidance && (
        <div className="rounded-xl border border-[var(--alert-info-border)] bg-[var(--alert-info-bg)] p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Home className="h-4 w-4 text-[var(--alert-info-text)]" />
            <p className="text-xs font-semibold text-[var(--alert-info-text)]">Veli Rehberi</p>
          </div>
          <p className="text-sm text-[var(--alert-info-text)] leading-relaxed">{board.homeGuidance}</p>
        </div>
      )}

      {/* Adaptations */}
      {board.adaptations && (
        <div className="rounded-xl border border-[var(--poster-ink-faint)] bg-[var(--poster-bg-2)] p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <BookOpen className="h-4 w-4 text-[var(--poster-ink-3)]" />
            <p className="text-xs font-semibold text-[var(--poster-ink-2)]">Uyarlama Önerileri</p>
          </div>
          <p className="text-sm text-[var(--poster-ink-2)] leading-relaxed">{board.adaptations}</p>
        </div>
      )}
    </div>
  );
}
