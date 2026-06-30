"use client";

import { useState, useTransition } from "react";
import { confirmSubtask, deleteSubtask, markSubtaskDone } from "@/app/actions/subtasks";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import { POINT_OPTIONS, type Subtask } from "@/types/database";

export function SubtaskRow({
  subtask,
  workspaceId,
  isOwn,
  canDelete,
}: {
  subtask: Subtask;
  workspaceId: string;
  isOwn: boolean;
  canDelete?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState(subtask.suggested_points);

  function handleMarkDone() {
    startTransition(async () => {
      await markSubtaskDone(workspaceId, subtask.id);
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      const res = await confirmSubtask(workspaceId, subtask.id, selectedPoints);
      if (!res?.error) setConfirmOpen(false);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteSubtask(workspaceId, subtask.id);
    });
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border-2 px-2.5 py-1.5 text-sm",
        subtask.status === "confirmed" && "border-success-500/40 bg-success-100/30 dark:bg-success-500/10",
        subtask.status === "pending" && "border-primary-200 dark:border-primary-300/30",
        subtask.status === "missed" && "border-danger-500/30 bg-danger-100/30 dark:bg-danger-500/10",
        subtask.status === "open" && "border-border-subtle"
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
          subtask.status === "confirmed" ? "bg-success-500 text-white" : "border-2 border-primary-200"
        )}
      >
        {subtask.status === "confirmed" ? "✓" : ""}
      </span>

      <span className={cn("flex-1", subtask.status === "confirmed" && "text-ink-light line-through")}>
        {subtask.title}
      </span>

      <Badge tone="neutral">{subtask.suggested_points} Pkt.</Badge>

      {isOwn && subtask.status === "open" && (
        <Button size="sm" variant="outline" onClick={handleMarkDone} disabled={pending}>
          ✓ Fertig
        </Button>
      )}

      {!isOwn && subtask.status === "pending" && (
        <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={pending}>
          Bestätigen
        </Button>
      )}

      {canDelete && subtask.status === "open" && (
        <button
          onClick={handleDelete}
          className="text-xs text-ink-light hover:text-danger-500"
          title="Löschen"
        >
          ✕
        </button>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Unteraufgabe bestätigen"
        description={`Vorschlag: ${subtask.suggested_points} Punkte. Wähle die Punktzahl, die vergeben werden soll.`}
        confirmLabel="Bestätigen & Punkte vergeben"
        confirmVariant="primary"
        loading={pending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      >
        <div className="flex gap-1.5">
          {POINT_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedPoints(p)}
              className={cn(
                "flex-1 rounded-xl border-2 px-2 py-1.5 text-center text-sm font-semibold transition-colors",
                selectedPoints === p
                  ? "border-primary-400 bg-primary-100 text-primary-700 dark:bg-primary-500/20"
                  : "border-border-subtle bg-surface"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </ConfirmDialog>
    </div>
  );
}
