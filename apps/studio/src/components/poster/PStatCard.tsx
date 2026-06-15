"use client";

import * as React from "react";
import { motion, useInView } from "framer-motion";

function CountUp({ target, durationMs = 1200 }: { target: number; durationMs?: number }) {
  const [count, setCount] = React.useState(0);
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  React.useEffect(() => {
    if (!isInView || target === 0) {
      setCount(target);
      return;
    }
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, durationMs / steps);
    return () => clearInterval(timer);
  }, [isInView, target, durationMs]);

  return <span ref={ref}>{count}</span>;
}

type PStatCardProps = {
  icon?: React.ReactNode;
  label: string;
  value: number | string;
  suffix?: string;
  sub?: string;
  /** İkon kutusu arka plan rengi (CSS var veya hex). */
  tint?: string;
  /** Kart entrance animasyonunun gecikmesi (sn). */
  delay?: number;
  /** Sayısal value için CountUp animation aktif mi (default true). */
  countUp?: boolean;
  /** Kompakt variant — padding ve font boyutları küçülür. */
  size?: "default" | "small";
  /** Value rengi override; default var(--poster-ink). */
  valueColor?: string;
  /** Animasyon tamamen kapat (entrance dahil). */
  noAnimation?: boolean;
  /** Value sonrasında ek slot — trend indicator, mini progress bar vb. */
  children?: React.ReactNode;
  style?: React.CSSProperties;
};

export function PStatCard({
  icon,
  label,
  value,
  suffix,
  sub,
  tint,
  delay = 0,
  countUp = true,
  size = "default",
  valueColor,
  noAnimation,
  children,
  style,
}: PStatCardProps) {
  const isSmall = size === "small";
  const padding = isSmall ? 14 : 20;
  const valueFontSize = isSmall ? "clamp(18px, 4vw, 22px)" : "clamp(22px, 5vw, 30px)";
  const subColor = isSmall ? "var(--poster-ink-2)" : "var(--poster-accent)";

  const valueNode =
    typeof value === "number" && countUp ? <CountUp target={value} /> : value;

  const Wrapper = noAnimation ? "div" : motion.div;
  const motionProps = noAnimation
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35, delay },
      };

  return (
    <Wrapper
      {...motionProps}
      style={{
        padding,
        background: "var(--poster-panel)",
        border: "2px solid var(--poster-ink)",
        borderRadius: isSmall ? 14 : 18,
        boxShadow: isSmall ? "var(--poster-shadow-sm)" : "var(--poster-shadow-lg)",
        fontFamily: "var(--font-display)",
        ...style,
      }}
    >
      {icon && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: isSmall ? 32 : 40,
              height: isSmall ? 32 : 40,
              borderRadius: 10,
              background: tint ?? "var(--poster-bg-2)",
              border: "2px solid var(--poster-ink)",
              boxShadow: "0 2px 0 var(--poster-ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--poster-ink)",
            }}
          >
            {icon}
          </div>
        </div>
      )}
      <p
        style={{
          fontSize: isSmall ? 10 : 12,
          fontWeight: 800,
          color: "var(--poster-ink-2)",
          textTransform: "uppercase",
          letterSpacing: ".08em",
          margin: 0,
        }}
      >
        {label}
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
        <p
          style={{
            fontSize: valueFontSize,
            fontWeight: 800,
            color: valueColor ?? "var(--poster-ink)",
            letterSpacing: "-.02em",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          {valueNode}
        </p>
        {suffix && (
          <p style={{ fontSize: isSmall ? 11 : 13, fontWeight: 700, color: "var(--poster-ink-2)", margin: 0 }}>
            {suffix}
          </p>
        )}
      </div>
      {sub && (
        <p style={{ fontSize: isSmall ? 11 : 12, color: subColor, fontWeight: 700, marginTop: 6 }}>
          {sub}
        </p>
      )}
      {children}
    </Wrapper>
  );
}
