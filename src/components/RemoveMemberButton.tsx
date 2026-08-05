"use client";

import { useState, useTransition } from "react";
import { removeMember } from "@/app/actions/workspaces";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function RemoveMemberButton({
  workspaceId,
  userId,
  displayName,
}: {
  workspaceId: string;
  userId: string;
  displayName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleRemove() {
    startTransition(async () => {
      await removeMember(workspaceId, userId);
      setOpen(false);
    });
  }

  return (
    <>
      <Button type="button" size="sm" variant="ghost" className="text-danger-500" onClick={() => setOpen(true)}>
        Entfernen
      </Button>
      <ConfirmDialog
        open={open}
        title="Mitglied entfernen?"
        description={`${displayName} wird aus dem Workspace entfernt und verliert den Zugriff auf alle Aufgaben und Daten dieses Workspaces.`}
        confirmLabel="Entfernen"
        loading={pending}
        onConfirm={handleRemove}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
