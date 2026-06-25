"use client";

import { useRef, useState } from "react";
import { updateAppearance } from "@/app/actions/profile";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { AVATAR_COLOR_PALETTE } from "@/types/database";
import type { Profile } from "@/types/database";

function ColorSwatches({
  name,
  palette,
  selected,
  onSelect,
}: {
  name: string;
  palette: readonly string[];
  selected: string | null;
  onSelect: (color: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {palette.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onSelect(color === selected ? null : color)}
          className="h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-surface transition-transform hover:scale-110"
          style={{
            backgroundColor: color,
            ringColor: color === selected ? "#0f172a" : "transparent",
          } as React.CSSProperties}
          aria-label={color}
        />
      ))}
      <input type="hidden" name={name} value={selected ?? ""} />
    </div>
  );
}

export function AppearanceForm({ profile }: { profile: Profile }) {
  const [avatarColor, setAvatarColor] = useState<string | null>(profile.avatar_color);
  const [cardColor, setCardColor] = useState<string | null>(profile.card_color);
  const [backgroundColor, setBackgroundColor] = useState<string | null>(profile.background_color);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setLoading(true);
        setError(null);
        setSaved(false);
        const res = await updateAppearance(formData);
        if (res?.error) setError(res.error);
        else setSaved(true);
        setLoading(false);
      }}
      className="space-y-5"
    >
      <div>
        <p className="mb-2 text-sm font-semibold">Profilbild</p>
        <div className="flex items-center gap-4">
          <Avatar
            name={profile.display_name}
            url={profile.avatar_url}
            color={avatarColor}
            size="lg"
          />
          <div className="flex-1 space-y-2">
            <ColorSwatches
              name="avatar_color"
              palette={AVATAR_COLOR_PALETTE}
              selected={avatarColor}
              onSelect={setAvatarColor}
            />
            <label className="block text-xs font-medium text-ink-light">
              … oder eigenes Bild hochladen
              <input
                type="file"
                name="avatar_file"
                accept="image/*"
                className="mt-1 block w-full text-xs"
              />
            </label>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Hintergrundfarbe der App</p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={backgroundColor ?? "#fef9f3"}
            onChange={(e) => setBackgroundColor(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded-lg border-2 border-border-subtle bg-surface p-0.5"
          />
          {backgroundColor && (
            <button
              type="button"
              onClick={() => setBackgroundColor(null)}
              className="text-xs font-medium text-ink-light underline"
            >
              Zurücksetzen
            </button>
          )}
          <input type="hidden" name="background_color" value={backgroundColor ?? ""} />
        </div>
        <label className="mt-2 block text-xs font-medium text-ink-light">
          … oder eigenes Hintergrundbild hochladen
          <input
            type="file"
            name="background_file"
            accept="image/*"
            className="mt-1 block w-full text-xs"
          />
        </label>
        <p className="mt-1 text-xs text-ink-light">Nur für dich sichtbar.</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Farbe deiner Aufgaben-Kachel im Workspace</p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={cardColor ?? "#fef3c7"}
            onChange={(e) => setCardColor(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded-lg border-2 border-border-subtle bg-surface p-0.5"
          />
          {cardColor && (
            <button
              type="button"
              onClick={() => setCardColor(null)}
              className="text-xs font-medium text-ink-light underline"
            >
              Zurücksetzen
            </button>
          )}
          <input type="hidden" name="card_color" value={cardColor ?? ""} />
        </div>
        <p className="mt-1 text-xs text-ink-light">Sichtbar für alle Workspace-Mitglieder.</p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Speichern …" : "Speichern"}
        </Button>
        {saved && <p className="text-sm font-medium text-success-600">Gespeichert!</p>}
        {error && <p className="text-sm font-medium text-danger-600">{error}</p>}
      </div>
    </form>
  );
}
