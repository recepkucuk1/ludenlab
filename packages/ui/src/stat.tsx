import { type ReactNode } from "react";
import { cn } from "./lib/cn";

export interface PStatCardProps {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  sub?: ReactNode;
  /** İkon arka planı için ipucu rengi (CSS değeri, ör. var(--poster-yellow)). */
  tint?: string;
  className?: string;
}

export function PStatCard({ label, value, icon, sub, tint, className }: PStatCardProps) {
  return (
    <div className={cn("p-stat", className)}>
      {icon && (
        <span
          className="p-stat__icon"
          style={tint ? { background: `color-mix(in srgb, ${tint} 22%, transparent)` } : undefined}
          aria-hidden
        >
          {icon}
        </span>
      )}
      <div className="p-stat__body">
        <span className="p-stat__value">{value}</span>
        <span className="p-stat__label">{label}</span>
        {sub && <span className="p-stat__sub">{sub}</span>}
      </div>
    </div>
  );
}
