"use client";

import { useState } from "react";
import { createWorkspace } from "@/app/actions/workspaces";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";

export function CreateWorkspaceCard() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary-200 bg-surface-muted text-primary-600 transition-colors hover:bg-primary-50 dark:border-primary-300/20 dark:text-primary-300 dark:hover:bg-surface"
      >
        <span className="text-3xl">+</span>
        <span className="font-bold">Neuer Workspace</span>
      </button>
    );
  }

  return (
    <Card className="rounded-2xl">
      <h3 className="mb-3 font-bold">Workspace erstellen</h3>
      <form
        action={async (formData) => {
          setLoading(true);
          setError(null);
          const res = await createWorkspace(formData);
          if (res?.error) {
            setError(res.error);
            setLoading(false);
          }
        }}
        className="space-y-3"
      >
        <div>
          <Label htmlFor="ws-name">Name</Label>
          <Input id="ws-name" name="name" required placeholder="z.B. Morgenroutine-Crew" />
        </div>
        <div>
          <Label htmlFor="ws-description">Beschreibung (optional)</Label>
          <Textarea id="ws-description" name="description" rows={2} placeholder="Worum geht's hier?" />
        </div>
        {error && <p className="text-sm font-medium text-danger-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Erstellen …" : "Erstellen"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
        </div>
      </form>
    </Card>
  );
}
