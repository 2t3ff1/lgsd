"use client";

import { useState } from "react";
import { updateCommitmentReminder } from "@/app/actions/profile";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

const WEEKDAY_LABELS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

export function CommitmentReminderForm({
  day,
  time,
}: {
  day: number | null;
  time: string | null;
}) {
  const [selectedDay, setSelectedDay] = useState<string>(day !== null ? String(day) : "");
  const [selectedTime, setSelectedTime] = useState(time ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setSaved(false);
    setError(null);
    const res = await updateCommitmentReminder(
      selectedDay === "" ? null : Number(selectedDay),
      selectedTime || null
    );
    if (res?.error) setError(res.error);
    else setSaved(true);
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-light">
        Werde erinnert, dein Wochen-Commitment einzutragen. Wenn bis Freitag 23:59 Uhr keines
        eingetragen ist, gibt es -20 Punkte.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <Label htmlFor="commitment-day">Wochentag</Label>
          <select
            id="commitment-day"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="rounded-xl border-2 border-border-subtle bg-surface px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
          >
            <option value="">Keine Erinnerung</option>
            {WEEKDAY_LABELS.map((label, i) => (
              <option key={i} value={i}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="commitment-time">Uhrzeit</Label>
          <Input
            id="commitment-time"
            type="time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
          />
        </div>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Speichern …" : "Speichern"}
        </Button>
      </div>
      {saved && <p className="text-sm font-medium text-success-600">Gespeichert!</p>}
      {error && <p className="text-sm font-medium text-danger-600">{error}</p>}
    </div>
  );
}
