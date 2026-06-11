"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Löschen",
  cancelLabel = "Abbrechen",
  confirmVariant = "danger",
  loading,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm">
      <Card className="w-full max-w-sm animate-pop-in space-y-4 rounded-3xl">
        <div>
          <h2 className="text-lg font-extrabold">{title}</h2>
          <p className="mt-1 text-sm text-ink-light">{description}</p>
        </div>
        {children}
        <div className="flex gap-2">
          <Button type="button" variant={confirmVariant} onClick={onConfirm} disabled={loading} className="flex-1">
            {loading ? "…" : confirmLabel}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading} className="flex-1">
            {cancelLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}
