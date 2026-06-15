"use client";

import { Home, ChevronRight, Lightbulb, BookOpen, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WeeklyPlanWarmup {
  activity: string;
  duration: string;
  materials?: string[];
}

export interface WeeklyPlanMainWork {
  activity: string;
  duration: string;
  steps?: string[];
  materials?: string[];
  targetGoals?: string[];
}

export interface WeeklyPlanClosing {
  activity: string;
  duration: string;
}

export interface WeeklyPlanDay {
  dayNumber: number;
  dayName: string;
  date: string;
  duration: string;
  focusArea: string;
  objective: string;
  warmup: WeeklyPlanWarmup;
  mainWork: WeeklyPlanMainWork;
  closing: WeeklyPlanClosing;
  notes?: string | null;
}

export interface WeeklyPlanContent {
  title: string;
  weekRange: string;
  studentSummary?: string;
  days: WeeklyPlanDay[];
  weeklyGoal?: string;
  materialsNeeded?: string[];
  parentCommunication?: string;
  expertNotes?: string;
  nextWeekSuggestion?: string;
  sessionsPerWeek?: number;
  sessionDuration?: string;
  focusAreas?: string[];
}

const FOCUS_COLORS: Record<string, string> = {
  "Artikülasyon":         "bg-[var(--poster-accent-soft)] text-[var(--poster-accent)] border-[var(--poster-accent)]",
  "Dil gelişimi":         "bg-[var(--poster-blue-soft)] text-[var(--poster-blue)] border-[var(--poster-blue)]",
  "Akıcı konuşma":        "bg-[var(--poster-pink-soft)] text-[var(--poster-pink)] border-[var(--poster-pink)]",
  "Pragmatik dil":        "bg-[var(--poster-ink-faint)] text-[var(--poster-ink)] border-[var(--poster-ink-faint)]",
  "İşitsel algı":         "bg-[var(--poster-yellow-soft)] text-[var(--poster-ink)] border-[var(--poster-yellow)]",
  "Oral motor":           "bg-[var(--poster-green-soft)] text-[var(--poster-green)] border-[var(--poster-green)]",
};

function focusBadgeClass(area: string) {
  for (const [key, cls] of Object.entries(FOCUS_COLORS)) {
    if (area.toLowerCase().includes(key.toLowerCase())) return cls;
  }
  return "bg-[var(--poster-ink-faint)] text-[var(--poster-ink)] border-[var(--poster-ink-faint)]";
}

function DayCard({ day }: { day: WeeklyPlanDay }) {
  return (
    <div className="rounded-2xl border-2 border-[var(--poster-ink)] bg-[var(--poster-panel)] overflow-hidden shadow-[var(--poster-shadow-md)]">
      {/* Day header */}
      <div className="flex items-center justify-between px-5 py-3 bg-[var(--poster-bg-2)] border-b-2 border-[var(--poster-ink)]">
        <div>
          <p className="text-sm font-bold text-[var(--poster-ink)]">{day.dayName}</p>
          <p className="text-xs text-[var(--poster-ink-3)]">{day.date}</p>
        </div>
        <span className="rounded-full bg-[var(--poster-ink-faint)] px-2.5 py-0.5 text-xs font-medium text-[var(--poster-ink-2)]">
          {day.duration}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Focus + Objective */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", focusBadgeClass(day.focusArea))}>
            {day.focusArea}
          </span>
        </div>
        <p className="text-sm font-semibold text-[var(--poster-ink)] leading-snug">{day.objective}</p>

        {/* Warmup */}
        <div className="rounded-xl bg-[var(--alert-info-bg)] border border-[var(--alert-info-border)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🌅</span>
            <p className="text-xs font-semibold text-[var(--alert-info-text)] uppercase tracking-wide">Isınma</p>
            <span className="ml-auto text-[10px] text-[var(--alert-info-text)] opacity-70">{day.warmup.duration}</span>
          </div>
          <p className="text-sm text-[var(--alert-info-text)] leading-relaxed">{day.warmup.activity}</p>
          {day.warmup.materials && day.warmup.materials.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {day.warmup.materials.map((m, i) => (
                <span key={i} className="rounded bg-[var(--poster-blue-soft)] px-1.5 py-0.5 text-[10px] text-[var(--alert-info-text)]">{m}</span>
              ))}
            </div>
          )}
        </div>

        {/* Main work */}
        <div className="rounded-xl border border-[var(--poster-ink-faint)] bg-[var(--poster-panel)] border-l-4 border-l-[var(--poster-blue)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">📚</span>
            <p className="text-xs font-semibold text-[var(--poster-blue)] uppercase tracking-wide">Ana Çalışma</p>
            <span className="ml-auto text-[10px] text-[var(--poster-ink-3)]">{day.mainWork.duration}</span>
          </div>
          <p className="text-sm text-[var(--poster-ink)] leading-relaxed mb-3">{day.mainWork.activity}</p>
          {day.mainWork.steps && day.mainWork.steps.length > 0 && (
            <ol className="space-y-1 mb-3">
              {day.mainWork.steps.map((step, i) => (
                <li key={i} className="flex gap-2 text-sm text-[var(--poster-ink-2)]">
                  <span className="shrink-0 font-semibold text-[var(--poster-blue)]">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
          {day.mainWork.targetGoals && day.mainWork.targetGoals.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {day.mainWork.targetGoals.map((g, i) => (
                <span key={i} className="rounded-full bg-[var(--poster-ink-faint)] border border-[var(--poster-ink-faint)] px-2 py-0.5 text-[10px] text-[var(--poster-ink)]">🎯 {g}</span>
              ))}
            </div>
          )}
          {day.mainWork.materials && day.mainWork.materials.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {day.mainWork.materials.map((m, i) => (
                <span key={i} className="rounded bg-[var(--poster-ink-faint)] px-1.5 py-0.5 text-[10px] text-[var(--poster-ink-2)]">{m}</span>
              ))}
            </div>
          )}
        </div>

        {/* Closing */}
        <div className="rounded-xl bg-[var(--alert-success-bg)] border border-[var(--alert-success-border)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🎯</span>
            <p className="text-xs font-semibold text-[var(--alert-success-text)] uppercase tracking-wide">Kapanış</p>
            <span className="ml-auto text-[10px] text-[var(--alert-success-text)] opacity-70">{day.closing.duration}</span>
          </div>
          <p className="text-sm text-[var(--alert-success-text)] leading-relaxed">{day.closing.activity}</p>
        </div>

        {/* Day notes */}
        {day.notes && (
          <p className="text-xs text-[var(--poster-ink-3)] italic border-t border-[var(--poster-ink-faint)] pt-3">{day.notes}</p>
        )}
      </div>
    </div>
  );
}

export function WeeklyPlanView({ plan }: { plan: WeeklyPlanContent }) {
  const days = Array.isArray(plan.days) ? plan.days : [];

  return (
    <div className="space-y-6">
      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-[var(--poster-accent-soft)] border border-[var(--poster-accent)] px-2.5 py-0.5 text-xs font-medium text-[var(--poster-accent)]">
          {plan.weekRange}
        </span>
        <span className="rounded-full bg-[var(--poster-ink-faint)] border border-[var(--poster-ink-faint)] px-2.5 py-0.5 text-xs font-medium text-[var(--poster-ink-2)]">
          {days.length} ders
        </span>
        {plan.sessionDuration && (
          <span className="rounded-full bg-[var(--poster-ink-faint)] border border-[var(--poster-ink-faint)] px-2.5 py-0.5 text-xs font-medium text-[var(--poster-ink-2)]">
            {plan.sessionDuration} dk/ders
          </span>
        )}
        {plan.focusAreas?.map((a, i) => (
          <span key={i} className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", focusBadgeClass(a))}>
            {a}
          </span>
        ))}
      </div>

      {/* Student summary */}
      {plan.studentSummary && (
        <div className="rounded-xl border border-[var(--poster-ink-faint)] bg-[var(--poster-bg-2)] px-4 py-3">
          <p className="text-xs font-semibold text-[var(--poster-ink-3)] mb-1">Öğrenci Özeti</p>
          <p className="text-sm text-[var(--poster-ink-2)] leading-relaxed">{plan.studentSummary}</p>
        </div>
      )}

      {/* Day cards */}
      <div className="space-y-4">
        {days.map((day, i) => (
          <DayCard key={i} day={day} />
        ))}
      </div>

      {/* Weekly goal */}
      {plan.weeklyGoal && (
        <div className="rounded-2xl border-2 border-[var(--poster-accent)] bg-[var(--poster-accent-soft)] p-5">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="h-4 w-4 text-[var(--poster-accent)]" />
            <p className="text-sm font-bold text-[var(--poster-accent)]">Haftalık Hedef</p>
          </div>
          <p className="text-sm text-[var(--poster-ink)] leading-relaxed">{plan.weeklyGoal}</p>
        </div>
      )}

      {/* Materials needed */}
      {plan.materialsNeeded && plan.materialsNeeded.length > 0 && (
        <div className="rounded-xl border border-[var(--poster-ink-faint)] bg-[var(--poster-panel)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-[var(--poster-ink-3)]" />
            <p className="text-sm font-semibold text-[var(--poster-ink-2)]">Haftalık Materyaller</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {plan.materialsNeeded.map((m, i) => (
              <span key={i} className="rounded-full bg-[var(--poster-ink-faint)] border border-[var(--poster-ink-faint)] px-2.5 py-1 text-xs text-[var(--poster-ink-2)]">{m}</span>
            ))}
          </div>
        </div>
      )}

      {/* Parent communication */}
      {plan.parentCommunication && (
        <div className="rounded-xl border border-[var(--alert-info-border)] bg-[var(--alert-info-bg)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Home className="h-4 w-4 text-[var(--alert-info-text)]" />
            <p className="text-xs font-semibold text-[var(--alert-info-text)]">Veli Bilgilendirmesi</p>
          </div>
          <p className="text-sm text-[var(--alert-info-text)] leading-relaxed">{plan.parentCommunication}</p>
        </div>
      )}

      {/* Expert notes */}
      {plan.expertNotes && (
        <div className="rounded-xl border border-[var(--alert-warning-border)] bg-[var(--alert-warning-bg)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-[var(--alert-warning-text)]" />
            <p className="text-xs font-semibold text-[var(--alert-warning-text)]">Uzman Notları</p>
          </div>
          <p className="text-sm text-[var(--alert-warning-text)] leading-relaxed">{plan.expertNotes}</p>
        </div>
      )}

      {/* Next week suggestion */}
      {plan.nextWeekSuggestion && (
        <div className="rounded-xl border border-[var(--poster-ink-faint)] bg-[var(--poster-bg-2)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <ChevronRight className="h-4 w-4 text-[var(--poster-ink-3)]" />
            <p className="text-xs font-semibold text-[var(--poster-ink-2)]">Gelecek Hafta Önerisi</p>
          </div>
          <p className="text-sm text-[var(--poster-ink-2)] leading-relaxed">{plan.nextWeekSuggestion}</p>
        </div>
      )}
    </div>
  );
}
