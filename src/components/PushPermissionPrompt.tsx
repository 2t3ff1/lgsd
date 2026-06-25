"use client";

import { useEffect, useState } from "react";
import { savePushSubscription } from "@/app/actions/push";
import { Button } from "@/components/ui/Button";

const STORAGE_KEY = "lgsd-push-prompted";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export function PushPermissionPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (Notification.permission !== "default") return;

    setVisible(true);
  }, []);

  async function handleAllow() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      await savePushSubscription(subscription.toJSON());
    } catch {
      // Push-Setup fehlgeschlagen, App funktioniert weiter mit In-App-Meldungen
    }
  }

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border-2 border-primary-200 bg-surface p-4 shadow-soft sm:left-4 sm:translate-x-0">
      <p className="mb-3 text-sm font-medium">
        🔔 Möchtest du Push-Benachrichtigungen erhalten (Stupser, Bestätigungen, Erinnerungen)?
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleAllow} className="flex-1">
          Erlauben
        </Button>
        <Button size="sm" variant="ghost" onClick={handleDismiss}>
          Nicht jetzt
        </Button>
      </div>
    </div>
  );
}
