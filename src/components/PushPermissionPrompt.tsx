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

async function subscribeUser(): Promise<{ success: boolean; error?: string }> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return { success: false, error: "VAPID-Key fehlt (Vercel Env)" };

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { success: false, error: "Browser unterstützt kein Push" };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { success: false, error: "Berechtigung abgelehnt" };

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    const res = await savePushSubscription(subscription.toJSON());
    if (res && "error" in res) return { success: false, error: res.error };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export function PushPermissionPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (Notification.permission !== "default") return;

    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, []);

  async function handleAllow() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
    await subscribeUser();
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

/** Push-Einstellungen für die Profilseite */
export function PushSettings() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [permission, setPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  async function handleEnable() {
    setStatus("loading");
    const res = await subscribeUser();
    if (res.success) {
      setStatus("success");
      setMessage("Push aktiviert! Schick dir einen Test.");
      setPermission("granted");
      localStorage.removeItem("lgsd-push-prompted");
    } else {
      setStatus("error");
      setMessage(res.error ?? "Fehler");
    }
  }

  async function handleTest() {
    setStatus("loading");
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setMessage("Test-Push gesendet! Siehst du die Benachrichtigung?");
      } else {
        setStatus("error");
        setMessage(data.error ?? "Fehlgeschlagen");
      }
    } catch (e) {
      setStatus("error");
      setMessage(String(e));
    }
  }

  if (!("PushManager" in (typeof window !== "undefined" ? window : {}))) {
    return <p className="text-xs text-ink-light">Push wird in diesem Browser nicht unterstützt.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-ink-light">
        Status: <strong>{permission === "granted" ? "✅ Erlaubt" : permission === "denied" ? "❌ Blockiert" : "⏳ Nicht entschieden"}</strong>
      </p>
      <div className="flex flex-wrap gap-2">
        {permission !== "granted" && (
          <Button size="sm" onClick={handleEnable} disabled={status === "loading"}>
            🔔 Push aktivieren
          </Button>
        )}
        {permission === "granted" && (
          <>
            <Button size="sm" variant="outline" onClick={handleEnable} disabled={status === "loading"}>
              🔄 Neu abonnieren
            </Button>
            <Button size="sm" variant="outline" onClick={handleTest} disabled={status === "loading"}>
              🧪 Test-Push senden
            </Button>
          </>
        )}
      </div>
      {message && (
        <p className={`text-xs font-medium ${status === "success" ? "text-success-600" : "text-danger-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
