"use client";

import { useState } from "react";
import { setMonthlyGoal } from "@/app/actions/goals";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { MonthlyGoal, Workspace } from "@/types/database";

export function MonthlyGoalForm({
  workspace,
  goal,
  currentPoints,
}: {
  workspace: Workspace;
  goal?: MonthlyGoal;
  currentPoints: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-3 rounded-xl border-2 border-primary-100 p-3">
      <div className="flex items-center justify-between">
        <p className="font-bold">{workspace.name}</p>
        {goal?.achieved && <span className="text-sm font-bold text-success-600">🎉 Erreicht!</span>}
      </div>

      {goal && (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-ink-light">
            <span>{goal.reward_text}</span>
            <span>
              {currentPoints} / {goal.target_points} Pkt.
            </span>
          </div>
          <ProgressBar value={currentPoints} max={goal.target_points} />
        </div>
      )}

      <form
        action={async (formData) => {
          setLoading(true);
          setError(null);
          setSaved(false);
          const res = await setMonthlyGoal(workspace.id, formData);
          if (res?.error) setError(res.error);
          else setSaved(true);
          setLoading(false);
        }}
        className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr_auto]"
      >
        <div>
          <Label htmlFor={`target-${workspace.id}`}>Zielpunkte</Label>
          <Input
            id={`target-${workspace.id}`}
            name="target_points"
            type="number"
            min={1}
            required
            defaultValue={goal?.target_points ?? 200}
          />
        </div>
        <div>
          <Label htmlFor={`reward-${workspace.id}`}>Belohnung</Label>
          <Input
            id={`reward-${workspace.id}`}
            name="reward_text"
            required
            defaultValue={goal?.reward_text ?? ""}
            placeholder="z.B. Neue Sneakers kaufen"
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? "…" : goal ? "Aktualisieren" : "Setzen"}
          </Button>
        </div>
      </form>
      {error && <p className="text-sm font-medium text-danger-600">{error}</p>}
      {saved && <p className="text-sm font-medium text-success-600">Gespeichert!</p>}
    </div>
  );
}
