"use client";

import { useEffect, useState } from "react";
import { fireConfetti } from "@/components/Confetti";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function MonthlyGoalCelebration({
  goalId,
  rewardText,
}: {
  goalId: string;
  rewardText: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const key = `lgsd-celebrated-${goalId}`;
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(key)) {
      setShow(true);
      fireConfetti();
      localStorage.setItem(key, "1");
    }
  }, [goalId]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm">
      <Card className="w-full max-w-sm animate-pop-in space-y-3 rounded-3xl text-center">
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-extrabold">Ziel erreicht!</h2>
        <p className="text-ink-light">
          Du hast dein Monatsziel geschafft. Zeit für deine Belohnung:
        </p>
        <p className="rounded-xl bg-accent-100 px-4 py-3 font-bold text-accent-700 dark:bg-accent-500/20 dark:text-accent-300">
          {rewardText}
        </p>
        <Button onClick={() => setShow(false)} className="w-full">
          Yes! 🙌
        </Button>
      </Card>
    </div>
  );
}
