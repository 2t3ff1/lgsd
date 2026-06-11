"use client";

import { useState } from "react";
import { updateProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function ProfileForm({ displayName }: { displayName: string }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <form
      action={async (formData) => {
        setLoading(true);
        setError(null);
        setSaved(false);
        const res = await updateProfile(formData);
        if (res?.error) setError(res.error);
        else setSaved(true);
        setLoading(false);
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <div className="flex-1 min-w-[180px]">
        <Label htmlFor="display_name">Anzeigename</Label>
        <Input id="display_name" name="display_name" defaultValue={displayName} required />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Speichern …" : "Speichern"}
      </Button>
      {saved && <p className="w-full text-sm font-medium text-success-600">Gespeichert!</p>}
      {error && <p className="w-full text-sm font-medium text-danger-600">{error}</p>}
    </form>
  );
}
