import { Lightbulb, Home } from "lucide-react";
import { FlashcardGrid } from "./FlashcardGrid";

export interface DrillItem {
  word?: string;
  syllable?: string;
  exampleWord?: string;
  syllableCount?: number;
  syllableBreak?: string;
  syllableType?: string;
  position?: string;
  targetSound?: string;
  sentence?: string;
  visualPrompt?: string;
  repetitionPattern?: string;
  imageUrl?: string;
}

export interface ArticulationContent {
  title: string;
  targetSounds: string[];
  positions: string[];
  level: string;
  items: DrillItem[];
  expertNotes?: string;
  cueTypes?: string[];
  homeGuidance?: string;
}

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

export function ArticulationView({ drill }: { drill: ArticulationContent }) {
  const sounds = drill.targetSounds ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[var(--poster-ink)] mb-3">{drill.title}</h2>
        <div className="flex flex-wrap gap-1.5">
          {sounds.map((s) => (
            <span key={s} className="rounded-full bg-[var(--poster-blue-soft)] border border-[var(--poster-blue)] px-2.5 py-0.5 text-xs font-semibold text-[var(--poster-blue)]">
              {s}
            </span>
          ))}
          {(drill.positions ?? []).map((p) => (
            <span key={p} className="rounded-full bg-[var(--poster-ink-faint)] border border-[var(--poster-ink-faint)] px-2.5 py-0.5 text-xs text-[var(--poster-ink-2)]">
              {POSITION_LABEL[p] ?? p}
            </span>
          ))}
          <span className="rounded-full bg-[var(--poster-accent-soft)] border border-[var(--poster-accent)] px-2.5 py-0.5 text-xs text-[var(--poster-accent)]">
            {LEVEL_LABEL[drill.level] ?? drill.level}
          </span>
          <span className="rounded-full bg-[var(--poster-ink-faint)] border border-[var(--poster-ink-faint)] px-2.5 py-0.5 text-xs text-[var(--poster-ink-2)]">
            {drill.items?.length ?? 0} öğe
          </span>
        </div>
      </div>

      <div>
        <FlashcardGrid
          items={drill.items}
          sounds={sounds}
          showSentence={drill.level === "sentence" || drill.level === "contextual"}
        />
      </div>

      {drill.cueTypes?.length ? (
        <div>
          <p className="text-xs font-semibold text-[var(--poster-ink-3)] mb-2">İpucu Türleri</p>
          <div className="flex flex-wrap gap-2">
            {drill.cueTypes.map((c, i) => (
              <span key={i} className="rounded-full border border-[var(--poster-ink-faint)] bg-[var(--poster-bg-2)] px-3 py-1 text-xs text-[var(--poster-ink-2)]">
                {c}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {drill.expertNotes && (
        <div className="rounded-xl border border-[var(--alert-warning-border)] bg-[var(--alert-warning-bg)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-[var(--alert-warning-text)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--alert-warning-text)]">Uzman Notları</span>
          </div>
          <p className="text-xs text-[var(--alert-warning-text)] leading-relaxed">{drill.expertNotes}</p>
        </div>
      )}

      {drill.homeGuidance && (
        <div className="rounded-xl border border-[var(--alert-info-border)] bg-[var(--alert-info-bg)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Home className="h-4 w-4 text-[var(--alert-info-text)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--alert-info-text)]">Veli Rehberi</span>
          </div>
          <p className="text-xs text-[var(--alert-info-text)] leading-relaxed">{drill.homeGuidance}</p>
        </div>
      )}
    </div>
  );
}
