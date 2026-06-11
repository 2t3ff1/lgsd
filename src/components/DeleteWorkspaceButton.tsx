"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteWorkspace } from "@/app/actions/workspaces";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function DeleteWorkspaceButton({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const res = await deleteWorkspace(workspaceId);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <>
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        Workspace löschen
      </Button>
      {error && <p className="mt-2 text-sm font-medium text-danger-600">{error}</p>}

      <ConfirmDialog
        open={open}
        title="Workspace löschen?"
        description="Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmLabel="Endgültig löschen"
        loading={loading}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
