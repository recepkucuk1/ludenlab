"use client";
import * as React from "react";

/**
 * PTabs — controlled tabs with full keyboard nav (arrows, Home, End).
 * No Radix dependency.
 *
 *   <PTabs value={tab} onValueChange={setTab}>
 *     <PTabs.List>
 *       <PTabs.Trigger value="a">A</PTabs.Trigger>
 *       <PTabs.Trigger value="b">B</PTabs.Trigger>
 *     </PTabs.List>
 *     <PTabs.Panel value="a">...</PTabs.Panel>
 *     <PTabs.Panel value="b">...</PTabs.Panel>
 *   </PTabs>
 */

type TabsCtx = {
  value: string;
  setValue: (v: string) => void;
  idPrefix: string;
  registerTrigger: (v: string, el: HTMLButtonElement | null) => void;
  focusByOffset: (from: string, delta: number) => void;
  focusEdge: (which: "first" | "last") => void;
};

const TabsContext = React.createContext<TabsCtx | null>(null);

function useTabs(): TabsCtx {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("PTabs.* must be used inside <PTabs>");
  return ctx;
}

type PTabsProps = {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
};

export function PTabs({ value, onValueChange, children }: PTabsProps) {
  const idPrefix = React.useId();
  const triggers = React.useRef<Map<string, HTMLButtonElement | null>>(new Map());
  const order = React.useRef<string[]>([]);

  const registerTrigger = React.useCallback((v: string, el: HTMLButtonElement | null) => {
    triggers.current.set(v, el);
    if (el && !order.current.includes(v)) order.current.push(v);
    if (!el) {
      order.current = order.current.filter((x) => x !== v);
    }
  }, []);

  const focusByOffset = React.useCallback((from: string, delta: number) => {
    const list = order.current;
    const i = list.indexOf(from);
    if (i < 0) return;
    const next = list[(i + delta + list.length) % list.length];
    const el = triggers.current.get(next);
    el?.focus();
    onValueChange(next);
  }, [onValueChange]);

  const focusEdge = React.useCallback((which: "first" | "last") => {
    const list = order.current;
    const v = which === "first" ? list[0] : list[list.length - 1];
    if (!v) return;
    triggers.current.get(v)?.focus();
    onValueChange(v);
  }, [onValueChange]);

  const ctx: TabsCtx = React.useMemo(
    () => ({ value, setValue: onValueChange, idPrefix, registerTrigger, focusByOffset, focusEdge }),
    [value, onValueChange, idPrefix, registerTrigger, focusByOffset, focusEdge],
  );

  return <TabsContext.Provider value={ctx}>{children}</TabsContext.Provider>;
}

PTabs.List = function PTabsList({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex",
        gap: 4,
        padding: 4,
        background: "var(--poster-panel)",
        border: "2px solid var(--poster-ink)",
        borderRadius: 999,
        boxShadow: "var(--poster-shadow-md)",
        fontFamily: "var(--font-display)",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

PTabs.Trigger = function PTabsTrigger({
  value,
  children,
  style,
}: {
  value: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const ctx = useTabs();
  const isActive = ctx.value === value;
  const ref = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    ctx.registerTrigger(value, ref.current);
    return () => ctx.registerTrigger(value, null);
  }, [ctx, value]);

  return (
    <button
      ref={ref}
      role="tab"
      type="button"
      id={`${ctx.idPrefix}-trigger-${value}`}
      aria-selected={isActive}
      aria-controls={`${ctx.idPrefix}-panel-${value}`}
      tabIndex={isActive ? 0 : -1}
      onClick={() => ctx.setValue(value)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); ctx.focusByOffset(value, 1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); ctx.focusByOffset(value, -1); }
        else if (e.key === "Home") { e.preventDefault(); ctx.focusEdge("first"); }
        else if (e.key === "End") { e.preventDefault(); ctx.focusEdge("last"); }
      }}
      style={{
        fontFamily: "inherit",
        padding: "8px 16px",
        borderRadius: 999,
        border: "none",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 13,
        background: isActive ? "var(--poster-ink)" : "transparent",
        color: isActive ? "var(--poster-panel)" : "var(--poster-ink-2)",
        transition: "background .15s, color .15s",
        ...style,
      }}
    >
      {children}
    </button>
  );
};

PTabs.Panel = function PTabsPanel({
  value,
  children,
  style,
}: {
  value: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const ctx = useTabs();
  if (ctx.value !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${ctx.idPrefix}-panel-${value}`}
      aria-labelledby={`${ctx.idPrefix}-trigger-${value}`}
      tabIndex={0}
      style={style}
    >
      {children}
    </div>
  );
};
