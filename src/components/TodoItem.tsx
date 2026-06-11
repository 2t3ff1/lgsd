"use client";

import { useRef, useState, useTransition } from "react";
import {
  confirmTodo,
  deleteTodo,
  markTodoDone,
  requestProof,
  uploadProof,
} from "@/app/actions/todos";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Input";
import { PointsPopup } from "@/components/PointsPopup";
import { cn } from "@/lib/utils";
import type { Todo, TodoConfirmation, TodoProof } from "@/types/database";

const recurrenceLabels: Record<string, string> = {
  daily: "Täglich",
  weekly: "Wöchentlich",
  monthly: "Monatlich",
};

export function TodoItem({
  todo,
  isOwn,
  workspaceId,
  proof,
  lastConfirmation,
}: {
  todo: Todo;
  isOwn: boolean;
  workspaceId: string;
  proof?: TodoProof;
  lastConfirmation?: TodoConfirmation;
}) {
  const [pending, startTransition] = useTransition();
  const [showProofRequest, setShowProofRequest] = useState(false);
  const [comment, setComment] = useState("");
  const [points, setPoints] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleMarkDone() {
    startTransition(async () => {
      await markTodoDone(workspaceId, todo.id);
      const file = fileRef.current?.files?.[0];
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        await uploadProof(workspaceId, todo.id, formData);
      }
    });
  }

  function handleConfirm(retro = false) {
    startTransition(async () => {
      const res = await confirmTodo(workspaceId, todo.id);
      if (!res?.error) {
        setPoints(retro ? 15 : 10);
      }
    });
  }

  function handleRequestProof() {
    startTransition(async () => {
      await requestProof(workspaceId, todo.id, comment);
      setShowProofRequest(false);
      setComment("");
    });
  }

  function handleUploadProof() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      await uploadProof(workspaceId, todo.id, formData);
    });
  }

  const isPendingForOthers = todo.status === "pending" && !isOwn;

  return (
    <div
      className={cn(
        "relative space-y-2 rounded-xl border-2 bg-white p-3 transition-colors",
        todo.status === "confirmed" && "border-success-500/40 bg-success-100/30",
        todo.status === "missed" && "border-danger-500/30 bg-danger-100/30",
        todo.status === "rejected" && "border-accent-400/50 bg-accent-50",
        todo.status === "pending" && "border-primary-200",
        todo.status === "open" && "border-primary-100",
        isPendingForOthers && "animate-pulse-ring"
      )}
    >
      {points !== null && <PointsPopup amount={points} onDone={() => setPoints(null)} />}

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
              todo.status === "confirmed"
                ? "animate-check-pop bg-success-500 text-white"
                : "border-2 border-primary-200"
            )}
          >
            {todo.status === "confirmed" ? "✓" : ""}
          </span>
          <div>
            <p
              className={cn(
                "font-medium leading-snug",
                (todo.status === "confirmed") && "text-ink-light line-through"
              )}
            >
              {todo.title}
            </p>
            {todo.is_recurring && todo.recurrence_type && (
              <span className="text-xs text-ink-light">
                🔁 {recurrenceLabels[todo.recurrence_type]}
              </span>
            )}
          </div>
        </div>
        {isOwn && todo.status === "open" && (
          <button
            onClick={() => deleteTodo(workspaceId, todo.id)}
            className="text-xs text-ink-light hover:text-danger-500"
            title="Löschen"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {todo.status === "open" && <Badge tone="neutral">Offen</Badge>}
        {todo.status === "pending" && <Badge tone="primary">⏳ Wartet auf Bestätigung</Badge>}
        {todo.status === "confirmed" && <Badge tone="success">Bestätigt ✅</Badge>}
        {todo.status === "rejected" && <Badge tone="accent">Beweis angefordert ❌</Badge>}
        {todo.status === "missed" && <Badge tone="danger">Verpasst (-5)</Badge>}
      </div>

      {lastConfirmation?.action === "requested_proof" && lastConfirmation.comment && (
        <p className="rounded-lg bg-accent-100 px-2 py-1.5 text-xs text-accent-700">
          💬 {lastConfirmation.comment}
        </p>
      )}

      {proof && (
        <a
          href={proof.file_url}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-xs font-semibold text-primary-600 underline"
        >
          📎 Beweis ansehen
        </a>
      )}

      {/* Eigene Aufgabe: als erledigt markieren */}
      {isOwn && todo.status === "open" && (
        <div className="space-y-2 pt-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="block w-full text-xs text-ink-light file:mr-2 file:rounded-lg file:border-0 file:bg-primary-50 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-primary-600"
          />
          <Button size="sm" onClick={handleMarkDone} disabled={pending} className="w-full">
            ✓ Ich bin fertig
          </Button>
        </div>
      )}

      {/* Eigene Aufgabe: Beweis nachreichen */}
      {isOwn && todo.status === "rejected" && (
        <div className="space-y-2 pt-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="block w-full text-xs text-ink-light file:mr-2 file:rounded-lg file:border-0 file:bg-primary-50 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-primary-600"
          />
          <Button size="sm" onClick={handleUploadProof} disabled={pending} className="w-full">
            📎 Beweis hochladen
          </Button>
        </div>
      )}

      {/* Andere Mitglieder: bestaetigen / Beweis anfordern */}
      {!isOwn && todo.status === "pending" && (
        <div className="space-y-2 pt-1">
          {!showProofRequest ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleConfirm(false)} disabled={pending} className="flex-1">
                ✅ Bestätigen
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowProofRequest(true)}
                disabled={pending}
                className="flex-1"
              >
                ❌ Beweis anfordern
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea
                rows={2}
                placeholder="Ich glaube dir das nicht, schick Beweis…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleRequestProof} disabled={pending} className="flex-1">
                  Senden
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowProofRequest(false)}>
                  Abbrechen
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Andere Mitglieder: nachtraegliche Bestaetigung fuer verpasste/abgelehnte Aufgaben */}
      {!isOwn && (todo.status === "missed" || todo.status === "rejected") && (
        <Button size="sm" variant="outline" onClick={() => handleConfirm(true)} disabled={pending} className="w-full">
          Nachträglich bestätigen
        </Button>
      )}
    </div>
  );
}
