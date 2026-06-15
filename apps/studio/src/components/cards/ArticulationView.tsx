import { Lightbulb, Home } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

function primaryText(item: DrillItem): string {
  return item.word ?? item.syllable ?? item.repetitionPattern ?? item.sentence ?? "";
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

function highlightSound(text: string, sounds: string[]) {
  if (!sounds.length) return <span>{text}</span>;
  const letters = sounds.map((s) => s.replace(/\//g, "")).filter(Boolean);
  if (!letters.length) return <span>{text}</span>;
  const pattern = new RegExp(
    `(${letters.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi"
  );
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <span key={i} className="font-bold text-[var(--poster-accent)]">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function IsolatedView({ items }: { items: DrillItem[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-center gap-3 rounded-lg border border-[var(--poster-ink-faint)] bg-[var(--poster-bg-2)] px-4 py-2.5">
          <span className="text-xs font-semibold text-[var(--poster-ink-3)] w-5">{i + 1}.</span>
          <span className="text-sm text-[var(--poster-ink)]">{primaryText(item)}</span>
        </li>
      ))}
    </ul>
  );
}

function SyllableView({ items }: { items: DrillItem[] }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-[var(--poster-blue)] bg-[var(--poster-blue-soft)] px-3 py-2.5 text-center">
          <span className="block text-sm font-semibold text-[var(--poster-blue)]">{primaryText(item)}</span>
          {item.exampleWord && (
            <span className="block text-[10px] text-[var(--poster-blue)]/70 mt-0.5">{item.exampleWord}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function WordView({ items, sounds }: { items: DrillItem[]; sounds: string[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--poster-ink-faint)]">
            <th className="pb-2 text-left text-xs font-semibold text-[var(--poster-ink-3)] w-8">#</th>
            <th className="pb-2 text-left text-xs font-semibold text-[var(--poster-ink-3)]">Kelime</th>
            <th className="pb-2 text-left text-xs font-semibold text-[var(--poster-ink-3)]">Heceler</th>
            <th className="pb-2 text-left text-xs font-semibold text-[var(--poster-ink-3)]">Pozisyon</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className={cn("border-b border-[var(--poster-ink-faint)]", i % 2 === 0 ? "bg-[var(--poster-panel)]" : "bg-[var(--poster-bg-2)]")}>
              <td className="py-2 text-xs text-[var(--poster-ink-3)]">{i + 1}</td>
              <td className="py-2 font-medium text-[var(--poster-ink)]">{highlightSound(primaryText(item), sounds)}</td>
              <td className="py-2 text-[var(--poster-ink-3)]">{item.syllableBreak ?? "—"}</td>
              <td className="py-2">
                <span className="rounded-full bg-[var(--poster-ink-faint)] px-2 py-0.5 text-xs text-[var(--poster-ink-3)]">
                  {POSITION_LABEL[item.position ?? ""] ?? item.position ?? "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SentenceView({ items, sounds }: { items: DrillItem[]; sounds: string[] }) {
  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-[var(--poster-ink-faint)] bg-[var(--poster-bg-2)] p-3">
          <p className="text-sm font-semibold text-[var(--poster-ink)] mb-1">
            {highlightSound(primaryText(item), sounds)}
          </p>
          {item.sentence && (
            <p className="text-xs text-[var(--poster-ink-2)] leading-relaxed">
              {highlightSound(item.sentence, sounds)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function ContextualView({ items, sounds }: { items: DrillItem[]; sounds: string[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-[var(--poster-ink-faint)] bg-[var(--poster-panel)] p-4">
          <p className="text-sm text-[var(--poster-ink-2)] leading-loose">
            {highlightSound(item.sentence ?? primaryText(item), sounds)}
          </p>
        </div>
      ))}
    </div>
  );
}

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
        {drill.level === "isolated"   && <IsolatedView   items={drill.items} />}
        {drill.level === "syllable"   && <SyllableView   items={drill.items} />}
        {drill.level === "word"       && <WordView       items={drill.items} sounds={sounds} />}
        {drill.level === "sentence"   && <SentenceView   items={drill.items} sounds={sounds} />}
        {drill.level === "contextual" && <ContextualView items={drill.items} sounds={sounds} />}
        {!["isolated","syllable","word","sentence","contextual"].includes(drill.level) && (
          <WordView items={drill.items} sounds={sounds} />
        )}
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
