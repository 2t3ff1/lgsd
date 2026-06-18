"use client";

import { useState } from "react";
import { updateReminderTime } from "@/app/actions/profile";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function ReminderTimeForm({ reminderTime }: { reminderTime: string | null }) {
  const [time, setTime] = useState(reminderTime ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setSaved(false);
    setError(null);
    const res = await updateReminderTime(time || null);
    if (res?.error) setError(res.error);
    else setSaved(true);
    setLoading(false);
  }

  async function handleClear() {
    setLoading(true);
    setSaved(false);
    setError(null);
    await updateReminderTime(null);
    setTime("");
    setSaved(true);
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-light">
        Du bekommst täglich eine E-Mail wenn du zu dieser Uhrzeit (UTC) noch offene Aufgaben hast. Benötigt eine konfigurierte Edge Function.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <Label htmlFor="reminder-time">Uhrzeit (UTC)</Label>
          <Input
            id="reminder-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Speichern …" : "Speichern"}
        </Button>
        {reminderTime && (
          <Button variant="ghost" onClick={handleClear} disabled={loading}>
            Deaktivieren
          </Button>
        )}
      </div>
      {saved && (
        <p className="text-sm font-medium text-success-600">
          {time ? `Erinnerung um ${time} Uhr gesetzt.` : "Erinnerung deaktiviert."}
        </p>
      )}
      {error && <p className="text-sm font-medium text-danger-600">{error}</p>}
    </div>
  );
}
