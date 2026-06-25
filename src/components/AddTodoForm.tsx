"use client";

import { useRef, useState } from "react";
import { createTodo } from "@/app/actions/todos";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { todayISO } from "@/lib/utils";
import { POINT_OPTIONS } from "@/types/database";

const WEEKDAYS = [
  { value: 1, label: "Mo" },
  { value: 2, label: "Di" },
  { value: 3, label: "Mi" },
  { value: 4, label: "Do" },
  { value: 5, label: "Fr" },
  { value: 6, label: "Sa" },
  { value: 0, label: "So" },
];

export function AddTodoForm({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState("daily");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border-2 border-dashed border-primary-200 py-2.5 text-sm font-bold text-primary-600 transition-colors hover:bg-surface-muted dark:border-primary-300/20 dark:text-primary-300"
      >
        + Aufgabe hinzufügen
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setLoading(true);
        setError(null);
        const res = await createTodo(workspaceId, formData);
        if (res?.error) {
          setError(res.error);
          setLoading(false);
          return;
        }
        formRef.current?.reset();
        setIsRecurring(false);
        setRecurrenceType("daily");
        setLoading(false);
        setOpen(false);
      }}
      className="space-y-2 rounded-xl border-2 border-border-subtle bg-surface-muted p-3"
    >
      <div>
        <Label htmlFor={`title-${workspaceId}`}>Aufgabe</Label>
        <Input id={`title-${workspaceId}`} name="title" required placeholder="z.B. 30 Min lesen" />
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="min-w-[140px] flex-1">
          <Label htmlFor={`date-${workspaceId}`}>Datum</Label>
          <Input
            id={`date-${workspaceId}`}
            type="date"
            name="date"
            required
            defaultValue={todayISO()}
            min={todayISO()}
          />
        </div>
        <div className="min-w-[110px] flex-1">
          <Label htmlFor={`time-${workspaceId}`}>Uhrzeit</Label>
          <Input id={`time-${workspaceId}`} type="time" name="scheduled_time" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="is_recurring"
          checked={isRecurring}
          onChange={(e) => setIsRecurring(e.target.checked)}
          className="h-4 w-4 rounded border-primary-300 text-primary-500 focus:ring-primary-300"
        />
        Wiederkehrend
      </label>
      {isRecurring && (
        <div className="space-y-2">
          <select
            name="recurrence_type"
            value={recurrenceType}
            onChange={(e) => setRecurrenceType(e.target.value)}
            className="w-full rounded-xl border-2 border-border-subtle bg-surface px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
          >
            <option value="daily">Täglich</option>
            <option value="weekly">Wöchentlich</option>
            <option value="monthly">Monatlich</option>
            <option value="interval">Alle X Tage</option>
            <option value="weekdays">Nur bestimmte Wochentage</option>
          </select>

          {recurrenceType === "interval" && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Alle</span>
              <Input
                type="number"
                name="recurrence_interval"
                min={2}
                defaultValue={2}
                className="w-20"
              />
              <span className="text-sm font-medium">Tage</span>
            </div>
          )}

          {recurrenceType === "weekdays" && (
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((d) => (
                <label
                  key={d.value}
                  className="cursor-pointer rounded-xl border-2 border-border-subtle bg-surface px-2.5 py-1.5 text-xs font-semibold transition-colors has-[:checked]:border-primary-400 has-[:checked]:bg-primary-100 has-[:checked]:text-primary-700 dark:has-[:checked]:bg-primary-500/20"
                >
                  <input
                    type="checkbox"
                    name="recurrence_days"
                    value={d.value}
                    className="sr-only"
                  />
                  {d.label}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      <div>
        <Label>Punktevorschlag</Label>
        <div className="flex gap-1.5">
          {POINT_OPTIONS.map((p) => (
            <label
              key={p}
              className="flex-1 cursor-pointer rounded-xl border-2 border-border-subtle bg-surface px-2 py-1.5 text-center text-sm font-semibold transition-colors has-[:checked]:border-primary-400 has-[:checked]:bg-primary-100 has-[:checked]:text-primary-700 dark:has-[:checked]:bg-primary-500/20"
            >
              <input type="radio" name="suggested_points" value={p} defaultChecked={p === 5} className="sr-only" />
              {p}
            </label>
          ))}
        </div>
      </div>
      {error && <p className="text-sm font-medium text-danger-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Speichern …" : "Speichern"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
