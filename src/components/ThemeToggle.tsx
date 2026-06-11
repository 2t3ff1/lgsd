"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  if (!mounted) {
    return <div className="h-9 w-9" aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? "Heller Modus" : "Dunkler Modus"}
      aria-label={isDark ? "Heller Modus aktivieren" : "Dunkler Modus aktivieren"}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-subtle bg-surface text-lg transition-colors hover:bg-surface-muted"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
