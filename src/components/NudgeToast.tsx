"use client";

import { useEffect, useState } from "react";
import { markNudgesSeen } from "@/app/actions/nudges";

export function NudgeToast({
  nudges,
}: {
  nudges: { id: string; fromName: string }[];
}) {
  const [visible, setVisible] = useState(nudges);

  useEffect(() => {
    if (nudges.length === 0) return;
    markNudgesSeen(nudges.map((n) => n.id));
    const t = setTimeout(() => setVisible([]), 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (visible.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {visible.map((n) => (
        <div
          key={n.id}
          className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 shadow-soft dark:bg-amber-500/15 dark:text-amber-300"
        >
          👉 {n.fromName} hat dich angestupst!
        </div>
      ))}
    </div>
  );
}
