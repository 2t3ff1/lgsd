"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/Button";
import { getCroppedImageBlob } from "@/lib/cropImage";

export function ImageCropModal({
  imageSrc,
  aspect = 1,
  outputSize = 512,
  onConfirm,
  onCancel,
}: {
  imageSrc: string;
  aspect?: number;
  outputSize?: number;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [loading, setLoading] = useState(false);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setLoading(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, outputSize);
      onConfirm(blob);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-surface p-4 shadow-soft">
        <h3 className="mb-3 text-center font-bold">Bildausschnitt wählen</h3>
        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-black/20">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs font-medium text-ink-light">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
          />
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={handleConfirm} disabled={loading} className="flex-1">
            {loading ? "Wird zugeschnitten …" : "Übernehmen"}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Abbrechen
          </Button>
        </div>
      </div>
    </div>
  );
}
