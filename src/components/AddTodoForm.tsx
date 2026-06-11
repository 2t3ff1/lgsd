"use client";

import { useRef, useState } from "react";
import { createTodo } from "@/app/actions/todos";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { todayISO } from "@/lib/utils";

export function AddTodoForm({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border-2 border-dashed border-primary-200 py-2.5 text-sm font-bold text-primary-600 transition-colors hover:bg-primary-50"
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
        setLoading(false);
        setOpen(false);
      }}
      className="space-y-2 rounded-xl border-2 border-primary-100 bg-primary-50/40 p-3"
    >
      <div>
        <Label htmlFor={`title-${workspaceId}`}>Aufgabe</Label>
        <Input id={`title-${workspaceId}`} name="title" required placeholder="z.B. 30 Min lesen" />
      </div>
      <div>
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
        <select
          name="recurrence_type"
          defaultValue="daily"
          className="w-full rounded-xl border-2 border-primary-100 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
        >
          <option value="daily">Täglich</option>
          <option value="weekly">Wöchentlich</option>
          <option value="monthly">Monatlich</option>
        </select>
      )}
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
