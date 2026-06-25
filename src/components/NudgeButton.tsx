"use client";

import { useState, useTransition } from "react";
import { sendNudge } from "@/app/actions/nudges";
import { cn } from "@/lib/utils";

export function NudgeButton({ workspaceId, toUserId }: { workspaceId: string; toUserId: string }) {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      const res = await sendNudge(workspaceId, toUserId);
      if (res?.error) {
        setError(res.error);
        setTimeout(() => setError(null), 2500);
      } else {
        setSent(true);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending || sent}
      title={error ?? "Anstupsen"}
      className={cn(
        "rounded-full border-2 px-2 py-1 text-xs font-bold transition-colors",
        sent
          ? "border-success-300 bg-success-100 text-success-700 dark:bg-success-500/20"
          : "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300"
      )}
    >
      {sent ? "👋 Gestupst!" : "👉 Stupsen"}
    </button>
  );
}
