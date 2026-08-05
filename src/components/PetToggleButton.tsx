"use client";

import { useEffect, useState } from "react";

export function PetToggleButton() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (typeof window.electronApp === "undefined") return;
    window.electronApp.isPetVisible().then(setVisible);
    const stored = localStorage.getItem("lgsd-pet-visible");
    if (stored !== null) setVisible(stored !== "false");
  }, []);

  if (!mounted || typeof window.electronApp === "undefined") {
    return null;
  }

  function toggle() {
    if (!window.electronApp) return;
    if (visible) {
      window.electronApp.hidePet();
      setVisible(false);
      try { localStorage.setItem("lgsd-pet-visible", "false"); } catch {}
    } else {
      window.electronApp.showPet();
      setVisible(true);
      try { localStorage.setItem("lgsd-pet-visible", "true"); } catch {}
    }
  }

  return (
    <button
      onClick={toggle}
      className="hidden text-sm font-semibold text-ink-light hover:text-primary-600 sm:inline"
      title={visible ? "Desktop-Tier ausblenden" : "Desktop-Tier anzeigen"}
    >
      {visible ? "🐾 ausblenden" : "🐾 anzeigen"}
    </button>
  );
}
