import { Lightbulb, Eye, Star, Clock, Package, ChevronRight } from "lucide-react";

export interface HomeworkStep {
  stepNumber: number;
  instruction: string;
  tip?: string;
}

export interface HomeworkContent {
  title: string;
  materialType: "exercise" | "observation" | "daily_activity";
  duration: string;
  targetArea: string;
  introduction: string;
  materials?: string[];
  steps: HomeworkStep[];
  watchFor: string;
  celebration: string;
  frequency: string;
  expertNotes?: string;
  adaptations?: string;
}

const MATERIAL_TYPE_LABEL: Record<string, string> = {
  exercise:       "Ev Egzersizi",
  observation:    "Gözlem Formu",
  daily_activity: "Günlük Aktivite",
};

const MATERIAL_TYPE_COLOR: Record<string, string> = {
  exercise:       "bg-[var(--poster-blue-soft)] text-[var(--poster-blue)] border-[var(--poster-blue)]",
  observation:    "bg-[var(--poster-ink-faint)] text-[var(--poster-ink)] border-[var(--poster-ink-faint)]",
  daily_activity: "bg-[var(--poster-yellow-soft)] text-[var(--poster-ink)] border-[var(--poster-yellow)]",
};

export function HomeworkView({ hw }: { hw: HomeworkContent }) {
  return (
    <div className="space-y-5">
      {/* Başlık + badge'ler */}
      <div>
        <h2 className="text-lg font-bold text-[var(--poster-ink)] mb-3">{hw.title}</h2>
        <div className="flex flex-wrap gap-1.5">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${MATERIAL_TYPE_COLOR[hw.materialType] ?? "bg-[var(--poster-ink-faint)] text-[var(--poster-ink-2)] border-[var(--poster-ink-faint)]"}`}>
            {MATERIAL_TYPE_LABEL[hw.materialType] ?? hw.materialType}
          </span>
          {hw.duration && (
            <span className="rounded-full border border-[var(--poster-ink-faint)] bg-[var(--poster-ink-faint)] px-2.5 py-0.5 text-xs text-[var(--poster-ink-2)] flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {hw.duration}
            </span>
          )}
          {hw.targetArea && (
            <span className="rounded-full border border-[var(--poster-ink-faint)] bg-[var(--poster-ink-faint)] px-2.5 py-0.5 text-xs text-[var(--poster-ink-2)]">
              {hw.targetArea}
            </span>
          )}
        </div>
      </div>

      {/* Giriş */}
      {hw.introduction && (
        <div className="rounded-xl border border-[var(--poster-ink-faint)] bg-[var(--poster-bg-2)] p-4 flex gap-3">
          <Lightbulb className="h-4 w-4 text-[var(--poster-ink-3)] shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--poster-ink-2)] leading-relaxed">{hw.introduction}</p>
        </div>
      )}

      {/* Gerekli malzemeler */}
      {hw.materials && hw.materials.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-[var(--poster-ink-3)]" />
            <p className="text-xs font-semibold text-[var(--poster-ink-3)]">Gerekli Malzemeler</p>
          </div>
          <ul className="space-y-1">
            {hw.materials.map((m, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-[var(--poster-ink-2)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--poster-accent)] shrink-0" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Adımlar */}
      {hw.steps && hw.steps.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--poster-ink-3)] mb-3">Adımlar</p>
          <div className="space-y-2.5">
            {hw.steps.map((step, i) => (
              <div key={i} className="rounded-lg border border-[var(--poster-ink-faint)] bg-[var(--poster-panel)] p-3 flex gap-3">
                <span className="shrink-0 h-6 w-6 rounded-full bg-[var(--poster-blue-soft)] text-[var(--poster-blue)] text-xs font-bold flex items-center justify-center">
                  {step.stepNumber ?? i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--poster-ink)] leading-relaxed">{step.instruction}</p>
                  {step.tip && (
                    <p className="mt-1.5 rounded-md bg-[var(--poster-bg-2)] border border-[var(--poster-ink-faint)] px-2.5 py-1.5 text-xs italic text-[var(--poster-ink-3)]">
                      <ChevronRight className="inline h-3 w-3 mr-0.5" />
                      {step.tip}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dikkat Edin */}
      {hw.watchFor && (
        <div className="rounded-xl border border-[var(--alert-warning-border)] bg-[var(--alert-warning-bg)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-[var(--alert-warning-text)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--alert-warning-text)]">Dikkat Edin</span>
          </div>
          <p className="text-xs text-[var(--alert-warning-text)] leading-relaxed">{hw.watchFor}</p>
        </div>
      )}

      {/* Kutlama Anı */}
      {hw.celebration && (
        <div className="rounded-xl border border-[var(--poster-ink-faint)] bg-[var(--poster-ink-faint)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-[var(--poster-ink)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--poster-ink)]">Kutlama Anı</span>
          </div>
          <p className="text-xs text-[var(--poster-ink-2)] leading-relaxed">{hw.celebration}</p>
        </div>
      )}

      {/* Tekrar sıklığı */}
      {hw.frequency && (
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-[var(--poster-ink-3)]" />
          <span className="text-xs text-[var(--poster-ink-3)]">Öneri: <span className="font-medium text-[var(--poster-ink-2)]">{hw.frequency}</span></span>
        </div>
      )}

      {/* Uyarlama önerileri */}
      {hw.adaptations && (
        <div className="rounded-xl border border-[var(--poster-ink-faint)] bg-[var(--poster-bg-2)] p-4">
          <p className="text-xs font-semibold text-[var(--poster-ink-3)] mb-1.5">Uyarlama Önerileri</p>
          <p className="text-xs text-[var(--poster-ink-2)] leading-relaxed">{hw.adaptations}</p>
        </div>
      )}

      {/* Uzman Notları */}
      {hw.expertNotes && (
        <div className="rounded-xl border border-[var(--alert-warning-border)] bg-[var(--alert-warning-bg)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-[var(--alert-warning-text)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--alert-warning-text)]">Uzman Notları</span>
          </div>
          <p className="text-xs text-[var(--alert-warning-text)] leading-relaxed">{hw.expertNotes}</p>
        </div>
      )}
    </div>
  );
}
