"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

export function fireConfetti() {
  const duration = 1500;
  const end = Date.now() + duration;

  const colors = ["#6C5CE7", "#FF7A33", "#22C55E", "#FFC4A3", "#A396F8"];

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 65,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 65,
      origin: { x: 1 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();

  confetti({
    particleCount: 120,
    spread: 100,
    origin: { y: 0.6 },
    colors,
  });
}

export function ConfettiOnMount() {
  useEffect(() => {
    fireConfetti();
  }, []);

  return null;
}
