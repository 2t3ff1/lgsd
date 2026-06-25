"use client";

import { useEffect } from "react";

export function UserBackground({
  color,
  imageUrl,
}: {
  color?: string | null;
  imageUrl?: string | null;
}) {
  useEffect(() => {
    if (!color && !imageUrl) return;
    const prevColor = document.body.style.backgroundColor;
    const prevImage = document.body.style.backgroundImage;
    const prevSize = document.body.style.backgroundSize;

    if (imageUrl) {
      document.body.style.backgroundImage = `url(${imageUrl})`;
      document.body.style.backgroundSize = "cover";
    } else if (color) {
      document.body.style.backgroundColor = color;
    }

    return () => {
      document.body.style.backgroundColor = prevColor;
      document.body.style.backgroundImage = prevImage;
      document.body.style.backgroundSize = prevSize;
    };
  }, [color, imageUrl]);

  return null;
}
