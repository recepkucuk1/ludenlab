"use client";

import { useState, type ReactNode } from "react";
import { cn } from "./lib/cn";

export interface PTab {
  key: string;
  label: ReactNode;
  content: ReactNode;
}

export function PTabs({ tabs, initial }: { tabs: PTab[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.key);
  return (
    <div>
      <div className="p-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            className={cn("p-tab", active === t.key && "p-tab--active")}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-tabs__panel">{tabs.find((t) => t.key === active)?.content}</div>
    </div>
  );
}
