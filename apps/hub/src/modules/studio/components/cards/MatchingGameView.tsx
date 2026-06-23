import { useState } from "react";
import { cn } from "@studio/lib/utils";
import { ChevronDown, ChevronUp, Lightbulb, Info } from "lucide-react";

export interface MatchingPair {
  id: number;
  cardA: string;
  cardB: string;
  hint?: string;
  visualPrompt?: string;
  imageUrl?: string;
}

export interface MatchingGameContent {
  title: string;
  matchType: "synonym" | "antonym" | "definition" | "image_desc" | "category" | "sentence";
  difficulty: "easy" | "medium" | "hard";
  pairs: MatchingPair[];
  instructions?: string;
  expertNotes?: string;
  adaptations?: string;
  theme?: string;
  pairCount?: number;
}

const MATCH_TYPE_LABEL: Record<string, string> = {
  definition: "Kelime — Tanım",
  image_desc: "Kelime — Resim Açıklaması",
  synonym:    "Eş Anlamlı",
  antonym:    "Zıt Anlamlı",
  category:   "Kategori Eşleştirme",
  sentence:   "Cümle Tamamlama",
};

const MATCH_TYPE_COLOR: Record<string, string> = {
  definition: "bg-[var(--poster-blue-soft)] text-[var(--poster-blue)] border-[var(--poster-blue)]",
  image_desc: "bg-[var(--poster-ink-faint)] text-[var(--poster-ink)] border-[var(--poster-ink-faint)]",
  synonym:    "bg-[var(--poster-green-soft)] text-[var(--poster-green)] border-[var(--poster-green)]",
  antonym:    "bg-[var(--poster-danger-soft)] text-[var(--poster-danger)] border-[var(--poster-danger)]",
  category:   "bg-[var(--poster-pink-soft)] text-[var(--poster-pink)] border-[var(--poster-pink)]",
  sentence:   "bg-[var(--poster-yellow-soft)] text-[var(--poster-ink)] border-[var(--poster-yellow)]",
};

const DIFFICULTY_LABEL: Record<string, string> = { easy: "Kolay", medium: "Orta", hard: "Zor" };
const DIFFICULTY_COLOR: Record<string, string> = {
  easy:   "bg-[var(--poster-green-soft)] text-[var(--poster-green)] border-[var(--poster-green)]",
  medium: "bg-[var(--poster-yellow-soft)] text-[var(--poster-ink)] border-[var(--poster-yellow)]",
  hard:   "bg-[var(--poster-danger-soft)] text-[var(--poster-danger)] border-[var(--poster-danger)]",
};

