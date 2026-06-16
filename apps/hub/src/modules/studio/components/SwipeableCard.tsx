"use client";

import { useRef, useState, useEffect, useCallback } from "react";

const BTN_W = 76; // delete button width in px
const OPEN_THRESHOLD = 32; // px moved left to snap open
const CLOSE_THRESHOLD = 28; // px moved right to snap closed

// ─── Public API ───────────────────────────────────────────────────────────────

export interface SwipeableCardProps {
  id: string;
  /** Which card id is currently open (controlled by parent) */
  openId: string | null;
  onOpen: (id: string) => void;
  onClose: () => void;
  onDeletePress: () => void;
  children: React.ReactNode;
}

/**
 * On non-touch devices renders children as-is.
 * On touch devices wraps children in a swipeable container that
 * reveals a red "Sil" button on left-swipe.
 */
export function SwipeableCard(props: SwipeableCardProps) {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  if (!isTouch) return <>{props.children}</>;
  return <SwipeableCardInner {...props} />;
}

// ─── Inner component (touch devices only) ────────────────────────────────────

function SwipeableCardInner({
  id,
  openId,
  onOpen,
  onClose,
  onDeletePress,
  children,
}: SwipeableCardProps) {
  const isOpen = openId === id;

  const outerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const axis = useRef<"h" | "v" | null>(null); // detected swipe axis
  const offsetRef = useRef(0);
  const [offset, setOffset] = useState(0);
  const [snap, setSnap] = useState(false); // enable CSS transition on release

  function updateOffset(v: number) {
    offsetRef.current = v;
    setOffset(v);
  }

  // When another card opens (isOpen → false externally), animate shut
  useEffect(() => {
    if (!isOpen && offsetRef.current < 0) {
      setSnap(true);
      updateOffset(0);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Add non-passive touchmove so we can preventDefault during horizontal swipe
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const onMove = (e: TouchEvent) => {
      if (axis.current === "h") e.preventDefault();
    };
    el.addEventListener("touchmove", onMove, { passive: false });
    return () => el.removeEventListener("touchmove", onMove);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    axis.current = null;
    setSnap(false);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.touches[0].clientX - startX.current;
      const dy = Math.abs(e.touches[0].clientY - startY.current);

      // Determine axis on first significant movement
      if (axis.current === null) {
        if (Math.abs(dx) < 4 && dy < 4) return;
        axis.current = Math.abs(dx) > dy ? "h" : "v";
      }
      if (axis.current !== "h") return;

      const base = isOpen ? -BTN_W : 0;
      updateOffset(Math.max(-BTN_W, Math.min(0, base + dx)));
    },
    [isOpen]
  );

  const handleTouchEnd = useCallback(() => {
    if (axis.current !== "h") {
      axis.current = null;
      return;
    }
    axis.current = null;
    setSnap(true);

    const cur = offsetRef.current;
    if (!isOpen && cur <= -OPEN_THRESHOLD) {
      updateOffset(-BTN_W);
      onOpen(id);
    } else if (isOpen && cur >= -(BTN_W - CLOSE_THRESHOLD)) {
      updateOffset(0);
      onClose();
    } else {
      // snap back to current state
      updateOffset(isOpen ? -BTN_W : 0);
    }
  }, [isOpen, id, onOpen, onClose]);

  return (
    <div
      ref={outerRef}
      className="relative overflow-hidden rounded-2xl"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Delete button (always rendered behind content) ── */}
      <div
        className="absolute inset-y-0 right-0 flex items-stretch bg-red-500 active:bg-red-600"
        style={{ width: BTN_W }}
        aria-hidden={!isOpen}
      >
        <button
          onTouchStart={(e) => e.stopPropagation()}
          onClick={onDeletePress}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-white"
          aria-label="Kartı sil"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          <span className="text-[11px] font-bold leading-none">Sil</span>
        </button>
      </div>

      {/* ── Card content (slides left on swipe) ── */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: snap
            ? "transform 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
            : "none",
          willChange: "transform",
        }}
        className="relative z-10"
      >
        {/* Opaque white backdrop blocks the red delete button from bleeding through glassmorphic cards */}
        <div className="absolute inset-0 bg-white -z-10" aria-hidden="true" />
        {children}

        {/* Invisible tap-to-close overlay when swiped open */}
        {isOpen && (
          <div
            className="absolute inset-0 z-10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSnap(true);
              updateOffset(0);
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
}
