"use client";

import { useRef, useState } from "react";
import { updateAppearance } from "@/app/actions/profile";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ImageCropModal } from "@/components/ImageCropModal";
import { AVATAR_COLOR_PALETTE } from "@/types/database";
import type { Profile } from "@/types/database";

function ImageUploadWithCrop({
  label,
  aspect,
  outputSize,
  previewUrl,
  onCropped,
}: {
  label: string;
  aspect: number;
  outputSize: number;
  previewUrl: string | null;
  onCropped: (blob: Blob) => void;
}) {
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRawImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <>
      <label className="block text-xs font-medium text-ink-light">
        {label}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="mt-1 block w-full text-xs"
        />
      </label>
      {previewUrl && <p className="mt-1 text-xs text-success-600">Bild ausgewählt — wird beim Speichern hochgeladen.</p>}

      {rawImageSrc && (
        <ImageCropModal
          imageSrc={rawImageSrc}
          aspect={aspect}
          outputSize={outputSize}
          onConfirm={(blob) => {
            onCropped(blob);
            setRawImageSrc(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          onCancel={() => {
            setRawImageSrc(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
      )}
    </>
  );
}

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
  const [textColor, setTextColor] = useState<string | null>(profile.text_color);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [backgroundBlob, setBackgroundBlob] = useState<Blob | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
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
        if (avatarBlob) formData.set("avatar_file", new File([avatarBlob], "avatar.jpg", { type: "image/jpeg" }));
        if (backgroundBlob) {
          formData.set("background_file", new File([backgroundBlob], "background.jpg", { type: "image/jpeg" }));
        }
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
            url={avatarPreview ?? profile.avatar_url}
            color={avatarPreview ? null : avatarColor}
            size="lg"
          />
          <div className="flex-1 space-y-2">
            <ColorSwatches
              name="avatar_color"
              palette={AVATAR_COLOR_PALETTE}
              selected={avatarColor}
              onSelect={setAvatarColor}
            />
            <ImageUploadWithCrop
              label="… oder eigenes Bild hochladen (mit Zuschnitt)"
              aspect={1}
              outputSize={512}
              previewUrl={avatarPreview}
              onCropped={(blob) => {
                setAvatarBlob(blob);
                setAvatarPreview(URL.createObjectURL(blob));
              }}
            />
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
        <div className="mt-2">
          <ImageUploadWithCrop
            label="… oder eigenes Hintergrundbild hochladen (mit Zuschnitt)"
            aspect={16 / 9}
            outputSize={1600}
            previewUrl={backgroundPreview}
            onCropped={(blob) => {
              setBackgroundBlob(blob);
              setBackgroundPreview(URL.createObjectURL(blob));
            }}
          />
        </div>
        {backgroundPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backgroundPreview}
            alt="Hintergrund-Vorschau"
            className="mt-2 h-20 w-full rounded-lg object-cover"
          />
        )}
        <p className="mt-1 text-xs text-ink-light">Nur für dich sichtbar.</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Textfarbe</p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={textColor ?? "#1f2937"}
            onChange={(e) => setTextColor(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded-lg border-2 border-border-subtle bg-surface p-0.5"
          />
          {textColor && (
            <button
              type="button"
              onClick={() => setTextColor(null)}
              className="text-xs font-medium text-ink-light underline"
            >
              Zurücksetzen
            </button>
          )}
          <input type="hidden" name="text_color" value={textColor ?? ""} />
        </div>
        <p className="mt-1 text-xs text-ink-light">
          Damit Text auf eigenen Hintergrundfarben lesbar bleibt. Nur für dich sichtbar.
        </p>
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
