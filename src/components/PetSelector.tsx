"use client";

import { useState, useTransition } from "react";
import { PetAnimal, PET_LABELS } from "@/components/pet/Animals";
import { updatePetType } from "@/app/actions/pet";
import type { PetType } from "@/components/pet/Animals";

const PET_TYPES: PetType[] = ["cat", "dog", "fox", "rabbit", "shark", "bear", "penguin"];

export function PetSelector({ currentPetType }: { currentPetType: string | null }) {
  const [selected, setSelected] = useState<PetType | null>(
    currentPetType && PET_TYPES.includes(currentPetType as PetType)
      ? (currentPetType as PetType)
      : null
  );
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSelect(type: PetType) {
    setSelected(type);
    setSaved(false);
    startTransition(async () => {
      await updatePetType(type);
      setSaved(true);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {PET_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => handleSelect(type)}
            className={`flex flex-col items-center rounded-2xl border-2 p-2 transition-colors hover:border-primary-400 ${
              selected === type
                ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                : "border-border-subtle bg-surface-muted"
            }`}
          >
            <PetAnimal type={type} state={selected === type ? "active" : "sleeping"} size={64} />
            <span className="mt-1 text-xs font-semibold">{PET_LABELS[type]}</span>
          </button>
        ))}
      </div>
      {saved && !pending && (
        <p className="mt-2 text-xs font-semibold text-success-600">Gespeichert!</p>
      )}
      {!selected && (
        <p className="mt-2 text-xs text-ink-light">Wähle dein Desktop-Begleittier.</p>
      )}
    </div>
  );
}
