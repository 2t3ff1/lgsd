"use client";

import { useEffect } from "react";

export function UserBackground({
  color,
  imageUrl,
  textColor,
}: {
  color?: string | null;
  imageUrl?: string | null;
  textColor?: string | null;
}) {
  useEffect(() => {
    if (!color && !imageUrl && !textColor) return;
    const prevColor = document.body.style.backgroundColor;
    const prevImage = document.body.style.backgroundImage;
    const prevSize = document.body.style.backgroundSize;
    const prevTextColor = document.body.style.color;

    if (imageUrl) {
      document.body.style.backgroundImage = `url(${imageUrl})`;
      document.body.style.backgroundSize = "cover";
    } else if (color) {
      document.body.style.backgroundColor = color;
    }

    if (textColor) {
      document.body.style.color = textColor;
    }

    return () => {
      document.body.style.backgroundColor = prevColor;
      document.body.style.backgroundImage = prevImage;
      document.body.style.backgroundSize = prevSize;
      document.body.style.color = prevTextColor;
    };
  }, [color, imageUrl, textColor]);

  return null;
}
