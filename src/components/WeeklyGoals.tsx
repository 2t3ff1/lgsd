"use client";

import { useRef, useState } from "react";
import { deleteWeeklyGoal, setWeeklyGoal } from "@/app/actions/goals";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { WeeklyGoal } from "@/types/database";

export function WeeklyGoals({ workspaceId, goals }: { workspaceId: string; goals: WeeklyGoal[] }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-light">Wochenziele</p>
      {goals.length === 0 && !open && (
        <p className="text-xs text-ink-light">Noch kein Wochenziel gesetzt.</p>
      )}
      <ul className="space-y-1">
        {goals.map((g) => (
          <li
            key={g.id}
            className="flex items-center justify-between gap-2 rounded-lg bg-primary-50 px-2.5 py-1.5 text-sm"
          >
            <span>🎯 {g.title}</span>
            <button
              onClick={() => deleteWeeklyGoal(workspaceId, g.id)}
              className="text-xs text-ink-light hover:text-danger-500"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {open ? (
        <form
          ref={formRef}
          action={async (formData) => {
            await setWeeklyGoal(workspaceId, formData);
            formRef.current?.reset();
            setOpen(false);
          }}
          className="flex gap-2"
        >
          <Input name="title" required placeholder="z.B. Jeden Tag 1h coden" className="text-sm" />
          <Button type="submit" size="sm">
            ✓
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
            ✕
          </Button>
        </form>
      ) : (
        <button onClick={() => setOpen(true)} className="text-xs font-bold text-primary-600 hover:underline">
          + Wochenziel hinzufügen
        </button>
      )}
    </div>
  );
}
