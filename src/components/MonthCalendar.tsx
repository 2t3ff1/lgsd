"use client";

import { useState, useTransition } from "react";
import { getTodosForMonth } from "@/app/actions/calendar";
import { cn } from "@/lib/utils";
import type { Todo } from "@/types/database";

type CalendarTodo = Pick<Todo, "id" | "title" | "date" | "status" | "is_recurring">;

const STATUS_ICON: Record<string, string> = {
  confirmed: "✓",
  missed: "✗",
  pending: "⏳",
  rejected: "❌",
  open: "○",
};

const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export function MonthCalendar({
  workspaceId,
  initialTodos,
}: {
  workspaceId: string;
  initialTodos: CalendarTodo[];
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-indexed
  const [todos, setTodos] = useState<CalendarTodo[]>(initialTodos);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const todayISO = today.toISOString().slice(0, 10);

  const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month, 0).getDate();

  const todosByDate = new Map<string, CalendarTodo[]>();
  todos.forEach((t) => {
    const list = todosByDate.get(t.date) ?? [];
    list.push(t);
    todosByDate.set(t.date, list);
  });

  function navigate(delta: number) {
    const newMonth = ((month - 1 + delta + 12) % 12) + 1;
    const newYear = year + Math.floor((month - 1 + delta) / 12);
    setMonth(newMonth);
    setYear(newYear);
    setSelectedDay(null);
    startTransition(async () => {
      const { todos: fetched } = await getTodosForMonth(workspaceId, newYear, newMonth);
      setTodos(fetched);
    });
  }

  const selectedTodos = selectedDay ? (todosByDate.get(selectedDay) ?? []) : [];

  return (
    <div className="rounded-2xl border-2 border-border-subtle bg-surface p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg px-2 py-1 text-sm font-bold text-ink-light transition-colors hover:bg-surface-muted"
        >
          ←
        </button>
        <span className="text-sm font-bold">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button
          onClick={() => navigate(1)}
          className="rounded-lg px-2 py-1 text-sm font-bold text-ink-light transition-colors hover:bg-surface-muted"
        >
          →
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
          <div key={d} className="text-[10px] font-bold uppercase text-ink-light">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayTodos = todosByDate.get(iso) ?? [];
          const isToday = iso === todayISO;
          const isSelected = iso === selectedDay;
          const hasOpen = dayTodos.some((t) => t.status !== "confirmed");
          const allDone = dayTodos.length > 0 && dayTodos.every((t) => t.status === "confirmed");

          return (
            <button
              key={iso}
              onClick={() => setSelectedDay((prev) => (prev === iso ? null : iso))}
              className={cn(
                "relative flex h-8 flex-col items-center justify-center rounded-lg text-xs font-medium transition-colors",
                isSelected && "bg-primary-500 text-white",
                !isSelected && isToday && "bg-primary-100 font-bold text-primary-700 dark:bg-primary-500/20",
                !isSelected && !isToday && "hover:bg-surface-muted"
              )}
            >
              {day}
              {dayTodos.length > 0 && (
                <span
                  className={cn(
                    "absolute bottom-0.5 h-1 w-1 rounded-full",
                    isSelected ? "bg-white" : allDone ? "bg-success-500" : hasOpen ? "bg-primary-500" : "bg-ink-light"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-3 border-t-2 border-border-subtle pt-3">
          <p className="mb-2 text-xs font-bold text-ink-light">
            {new Intl.DateTimeFormat("de", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date(selectedDay + "T12:00:00"))}
          </p>
          {selectedTodos.length === 0 ? (
            <p className="text-xs text-ink-light">Keine Aufgaben.</p>
          ) : (
            <ul className="space-y-1">
              {selectedTodos.map((t) => (
                <li key={t.id} className="flex items-center gap-1.5 text-xs">
                  <span
                    className={cn(
                      "font-bold",
                      t.status === "confirmed" && "text-success-600",
                      t.status === "missed" && "text-danger-500",
                      (t.status === "open" || t.status === "pending") && "text-ink-light"
                    )}
                  >
                    {STATUS_ICON[t.status] ?? "○"}
                  </span>
                  <span className={t.status === "confirmed" ? "text-ink-light line-through" : ""}>
                    {t.title}
                  </span>
                  {t.is_recurring && (
                    <span className="text-[10px] text-ink-light">🔁</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