export function MatchingGameView({ game }: { game: MatchingGameContent }) {
  const [showAnswers, setShowAnswers] = useState(false);
  const pairs = Array.isArray(game.pairs) ? game.pairs : [];

  return (
    <div className="space-y-5">
      {/* Başlık + badge'ler */}
      <div>
        <h2 className="text-lg font-bold text-[var(--poster-ink)] mb-3 leading-snug">{game.title}</h2>
        <div className="flex flex-wrap gap-1.5">
          <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", MATCH_TYPE_COLOR[game.matchType] ?? "bg-[var(--poster-ink-faint)] text-[var(--poster-ink-2)] border-[var(--poster-ink-faint)]")}>
            {MATCH_TYPE_LABEL[game.matchType] ?? game.matchType}
          </span>
          <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", DIFFICULTY_COLOR[game.difficulty] ?? "bg-[var(--poster-ink-faint)] text-[var(--poster-ink-2)] border-[var(--poster-ink-faint)]")}>
            {DIFFICULTY_LABEL[game.difficulty] ?? game.difficulty}
          </span>
          <span className="rounded-full border border-[var(--poster-ink-faint)] bg-[var(--poster-bg-2)] px-2.5 py-0.5 text-xs text-[var(--poster-ink-2)]">
            {pairs.length} çift
          </span>
          {game.theme && (
            <span className="rounded-full border border-[var(--poster-ink-faint)] bg-[var(--poster-bg-2)] px-2.5 py-0.5 text-xs text-[var(--poster-ink-2)]">
              {game.theme}
            </span>
          )}
        </div>
      </div>

      {/* Tablo */}
      <div className="rounded-xl border border-[var(--poster-ink-faint)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--poster-bg-2)] border-b border-[var(--poster-ink-faint)]">
              <th className="w-8 py-2.5 px-3 text-left text-xs font-semibold text-[var(--poster-ink-3)]">#</th>
              <th className="py-2.5 px-3 text-left text-xs font-semibold text-[var(--poster-ink-2)]">Kart A</th>
              <th className="py-2.5 px-3 text-left text-xs font-semibold text-[var(--poster-ink-2)]">Kart B</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair, i) => (
              <tr key={pair.id ?? i} className={cn("border-b border-[var(--poster-ink-faint)] last:border-0", i % 2 === 1 && "bg-[var(--poster-bg-2)]")}>
                <td className="py-2.5 px-3 text-xs text-[var(--poster-ink-3)] font-medium">{pair.id ?? i + 1}</td>
                <td className="py-2.5 px-3 text-sm font-medium text-[var(--poster-ink)]">
                  <div className="flex items-center gap-2">
                    {pair.imageUrl && <img src={pair.imageUrl} alt={pair.cardA} className="h-12 w-12 shrink-0 rounded bg-white object-contain" />}
                    <span>{pair.cardA}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-sm text-[var(--poster-ink-2)]">
                  {pair.cardB}
                  {pair.hint && (
                    <span className="ml-1.5 text-[10px] text-[var(--poster-ink-3)] italic">({pair.hint})</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Talimatlar */}
      {game.instructions && (
        <div className="rounded-xl border border-[var(--poster-ink-faint)] bg-[var(--poster-bg-2)] p-4 flex gap-3">
          <Info className="h-4 w-4 text-[var(--poster-ink-3)] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[var(--poster-ink-3)] mb-1">Nasıl Oynanır</p>
            <p className="text-sm text-[var(--poster-ink-2)] leading-relaxed">{game.instructions}</p>
          </div>
        </div>
      )}

      {/* Uyarlama */}
      {game.adaptations && (
        <div className="rounded-xl border border-[var(--poster-ink-faint)] bg-[var(--poster-panel)] p-4">
          <p className="text-xs font-semibold text-[var(--poster-ink-3)] mb-1.5">Uyarlama Önerileri</p>
          <p className="text-sm text-[var(--poster-ink-2)] leading-relaxed">{game.adaptations}</p>
        </div>
      )}

      {/* Uzman Notları */}
      {game.expertNotes && (
        <div className="rounded-xl border border-[var(--alert-warning-border)] bg-[var(--alert-warning-bg)] p-4 flex gap-3">
          <Lightbulb className="h-4 w-4 text-[var(--alert-warning-text)] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[var(--alert-warning-text)] mb-1">Uzman Notları</p>
            <p className="text-xs text-[var(--alert-warning-text)] leading-relaxed">{game.expertNotes}</p>
          </div>
        </div>
      )}

      {/* Cevap Anahtarı */}
      <div className="rounded-xl border border-[var(--poster-ink-faint)] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAnswers((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-[var(--poster-ink-2)] bg-[var(--poster-bg-2)] hover:bg-[var(--poster-ink-faint)] transition-colors"
        >
          Cevap Anahtarı
          {showAnswers ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {showAnswers && (
          <div className="p-4 space-y-1.5 bg-[var(--poster-panel)]">
            {pairs.map((pair, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-[var(--poster-ink-2)]">
                <span className="w-5 shrink-0 font-semibold text-[var(--poster-ink-3)]">{pair.id ?? i + 1}.</span>
                <span className="font-medium text-[var(--poster-ink)]">{pair.cardA}</span>
                <span className="text-[var(--poster-ink-3)]">→</span>
                <span>{pair.cardB}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
