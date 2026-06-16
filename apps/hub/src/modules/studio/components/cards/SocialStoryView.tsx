import { Lightbulb, Home } from "lucide-react";
import { cn } from "@studio/lib/utils";

export interface StorySentence {
  type: "descriptive" | "perspective" | "directive" | "affirmative";
  text: string;
  visualPrompt?: string;
}

export interface SocialStoryContent {
  title: string;
  sentences: StorySentence[];
  expertNotes?: string;
  homeGuidance?: string;
}

const SENTENCE_TYPE_LABEL: Record<string, string> = {
  descriptive: "Tanımlayıcı",
  perspective: "Perspektif",
  directive:   "Yönlendirici",
  affirmative: "Olumlu",
};

const SENTENCE_TYPE_COLOR: Record<string, string> = {
  descriptive: "bg-[var(--poster-blue-soft)] text-[var(--poster-blue)] border-[var(--poster-blue)]",
  perspective: "bg-[var(--poster-ink-faint)] text-[var(--poster-ink)] border-[var(--poster-ink-faint)]",
  directive:   "bg-[var(--poster-accent-soft)] text-[var(--poster-accent)] border-[var(--poster-accent)]",
  affirmative: "bg-[var(--poster-yellow-soft)] text-[var(--poster-ink)] border-[var(--poster-yellow)]",
};

export function SocialStoryView({ story }: { story: SocialStoryContent }) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-[var(--poster-ink)]">{story.title}</h2>

      <div className="space-y-2.5">
        {story.sentences?.map((s, i) => (
          <div key={i} className="flex gap-3 rounded-lg border border-[var(--poster-ink-faint)] bg-[var(--poster-bg-2)] p-3">
            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold h-fit mt-0.5",
                SENTENCE_TYPE_COLOR[s.type] ?? "bg-[var(--poster-ink-faint)] text-[var(--poster-ink-3)] border-[var(--poster-ink-faint)]"
              )}
            >
              {SENTENCE_TYPE_LABEL[s.type] ?? s.type}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--poster-ink)] leading-relaxed">{s.text}</p>
              {s.visualPrompt && (
                <p className="mt-1 text-xs italic text-[var(--poster-ink-3)]">{s.visualPrompt}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {story.expertNotes && (
        <div className="rounded-xl border border-[var(--alert-warning-border)] bg-[var(--alert-warning-bg)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-[var(--alert-warning-text)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--alert-warning-text)]">Uzman Notları</span>
          </div>
          <p className="text-xs text-[var(--alert-warning-text)] leading-relaxed">{story.expertNotes}</p>
        </div>
      )}

      {story.homeGuidance && (
        <div className="rounded-xl border border-[var(--alert-info-border)] bg-[var(--alert-info-bg)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Home className="h-4 w-4 text-[var(--alert-info-text)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--alert-info-text)]">Veli Rehberi</span>
          </div>
          <p className="text-xs text-[var(--alert-info-text)] leading-relaxed">{story.homeGuidance}</p>
        </div>
      )}
    </div>
  );
}
