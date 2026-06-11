"use client";

import { useRef, useState } from "react";
import { inviteMember } from "@/app/actions/workspaces";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function InviteMemberForm({ workspaceId }: { workspaceId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setLoading(true);
        setError(null);
        setSuccess(false);
        const res = await inviteMember(workspaceId, formData);
        if (res?.error) {
          setError(res.error);
        } else {
          setSuccess(true);
          formRef.current?.reset();
        }
        setLoading(false);
      }}
      className="space-y-2"
    >
      <Label htmlFor="invite-email">Per E-Mail einladen</Label>
      <div className="flex gap-2">
        <Input id="invite-email" name="email" type="email" required placeholder="freund@beispiel.de" />
        <Button type="submit" disabled={loading}>
          {loading ? "…" : "Einladen"}
        </Button>
      </div>
      {error && <p className="text-sm font-medium text-danger-600">{error}</p>}
      {success && (
        <p className="text-sm font-medium text-success-600">
          Einladung verschickt! Sobald sich die Person registriert oder anmeldet, ist sie automatisch
          dabei.
        </p>
      )}
    </form>
  );
}
