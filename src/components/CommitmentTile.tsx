"use client";

import { useState } from "react";
import { setWeeklyCommitment } from "@/app/actions/commitments";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import type { Profile, WeeklyCommitment } from "@/types/database";

export function CommitmentTile({
  workspaceId,
  weekStart,
  members,
  commitmentsByUser,
  currentUserId,
}: {
  workspaceId: string;
  weekStart: string;
  members: Profile[];
  commitmentsByUser: Map<string, WeeklyCommitment>;
  currentUserId: string;
}) {
  const ownCommitment = commitmentsByUser.get(currentUserId);
  const [draft, setDraft] = useState(ownCommitment?.content ?? "");
  const [editing, setEditing] = useState(!ownCommitment);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await setWeeklyCommitment(workspaceId, weekStart, draft);
    if (res?.error) {
      setError(res.error);
    } else {
      setEditing(false);
    }
    setSaving(false);
  }

  return (
    <Card className="rounded-2xl">
      <h2 className="mb-3 font-bold">🎯 Wochen-Commitments</h2>

      <div className="mb-4 rounded-xl border-2 border-primary-200 bg-primary-50 p-3 dark:border-primary-300/20 dark:bg-primary-500/10">
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-primary-700 dark:text-primary-300">
          Mein Commitment diese Woche
        </p>
        {editing ? (
          <div className="space-y-2">
            <Textarea
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Was nimmst du dir diese Woche vor?"
            />
            {error && <p className="text-sm font-medium text-danger-600">{error}</p>}
            <Button size="sm" onClick={handleSave} disabled={saving || !draft.trim()}>
              {saving ? "Speichern …" : "Speichern"}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium">{ownCommitment?.content}</p>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Bearbeiten
            </Button>
          </div>
        )}
      </div>

      <ul className="space-y-2">
        {members
          .filter((m) => m.id !== currentUserId)
          .map((m) => {
            const c = commitmentsByUser.get(m.id);
            return (
              <li key={m.id} className="flex items-start gap-2.5 rounded-xl bg-surface-muted px-3 py-2">
                <Avatar name={m.display_name} url={m.avatar_url} color={m.avatar_color} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{m.display_name}</p>
                  <p className="text-sm text-ink-light">
                    {c ? c.content : "Noch kein Commitment eingetragen"}
                  </p>
                </div>
              </li>
            );
          })}
      </ul>
    </Card>
  );
}
