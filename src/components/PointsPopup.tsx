"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function PointsPopup({ amount, onDone }: { amount: number; onDone?: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 1100);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!visible) return null;

  return (
    <span
      className={cn(
        "pointer-events-none absolute -top-2 right-2 animate-float-up text-lg font-extrabold",
        amount >= 0 ? "text-success-600" : "text-danger-600"
      )}
    >
      {amount > 0 ? `+${amount}` : amount}
    </span>
  );
}
