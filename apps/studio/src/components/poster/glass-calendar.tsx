"use client";

import { useState, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface GlassCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  lessonDates?: Date[];
  className?: string;
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export function GlassCalendar({
  selectedDate,
  onSelectDate,
  lessonDates = [],
  className,
}: GlassCalendarProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(selectedDate));
  const [direction, setDirection] = useState(0);
  const monthKey = format(cursor, "yyyy-MM");
  const uid = useId();

  function go(dir: number) {
    setDirection(dir);
    setCursor((c) => (dir > 0 ? addMonths(c, 1) : subMonths(c, 1)));
  }

  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  function hasLesson(date: Date) {
    return lessonDates.some((d) => isSameDay(d, date));
  }

  const navBtn: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 10,
    border: "2px solid var(--poster-ink)",
    background: "var(--poster-panel)",
    color: "var(--poster-ink)",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    boxShadow: "var(--poster-shadow-sm)",
  };

  return (
    <div
      className={className}
      style={{
        padding: 16,
        userSelect: "none",
        background: "var(--poster-panel)",
        border: "2px solid var(--poster-ink)",
        borderRadius: 18,
        boxShadow: "var(--poster-shadow-lg)",
        fontFamily: "var(--font-display)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button type="button" onClick={() => go(-1)} aria-label="Önceki ay" style={navBtn}>
          <ChevronLeft style={{ width: 14, height: 14 }} />
        </button>

        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.h2
            key={monthKey + "-header"}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 800,
              color: "var(--poster-ink)",
              textTransform: "capitalize",
              letterSpacing: "-.01em",
            }}
          >
            {format(cursor, "MMMM yyyy", { locale: tr })}
          </motion.h2>
        </AnimatePresence>

        <button type="button" onClick={() => go(1)} aria-label="Sonraki ay" style={navBtn}>
          <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            style={{
              padding: "4px 0",
              textAlign: "center",
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              color: "var(--poster-ink-3)",
            }}
          >
            {name}
          </div>
        ))}
      </div>

      <div style={{ position: "relative", overflow: "hidden", minHeight: Math.ceil(days.length / 7) * 44 }}>
        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={monthKey + uid}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 2 }}
          >
            {days.map((day) => {
              const selected = isSameDay(day, selectedDate);
              const td = isToday(day);
              const inMonth = isSameMonth(day, cursor);
              const lesson = hasLesson(day);

              let bg = "transparent";
              let color = inMonth ? "var(--poster-ink-2)" : "var(--poster-ink-faint)";
              let border = "2px solid transparent";
              let shadow = "none";
              let fontWeight: number = 700;

              if (selected) {
                bg = "var(--poster-accent)";
                color = "#fff";
                border = "2px solid var(--poster-ink)";
                shadow = "3px 3px 0 var(--poster-ink)";
                fontWeight = 800;
              } else if (td) {
                color = "var(--poster-accent)";
                border = "2px dashed var(--poster-accent)";
                fontWeight = 800;
              }

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    onSelectDate(day);
                    if (!inMonth) {
                      setDirection(day > cursor ? 1 : -1);
                      setCursor(startOfMonth(day));
                    }
                  }}
                  style={{
                    position: "relative",
                    margin: "0 auto",
                    width: 36,
                    height: 36,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    fontFamily: "var(--font-display)",
                    fontSize: 12,
                    fontWeight,
                    background: bg,
                    color,
                    border,
                    boxShadow: shadow,
                    cursor: "pointer",
                    transition: "background .1s, transform .1s",
                  }}
                >
                  <span>{format(day, "d")}</span>
                  {lesson && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: 3,
                        left: "50%",
                        transform: "translateX(-50%)",
                        height: 3,
                        width: 12,
                        borderRadius: 999,
                        background: selected ? "#fff" : "var(--poster-accent)",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: "2px dashed var(--poster-ink-faint)",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <button
          type="button"
          onClick={() => {
            const t = new Date();
            setDirection(t > cursor ? 1 : -1);
            setCursor(startOfMonth(t));
            onSelectDate(t);
          }}
          style={{
            padding: "4px 12px",
            borderRadius: 10,
            border: "2px solid var(--poster-ink)",
            background: "var(--poster-panel)",
            color: "var(--poster-ink)",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "var(--poster-shadow-sm)",
          }}
        >
          Bugüne git
        </button>
      </div>
    </div>
  );
}
