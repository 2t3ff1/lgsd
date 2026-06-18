"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";

export type HistoryTodo = {
  id: string;
  title: string;
  date: string;
  workspace_id?: string;
  workspace_name: string;
  points_awarded: number;
  confirmed_by_name: string | null;
};

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

type Filter = "week" | "month" | "all";

export function TodoHistory({ todos }: { todos: HistoryTodo[] }) {
  const [filter, setFilter] = useState<Filter>("month");

  const filtered = todos.filter((t) => {
    if (filter === "all") return true;
    const d = new Date(t.date);
    return d >= (filter === "week" ? getWeekStart() : getMonthStart());
  });

  return (
    <div>
      <div className="mb-3 flex gap-1.5">
        {(["week", "month", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl px-3 py-1 text-sm font-semibold transition-colors ${
              filter === f
                ? "bg-primary-500 text-white"
                : "bg-surface-muted text-ink-light hover:bg-primary-100 hover:text-primary-700 dark:hover:bg-primary-500/20"
            }`}
          >
            {f === "week" ? "Diese Woche" : f === "month" ? "Dieser Monat" : "Alles"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-ink-light">Keine erledigten Aufgaben in diesem Zeitraum.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => (
            <li
              key={t.id}
              className="flex items-start justify-between gap-3 rounded-xl bg-surface-muted px-3 py-2.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.title}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-ink-light">
                    {new Date(t.date).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                  <Badge tone="neutral">{t.workspace_name}</Badge>
                  {t.confirmed_by_name && (
                    <span className="text-xs text-ink-light">✓ {t.confirmed_by_name}</span>
                  )}
                </div>
              </div>
              <span className="shrink-0 font-bold text-success-600">+{t.points_awarded}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
