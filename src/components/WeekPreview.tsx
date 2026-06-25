"use client";

import { useState, useRef } from "react";
import { Badge } from "@/components/ui/Badge";
import type { Todo } from "@/types/database";

const DAY_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const DAY_LONG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

function buildDays() {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      date: d.toISOString().slice(0, 10),
      label: i === 0 ? "Heute" : i === 1 ? "Morgen" : DAY_LONG[d.getDay()],
      short: i === 0 ? "Heute" : i === 1 ? "Morgen" : DAY_SHORT[d.getDay()],
      jsDate: d,
    });
  }
  return days;
}

const STATUS_TONE: Record<string, "neutral" | "primary" | "success" | "accent" | "danger"> = {
  open: "neutral",
  pending: "primary",
  confirmed: "success",
  rejected: "accent",
  missed: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Offen",
  pending: "Wartet",
  confirmed: "✅",
  rejected: "Beweis",
  missed: "Verpasst",
};

export type HabitStatus = "done" | "missed" | "pending";

const HABIT_DOT: Record<HabitStatus, string> = {
  done: "bg-success-500",
  missed: "bg-danger-500",
  pending: "bg-ink-light/30",
};

export function WeekPreview({
  todosByDate,
  habitByDate,
  title = "Meine nächsten 7 Tage",
}: {
  todosByDate: Record<string, Todo[]>;
  habitByDate?: Record<string, HabitStatus>;
  title?: string;
}) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const days = buildDays();
  const day = days[current];
  const todos = todosByDate[day.date] ?? [];

  function prev() {
    setCurrent((c) => Math.max(0, c - 1));
  }
  function next() {
    setCurrent((c) => Math.min(6, c + 1));
  }

  return (
    <div className="mt-10">
      <h2 className="mb-4 text-lg font-extrabold">{title}</h2>

      {/* Day tabs */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {days.map((d, i) => {
          const habit = habitByDate?.[d.date];
          return (
            <button
              key={d.date}
              onClick={() => setCurrent(i)}
              className={`relative shrink-0 rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
                i === current
                  ? "bg-primary-500 text-white"
                  : "bg-surface-muted text-ink-light hover:bg-primary-100 hover:text-primary-700 dark:hover:bg-primary-500/20"
              }`}
            >
              {d.short}
              {habit && (
                <span
                  className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-surface ${HABIT_DOT[habit]}`}
                  title={
                    habit === "done"
                      ? "Habit erledigt"
                      : habit === "missed"
                        ? "Habit verpasst"
                        : "Habit ausstehend"
                  }
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Swipeable card */}
      <div
        className="relative rounded-2xl border-2 border-border-subtle bg-surface p-5 select-none"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const diff = touchStartX.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 50) { if (diff > 0) next(); else prev(); }
          touchStartX.current = null;
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm text-ink-light">
              {day.jsDate.toLocaleDateString("de-DE", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <h3 className="text-xl font-extrabold">{day.label}</h3>
          </div>
          <div className="hidden gap-2 sm:flex">
            <button
              onClick={prev}
              disabled={current === 0}
              className="rounded-xl border-2 border-border-subtle px-3 py-1.5 text-sm font-bold transition-colors hover:bg-surface-muted disabled:opacity-30"
            >
              ←
            </button>
            <button
              onClick={next}
              disabled={current === 6}
              className="rounded-xl border-2 border-border-subtle px-3 py-1.5 text-sm font-bold transition-colors hover:bg-surface-muted disabled:opacity-30"
            >
              →
            </button>
          </div>
        </div>

        {todos.length === 0 ? (
          <p className="rounded-xl bg-surface-muted px-4 py-6 text-center text-sm text-ink-light">
            Keine Aufgaben für diesen Tag 🎉
          </p>
        ) : (
          <ul className="space-y-2">
            {todos.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-xl bg-surface-muted px-3 py-2.5 text-sm"
              >
                <span className="flex-1 font-medium">{t.title}</span>
                {t.scheduled_time && (
                  <span className="shrink-0 text-xs text-ink-light">
                    🕐 {t.scheduled_time.slice(0, 5)}
                  </span>
                )}
                <Badge tone={STATUS_TONE[t.status] ?? "neutral"}>{STATUS_LABEL[t.status] ?? t.status}</Badge>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-center text-[11px] text-ink-light/60 sm:hidden">
          ← wischen zum Blättern →
        </p>
      </div>
    </div>
  );
}
