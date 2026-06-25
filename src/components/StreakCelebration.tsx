"use client";

import { useEffect, useState } from "react";
import { fireConfetti } from "@/components/Confetti";

const MILESTONES = [7, 14, 30, 60, 100];

export function StreakCelebration({
  workspaceId,
  userId,
  streak,
}: {
  workspaceId: string;
  userId: string;
  streak: number;
}) {
  const [show, setShow] = useState<number | null>(null);

  useEffect(() => {
    if (!MILESTONES.includes(streak)) return;
    const key = `lgsd-streak-milestone-${workspaceId}-${userId}-${streak}`;
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(key)) {
      fireConfetti();
      setShow(streak);
      localStorage.setItem(key, "1");
      const t = setTimeout(() => setShow(null), 4000);
      return () => clearTimeout(t);
    }
  }, [workspaceId, userId, streak]);

  if (show === null) return null;

  return (
    <div className="fixed top-20 left-1/2 z-50 -translate-x-1/2 rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-3 text-center font-bold text-amber-800 shadow-soft dark:bg-amber-500/15 dark:text-amber-300">
      🔥 {show} Tage Streak! Weiter so!
    </div>
  );
}
