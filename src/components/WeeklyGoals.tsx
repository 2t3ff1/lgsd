"use client";

import { useRef, useState, useTransition } from "react";
import { deleteWeeklyGoal, setWeeklyGoal, updateGoalProgress, completeWeeklyGoal } from "@/app/actions/goals";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { WeeklyGoal } from "@/types/database";

function GoalRow({ goal, workspaceId }: { goal: WeeklyGoal; workspaceId: string }) {
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState(goal.progress ?? 0);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completed, setCompleted] = useState(goal.completed ?? false);

  function handleProgressChange(value: number) {
    setProgress(value);
    startTransition(async () => {
      await updateGoalProgress(workspaceId, goal.id, value);
    });
  }

  function handleComplete() {
    startTransition(async () => {
      await completeWeeklyGoal(workspaceId, goal.id);
      setCompleted(true);
      setProgress(100);
      setShowCompleteDialog(false);
    });
  }

  return (
    <li className="space-y-2 rounded-lg bg-surface-muted px-2.5 py-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className={completed ? "line-through text-ink-light" : ""}>
          {completed ? "✅" : "🎯"} {goal.title}
        </span>
        <button
          onClick={() => deleteWeeklyGoal(workspaceId, goal.id)}
          className="shrink-0 text-xs text-ink-light hover:text-danger-500"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={progress}
          disabled={completed}
          onChange={(e) => handleProgressChange(Number(e.target.value))}
          className="h-2 flex-1 cursor-pointer accent-primary-500 disabled:cursor-default disabled:opacity-50"
        />
        <span className="w-10 shrink-0 text-right text-xs font-semibold text-ink-light">
          {progress}%
        </span>
        {!completed && (
          <button
            onClick={() => setShowCompleteDialog(true)}
            disabled={pending}
            title="+20 Punkte"
            className="shrink-0 rounded-lg border-2 border-success-400 bg-success-50 px-2 py-0.5 text-xs font-bold text-success-700 transition-colors hover:bg-success-100 dark:bg-success-500/10 dark:text-success-400"
          >
            Erreicht ✓
          </button>
        )}
        {completed && (
          <span className="shrink-0 rounded-lg bg-success-100 px-2 py-0.5 text-xs font-bold text-success-700 dark:bg-success-500/10 dark:text-success-400">
            +20 Pkt.
          </span>
        )}
      </div>

      <ConfirmDialog
        open={showCompleteDialog}
        title="Wochenziel als erreicht markieren?"
        description={`Du erhältst +20 Bonuspunkte für „${goal.title}".`}
        confirmLabel="Ja, Ziel erreicht! (+20 Pkt.)"
        confirmVariant="primary"
        loading={pending}
        onConfirm={handleComplete}
        onCancel={() => setShowCompleteDialog(false)}
      />
    </li>
  );
}

export function WeeklyGoals({ workspaceId, goals }: { workspaceId: string; goals: WeeklyGoal[] }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-light">Wochenziele</p>
      {goals.length === 0 && !open && (
        <p className="text-xs text-ink-light">Noch kein Wochenziel gesetzt.</p>
      )}
      <ul className="space-y-2">
        {goals.map((g) => (
          <GoalRow key={g.id} goal={g} workspaceId={workspaceId} />
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
          <Button type="submit" size="sm">✓</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>✕</Button>
        </form>
      ) : (
        <button onClick={() => setOpen(true)} className="text-xs font-bold text-primary-600 hover:underline">
          + Wochenziel hinzufügen
        </button>
      )}
    </div>
  );
}
