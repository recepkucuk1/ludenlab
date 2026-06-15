"use client";

import { useState } from "react";
import { AREA_LABELS } from "@/lib/constants";
import { PLabel, PBadge } from "@/components/poster";

interface Curriculum {
  id: string;
  area: string;
  title: string;
}

interface CurriculumPickerProps {
  curricula: Curriculum[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  defaultOpenKey?: string; // Varsayılan açık accordion grubu (workArea değeri)
}

const TOP_GROUPS = [
  {
    key: "speech",
    label: "Konuşma",
    icon: "🗣️",
    areas: ["speech", "speech_sound", "motor_speech", "resonance", "voice"],
  },
  {
    key: "language",
    label: "Dil",
    icon: "📚",
    areas: ["language", "acquired_language"],
  },
  {
    key: "hearing",
    label: "İşitme",
    icon: "👂",
    areas: [
      "hearing", "hearing_language", "hearing_social", "hearing_learning",
      "hearing_literacy", "hearing_early_math", "hearing_math",
    ],
  },
];

export function CurriculumPicker({ curricula, selectedIds, onChange, defaultOpenKey }: CurriculumPickerProps) {
  const [openKeys, setOpenKeys] = useState<string[]>(defaultOpenKey ? [defaultOpenKey] : []);

  function toggleGroup(key: string) {
    setOpenKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function toggleId(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  }

  if (curricula.length === 0) return null;

  return (
    <div>
      <PLabel>
        Çalışma Modülleri{" "}
        <span style={{ fontWeight: 500, color: "var(--poster-ink-3)" }}>(isteğe bağlı)</span>
      </PLabel>

      <div
        style={{
          background: "var(--poster-panel)",
          border: "2px solid var(--poster-ink)",
          borderRadius: 12,
          boxShadow: "var(--poster-shadow-sm)",
          overflow: "hidden",
          fontFamily: "var(--font-display)",
        }}
      >
        {TOP_GROUPS.map((group, idx) => {
          const subGroups = group.areas
            .map((area) => ({ area, list: curricula.filter((c) => c.area === area) }))
            .filter((g) => g.list.length > 0);

          if (subGroups.length === 0) return null;

          const allIds = subGroups.flatMap((g) => g.list.map((c) => c.id));
          const selectedCount = allIds.filter((id) => selectedIds.includes(id)).length;
          const isOpen = openKeys.includes(group.key);

          return (
            <div
              key={group.key}
              style={{ borderTop: idx === 0 ? "none" : "2px dashed var(--poster-ink-faint)" }}
            >
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: isOpen ? "var(--poster-bg-2)" : "var(--poster-panel)",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-display)",
                  textAlign: "left",
                  transition: "background .12s",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{group.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--poster-ink)" }}>{group.label}</span>
                  {selectedCount > 0 && <PBadge color="accent">{selectedCount} seçili</PBadge>}
                </span>
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  style={{
                    color: "var(--poster-ink-3)",
                    transform: isOpen ? "rotate(180deg)" : "none",
                    transition: "transform .15s",
                  }}
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {isOpen && (
                <div
                  style={{
                    background: "var(--poster-bg-2)",
                    borderTop: "2px dashed var(--poster-ink-faint)",
                    padding: "8px 14px 10px",
                    maxHeight: 192,
                    overflowY: "auto",
                  }}
                >
                  {subGroups.map(({ area, list }) => (
                    <div key={area} style={{ paddingTop: 8 }}>
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: "var(--poster-ink-3)",
                          textTransform: "uppercase",
                          letterSpacing: ".08em",
                          margin: "0 0 4px",
                        }}
                      >
                        {AREA_LABELS[area]}
                      </p>
                      {list.map((c) => {
                        const checked = selectedIds.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "4px 0",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleId(c.id)}
                              style={{
                                width: 16,
                                height: 16,
                                accentColor: "var(--poster-accent)",
                                cursor: "pointer",
                              }}
                            />
                            <span
                              style={{
                                fontSize: 13,
                                color: "var(--poster-ink)",
                                fontWeight: checked ? 700 : 500,
                              }}
                            >
                              {c.title}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
