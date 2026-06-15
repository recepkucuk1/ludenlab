import { Calendar, Clock, Users, TrendingUp, Home, Lock, ChevronRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GoalPerformance {
  goal: string;
  accuracy: string;
  cueLevel: string;
  analysis: string;
  recommendation: string;
}

export interface SessionSummaryContent {
  title: string;
  sessionInfo: {
    date: string;
    duration: string;
    type: string;
    student: string;
  };
  goalPerformance: GoalPerformance[];
  overallAssessment: string;
  behaviorNotes?: string;
  nextSessionPlan: string;
  parentNote: string;
  expertNotes?: string;
  // metadata
  sessionType?: string;
  overallPerformance?: string;
  sessionDate?: string;
}

function parseAccuracy(acc: string | number): number {
  if (typeof acc === "number") return Math.min(100, Math.max(0, acc));
  const m = String(acc).match(/\d+/);
  return m ? Math.min(100, Math.max(0, parseInt(m[0]))) : 0;
}

function accuracyBarColor(pct: number): string {
  if (pct >= 81) return "var(--poster-green)";
  if (pct >= 61) return "var(--poster-yellow)";
  if (pct >= 31) return "var(--poster-accent)";
  return "var(--poster-danger)";
}

function accuracyBadgeCls(pct: number): string {
  if (pct >= 81) return "bg-[var(--poster-green-soft)] text-[var(--poster-green)] border-[var(--poster-green)]";
  if (pct >= 61) return "bg-[var(--poster-yellow-soft)] text-[var(--poster-ink)] border-[var(--poster-yellow)]";
  if (pct >= 31) return "bg-[var(--poster-accent-soft)] text-[var(--poster-accent)] border-[var(--poster-accent)]";
  return "bg-[var(--poster-danger-soft)] text-[var(--poster-danger)] border-[var(--poster-danger)]";
}

const CUE_LEVEL_CLS: Record<string, string> = {
  "Bağımsız":        "bg-[var(--poster-green-soft)] text-[var(--poster-green)] border-[var(--poster-green)]",
  "Minimum İpucu":   "bg-[var(--poster-blue-soft)] text-[var(--poster-blue)] border-[var(--poster-blue)]",
  "Orta İpucu":      "bg-[var(--poster-yellow-soft)] text-[var(--poster-ink)] border-[var(--poster-yellow)]",
  "Maksimum İpucu":  "bg-[var(--poster-accent-soft)] text-[var(--poster-accent)] border-[var(--poster-accent)]",
  "Tam Destek":      "bg-[var(--poster-danger-soft)] text-[var(--poster-danger)] border-[var(--poster-danger)]",
};

const SESSION_TYPE_LABEL: Record<string, string> = {
  individual:     "Bireysel",
  group:          "Grup",
  assessment:     "Değerlendirme",
  parent_meeting: "Veli Görüşmesi",
};

const PERFORMANCE_LABEL: Record<string, string> = {
  above_target:  "Beklenenin Üstünde",
  on_target:     "Hedefle Uyumlu",
  progressing:   "Gelişim Gösteriyor",
  needs_support: "Ek Destek Gerekiyor",
  not_assessed:  "Değerlendirme Yapılamadı",
};

const PERFORMANCE_CLS: Record<string, string> = {
  above_target:  "bg-[var(--poster-green-soft)] text-[var(--poster-green)] border-[var(--poster-green)]",
  on_target:     "bg-[var(--poster-blue-soft)] text-[var(--poster-blue)] border-[var(--poster-blue)]",
  progressing:   "bg-[var(--poster-yellow-soft)] text-[var(--poster-ink)] border-[var(--poster-yellow)]",
  needs_support: "bg-[var(--poster-accent-soft)] text-[var(--poster-accent)] border-[var(--poster-accent)]",
  not_assessed:  "bg-[var(--poster-ink-faint)] text-[var(--poster-ink-3)] border-[var(--poster-ink-faint)]",
};

export function SessionSummaryView({ summary }: { summary: SessionSummaryContent }) {
  const goals = Array.isArray(summary.goalPerformance) ? summary.goalPerformance : [];

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div>
        <h2 className="text-lg font-bold text-[var(--poster-ink)] mb-3 leading-snug">{summary.title}</h2>

        {/* Oturum bilgileri badge'leri */}
        <div className="flex flex-wrap gap-1.5">
          {summary.sessionInfo?.date && (
            <span className="flex items-center gap-1 rounded-full border border-[var(--poster-ink-faint)] bg-[var(--poster-bg-2)] px-2.5 py-0.5 text-xs text-[var(--poster-ink-2)]">
              <Calendar className="h-3 w-3" />
              {summary.sessionInfo.date}
            </span>
          )}
          {summary.sessionInfo?.duration && (
            <span className="flex items-center gap-1 rounded-full border border-[var(--poster-ink-faint)] bg-[var(--poster-bg-2)] px-2.5 py-0.5 text-xs text-[var(--poster-ink-2)]">
              <Clock className="h-3 w-3" />
              {summary.sessionInfo.duration}
            </span>
          )}
          {(summary.sessionInfo?.type ?? SESSION_TYPE_LABEL[summary.sessionType ?? ""]) && (
            <span className="flex items-center gap-1 rounded-full border border-[var(--poster-ink-faint)] bg-[var(--poster-bg-2)] px-2.5 py-0.5 text-xs text-[var(--poster-ink-2)]">
              <Users className="h-3 w-3" />
              {summary.sessionInfo?.type ?? SESSION_TYPE_LABEL[summary.sessionType ?? ""]}
            </span>
          )}
          {summary.overallPerformance && (
            <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", PERFORMANCE_CLS[summary.overallPerformance] ?? "bg-[var(--poster-ink-faint)] text-[var(--poster-ink-3)] border-[var(--poster-ink-faint)]")}>
              {PERFORMANCE_LABEL[summary.overallPerformance] ?? summary.overallPerformance}
            </span>
          )}
        </div>
      </div>

      {/* Çalışılan Hedefler */}
      {goals.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingUp className="h-4 w-4 text-[var(--poster-ink-3)]" />
            <p className="text-xs font-semibold text-[var(--poster-ink-3)]">Çalışılan Hedefler ({goals.length})</p>
          </div>
          <div className="space-y-3">
            {goals.map((g, i) => {
              const pct = parseAccuracy(g.accuracy);
              return (
                <div key={i} className="rounded-xl border border-[var(--poster-ink-faint)] bg-[var(--poster-panel)] p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold text-[var(--poster-ink)] leading-snug flex-1">{g.goal}</p>
                    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs font-bold", accuracyBadgeCls(pct))}>
                      {g.accuracy}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-[var(--poster-ink-faint)] mb-3">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: accuracyBarColor(pct) }}
                    />
                  </div>
                  {/* Cue level */}
                  {g.cueLevel && (
                    <div className="mb-2">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", CUE_LEVEL_CLS[g.cueLevel] ?? "bg-[var(--poster-ink-faint)] text-[var(--poster-ink-3)] border-[var(--poster-ink-faint)]")}>
                        {g.cueLevel}
                      </span>
                    </div>
                  )}
                  {/* Analysis */}
                  {g.analysis && (
                    <p className="text-xs text-[var(--poster-ink-2)] leading-relaxed mb-1.5">{g.analysis}</p>
                  )}
                  {/* Recommendation */}
                  {g.recommendation && (
                    <div className="flex items-start gap-1.5 mt-2 rounded-md bg-[var(--poster-bg-2)] border border-[var(--poster-ink-faint)] px-2.5 py-1.5">
                      <ChevronRight className="h-3 w-3 text-[var(--poster-ink-3)] shrink-0 mt-0.5" />
                      <p className="text-xs text-[var(--poster-ink-3)] leading-relaxed">{g.recommendation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Genel Değerlendirme */}
      {summary.overallAssessment && (
        <div className="rounded-xl border border-[var(--alert-info-border)] bg-[var(--alert-info-bg)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-[var(--alert-info-text)] shrink-0" />
            <p className="text-xs font-semibold text-[var(--alert-info-text)]">Genel Değerlendirme</p>
          </div>
          <p className="text-sm text-[var(--alert-info-text)] leading-relaxed">{summary.overallAssessment}</p>
        </div>
      )}

      {/* Davranış ve Katılım */}
      {summary.behaviorNotes && (
        <div className="rounded-xl border border-[var(--poster-ink-faint)] bg-[var(--poster-bg-2)] p-4">
          <p className="text-xs font-semibold text-[var(--poster-ink-3)] mb-1.5">Davranış ve Katılım</p>
          <p className="text-sm text-[var(--poster-ink-2)] leading-relaxed">{summary.behaviorNotes}</p>
        </div>
      )}

      {/* Sonraki Oturum Planı */}
      {summary.nextSessionPlan && (
        <div className="rounded-xl border border-[var(--poster-ink-faint)] bg-[var(--poster-panel)] p-4 border-l-4 border-l-[var(--poster-green)]">
          <p className="text-xs font-semibold text-[var(--poster-ink-3)] mb-1.5">Sonraki Oturum Planı</p>
          <p className="text-sm text-[var(--poster-ink-2)] leading-relaxed">{summary.nextSessionPlan}</p>
        </div>
      )}

      {/* Veliye İletilecek Not */}
      {summary.parentNote && (
        <div className="rounded-xl border-2 border-[var(--poster-ink-faint)] bg-[var(--poster-ink-faint)] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 shrink-0 rounded-full bg-[var(--poster-ink-faint)] flex items-center justify-center">
              <Home className="h-4 w-4 text-[var(--poster-ink)]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--poster-ink)]">Veliye İletilecek Not</p>
              <p className="text-[10px] text-[var(--poster-ink-3)]">Bu bölümü veliye iletebilirsiniz</p>
            </div>
          </div>
          <p className="text-sm text-[var(--poster-ink-2)] leading-relaxed">{summary.parentNote}</p>
        </div>
      )}

      {/* Uzman Notları */}
      {summary.expertNotes && (
        <div className="rounded-xl border border-[var(--alert-warning-border)] bg-[var(--alert-warning-bg)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-4 w-4 text-[var(--alert-warning-text)] shrink-0" />
            <p className="text-xs font-semibold text-[var(--alert-warning-text)]">
              Uzman Notları
              <span className="ml-1 font-normal text-[var(--alert-warning-text)] opacity-70">(sadece uzman görür)</span>
            </p>
          </div>
          <p className="text-xs text-[var(--alert-warning-text)] leading-relaxed">{summary.expertNotes}</p>
        </div>
      )}
    </div>
  );
}
