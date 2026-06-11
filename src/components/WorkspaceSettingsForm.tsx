"use client";

import { useState } from "react";
import { updateWorkspace } from "@/app/actions/workspaces";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import type { Workspace } from "@/types/database";

export function WorkspaceSettingsForm({ workspace }: { workspace: Workspace }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <form
      action={async (formData) => {
        setLoading(true);
        setError(null);
        setSaved(false);
        const res = await updateWorkspace(workspace.id, formData);
        if (res?.error) setError(res.error);
        else setSaved(true);
        setLoading(false);
      }}
      className="space-y-3"
    >
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={workspace.name} required />
      </div>
      <div>
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={workspace.description ?? ""} />
      </div>
      {error && <p className="text-sm font-medium text-danger-600">{error}</p>}
      {saved && <p className="text-sm font-medium text-success-600">Gespeichert!</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Speichern …" : "Speichern"}
      </Button>
    </form>
  );
}
