"use client";

import { useRef, useState, useTransition } from "react";
import {
  confirmTodo,
  deleteTodo,
  markTodoDone,
  requestProof,
  requestShift,
  resolveShift,
  uploadProof,
} from "@/app/actions/todos";
import { toggleReaction } from "@/app/actions/reactions";
import { createSubtask } from "@/app/actions/subtasks";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Textarea, Input, Label } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PointsPopup } from "@/components/PointsPopup";
import { SubtaskRow } from "@/components/SubtaskRow";
import { cn } from "@/lib/utils";
import {
  POINT_OPTIONS,
  type Subtask,
  type Todo,
  type TodoConfirmation,
  type TodoProof,
  type TodoReaction,
} from "@/types/database";

const recurrenceLabels: Record<string, string> = {
  daily: "Täglich",
  weekly: "Wöchentlich",
  monthly: "Monatlich",
};

const REACTION_EMOJIS = ["👍", "🎉", "🔥", "❤️", "😂", "👏"];

export function TodoItem({
  todo,
  isOwn,
  workspaceId,
  proof,
  lastConfirmation,
  reactions = [],
  subtasks = [],
  currentUserId,
  canDelete,
}: {
  todo: Todo;
  isOwn: boolean;
  workspaceId: string;
  proof?: TodoProof;
  lastConfirmation?: TodoConfirmation;
  reactions?: TodoReaction[];
  subtasks?: Subtask[];
  currentUserId?: string;
  canDelete?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [showProofRequest, setShowProofRequest] = useState(false);
  const [comment, setComment] = useState("");
  const [points, setPoints] = useState<number | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftDate, setShiftDate] = useState(todo.date);
  const [shiftReason, setShiftReason] = useState("");
  const [shiftError, setShiftError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [confirmDialog, setConfirmDialog] = useState<"normal" | "retro" | null>(null);
  const [selectedPoints, setSelectedPoints] = useState(todo.suggested_points);
  const [pointsReason, setPointsReason] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskPoints, setSubtaskPoints] = useState(5);

  const hasSubtasks = subtasks.length > 0;

  function handleAddSubtask() {
    if (!subtaskTitle.trim()) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.append("title", subtaskTitle.trim());
      formData.append("suggested_points", String(subtaskPoints));
      const res = await createSubtask(workspaceId, todo.id, formData);
      if (!res?.error) {
        setSubtaskTitle("");
        setSubtaskPoints(5);
        setShowAddSubtask(false);
      }
    });
  }

  function handleToggleReaction(emoji: string) {
    setShowEmojiPicker(false);
    startTransition(async () => {
      await toggleReaction(workspaceId, todo.id, emoji);
    });
  }

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

  function openConfirmDialog(mode: "normal" | "retro") {
    setSelectedPoints(todo.suggested_points);
    setPointsReason("");
    setConfirmDialog(mode);
  }

  function handleConfirmSubmit() {
    startTransition(async () => {
      const reason =
        selectedPoints !== todo.suggested_points ? pointsReason.trim() || undefined : undefined;
      const res = await confirmTodo(workspaceId, todo.id, selectedPoints, reason);
      if (!res?.error) {
        setPoints(selectedPoints);
        setConfirmDialog(null);
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

  function handleRequestShift() {
    if (!shiftDate || !shiftReason.trim()) {
      setShiftError("Bitte Datum und Grund angeben.");
      return;
    }
    setShiftError(null);
    startTransition(async () => {
      const res = await requestShift(workspaceId, todo.id, shiftDate, shiftReason.trim());
      if (res?.error) {
        setShiftError(res.error);
        return;
      }
      setShowShiftModal(false);
      setShiftReason("");
    });
  }

  function handleResolveShift(decision: "approve_no_penalty" | "approve_with_penalty" | "reject") {
    startTransition(async () => {
      await resolveShift(workspaceId, todo.id, decision);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteTodo(workspaceId, todo.id);
      setShowDeleteDialog(false);
    });
  }

  const isPendingForOthers = todo.status === "pending" && !isOwn;
  const shiftLimitReached = todo.shift_count >= 3;
  const shiftPending = todo.shift_request_status === "pending";
  const nextPenalty = [3, 6, 10][Math.min(todo.shift_count, 2)];

  return (
    <div
      className={cn(
        "relative space-y-1.5 rounded-xl border-2 bg-surface p-2.5 text-sm transition-colors",
        todo.status === "confirmed" && "border-success-500/40 bg-success-100/30 dark:bg-success-500/10",
        todo.status === "missed" && "border-danger-500/30 bg-danger-100/30 dark:bg-danger-500/10",
        todo.status === "rejected" && "border-accent-400/50 bg-accent-50 dark:bg-accent-500/10",
        todo.status === "pending" && "border-primary-200 dark:border-primary-300/30",
        todo.status === "open" && "border-border-subtle",
        todo.shift_auto_approved && "border-amber-400/60 bg-amber-50 dark:bg-amber-500/10",
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
        {canDelete && (
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="text-xs text-ink-light hover:text-danger-500"
            title="Löschen"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {todo.scheduled_time && (
          <span className="text-xs font-medium text-ink-light">
            🕐 {todo.scheduled_time.slice(0, 5)} Uhr
          </span>
        )}
        {todo.status === "open" && <Badge tone="neutral">Offen</Badge>}
        {todo.status === "pending" && <Badge tone="primary">⏳ Wartet auf Bestätigung</Badge>}
        {todo.status === "confirmed" && <Badge tone="success">Bestätigt ✅</Badge>}
        {todo.status === "rejected" && <Badge tone="accent">Beweis angefordert ❌</Badge>}
        {todo.status === "missed" && <Badge tone="danger">Verpasst (-5)</Badge>}
        {hasSubtasks ? (
          <Badge tone="neutral">Punkte = Summe der Unteraufgaben</Badge>
        ) : (
          <Badge tone="neutral">{todo.suggested_points} Pkt. vorgeschlagen</Badge>
        )}
        {todo.is_deadline_task && todo.deadline_date && (
          <Badge tone="amber">⏳ Frist: {todo.deadline_date}</Badge>
        )}
        {todo.shift_auto_approved && (
          <Badge tone="amber">⚠️ Automatisch verschoben (ohne Genehmigung)</Badge>
        )}
        {shiftPending && <Badge tone="amber">📅 Verschiebung beantragt</Badge>}
      </div>

      {todo.status === "confirmed" && lastConfirmation?.action === "confirmed" && (
        <div className="flex items-center gap-1.5 text-xs text-ink-light">
          <Avatar
            name={lastConfirmation.confirmer_name ?? "?"}
            url={lastConfirmation.confirmer_avatar_url}
            color={lastConfirmation.confirmer_avatar_color}
            size="xs"
          />
          <span>Bestätigt von {lastConfirmation.confirmer_name ?? "Jemand"}</span>
        </div>
      )}

      {lastConfirmation?.action === "requested_proof" && (
        <p className="rounded-lg bg-accent-100 px-2 py-1.5 text-xs text-accent-700 dark:bg-accent-500/20 dark:text-accent-300">
          💬 {lastConfirmation.confirmer_name ?? "Jemand"} hat einen Beweis angefordert
          {lastConfirmation.comment ? `: ${lastConfirmation.comment}` : ""}
        </p>
      )}

      {shiftPending && (
        <div className="space-y-2 rounded-lg bg-amber-100 px-2.5 py-2 text-xs text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
          <p>
            📅 Verschiebung auf <strong>{todo.shift_request_date}</strong> beantragt.
          </p>
          {todo.shift_request_reason && <p>Grund: {todo.shift_request_reason}</p>}
          {!isOwn && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleResolveShift("approve_no_penalty")}
                disabled={pending}
              >
                Verschieben ohne Punktabzug
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleResolveShift("approve_with_penalty")}
                disabled={pending}
              >
                Verschieben mit Punktabzug (-{nextPenalty})
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-danger-500"
                onClick={() => handleResolveShift("reject")}
                disabled={pending}
              >
                Ablehnen
              </Button>
            </div>
          )}
        </div>
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

      {todo.status === "confirmed" && (
        <div className="relative flex flex-wrap items-center gap-1.5 pt-1">
          {Object.entries(
            reactions.reduce<Record<string, TodoReaction[]>>((acc, r) => {
              (acc[r.emoji] ??= []).push(r);
              return acc;
            }, {})
          ).map(([emoji, list]) => {
            const ownReaction = currentUserId ? list.find((r) => r.user_id === currentUserId) : undefined;
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => handleToggleReaction(emoji)}
                disabled={pending}
                title={list.map((r) => r.profiles?.display_name ?? "Jemand").join(", ")}
                className={cn(
                  "flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-xs font-semibold transition-colors",
                  ownReaction
                    ? "border-primary-400 bg-primary-100 dark:bg-primary-500/20"
                    : "border-border-subtle bg-surface-muted hover:border-primary-300"
                )}
              >
                <span>{emoji}</span>
                <span>{list.length}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowEmojiPicker((v) => !v)}
            className="rounded-full border-2 border-dashed border-border-subtle px-2 py-0.5 text-xs text-ink-light hover:border-primary-300 hover:text-primary-600"
          >
            + 😊
          </button>

          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 z-10 mb-1 flex gap-1 rounded-xl border-2 border-border-subtle bg-surface p-1.5 shadow-soft">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleToggleReaction(emoji)}
                  className="rounded-lg p-1 text-lg transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Unteraufgaben */}
      {(hasSubtasks || isOwn) && (
        <div className="space-y-1.5 border-l-2 border-border-subtle pl-3">
          {subtasks.map((s) => (
            <SubtaskRow key={s.id} subtask={s} workspaceId={workspaceId} isOwn={isOwn} canDelete={isOwn} />
          ))}

          {isOwn && todo.status !== "confirmed" && (
            <div>
              {!showAddSubtask ? (
                <button
                  type="button"
                  onClick={() => setShowAddSubtask(true)}
                  className="text-xs font-semibold text-primary-600 hover:underline"
                >
                  + Unteraufgabe hinzufügen
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Input
                    value={subtaskTitle}
                    onChange={(e) => setSubtaskTitle(e.target.value)}
                    placeholder="Titel der Unteraufgabe"
                    className="flex-1 min-w-[140px] py-1.5 text-sm"
                  />
                  <select
                    value={subtaskPoints}
                    onChange={(e) => setSubtaskPoints(Number(e.target.value))}
                    className="rounded-xl border-2 border-border-subtle bg-surface px-2 py-1.5 text-sm"
                  >
                    {POINT_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p} Pkt.
                      </option>
                    ))}
                  </select>
                  <Button size="sm" onClick={handleAddSubtask} disabled={pending || !subtaskTitle.trim()}>
                    Hinzufügen
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddSubtask(false)}>
                    Abbrechen
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Eigene Aufgabe: als erledigt markieren (nicht bei Unteraufgaben - Status folgt aus diesen) */}
      {!hasSubtasks && isOwn && todo.status === "open" && (
        <div className="space-y-2 pt-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="block w-full text-xs text-ink-light file:mr-2 file:rounded-lg file:border-0 file:bg-surface-muted file:px-2 file:py-1 file:text-xs file:font-semibold file:text-primary-600"
          />
          <Button size="sm" onClick={handleMarkDone} disabled={pending} className="w-full">
            ✓ Ich bin fertig
          </Button>
        </div>
      )}

      {/* Eigene Aufgabe: Beweis nachreichen */}
      {!hasSubtasks && isOwn && todo.status === "rejected" && (
        <div className="space-y-2 pt-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="block w-full text-xs text-ink-light file:mr-2 file:rounded-lg file:border-0 file:bg-surface-muted file:px-2 file:py-1 file:text-xs file:font-semibold file:text-primary-600"
          />
          <Button size="sm" onClick={handleUploadProof} disabled={pending} className="w-full">
            📎 Beweis hochladen
          </Button>
        </div>
      )}

      {/* Andere Mitglieder: bestaetigen / Beweis anfordern */}
      {!hasSubtasks && !isOwn && todo.status === "pending" && (
        <div className="space-y-2 pt-1">
          {!showProofRequest ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => openConfirmDialog("normal")} disabled={pending} className="flex-1">
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
      {!hasSubtasks && !isOwn && (todo.status === "missed" || todo.status === "rejected") && (
        <Button size="sm" variant="outline" onClick={() => openConfirmDialog("retro")} disabled={pending} className="w-full">
          Nachträglich bestätigen
        </Button>
      )}

      {/* Eigene Aufgabe: Verschiebung beantragen - nur solange offen und kein Fristdatum */}
      {isOwn && todo.status === "open" && !todo.is_deadline_task && (
        <Button
          size="sm"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setShiftDate(todo.date);
            setShiftError(null);
            setShowShiftModal(true);
          }}
          disabled={pending || shiftLimitReached || shiftPending}
          title={shiftLimitReached ? "Maximale Anzahl an Verschiebungen erreicht" : undefined}
        >
          📅 Verschieben {shiftLimitReached ? "(Limit erreicht)" : `(${todo.shift_count}/3)`}
        </Button>
      )}

      <ConfirmDialog
        open={showShiftModal}
        title="Aufgabe verschieben"
        description="Wähle ein neues Datum und gib einen Grund für die Verschiebung an."
        confirmLabel="Antrag stellen"
        confirmVariant="primary"
        loading={pending}
        onConfirm={handleRequestShift}
        onCancel={() => setShowShiftModal(false)}
      >
        <div className="space-y-3">
          <div>
            <Label htmlFor={`shift-date-${todo.id}`}>Neues Datum</Label>
            <Input
              id={`shift-date-${todo.id}`}
              type="date"
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`shift-reason-${todo.id}`}>Grund für die Verschiebung</Label>
            <Textarea
              id={`shift-reason-${todo.id}`}
              rows={2}
              value={shiftReason}
              onChange={(e) => setShiftReason(e.target.value)}
              placeholder="z.B. Termin verschoben, krank, …"
            />
          </div>
          {shiftError && <p className="text-sm font-medium text-danger-600">{shiftError}</p>}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmDialog !== null}
        title="Aufgabe bestätigen"
        description={`Vorschlag des Erstellers: ${todo.suggested_points} Punkte. Wähle die Punktzahl, die vergeben werden soll.`}
        confirmLabel="Bestätigen & Punkte vergeben"
        confirmVariant="primary"
        loading={pending}
        onConfirm={handleConfirmSubmit}
        onCancel={() => setConfirmDialog(null)}
      >
        <div className="space-y-3">
          <div>
            <Label>Punkte</Label>
            <div className="flex gap-1.5">
              {POINT_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPoints(p)}
                  className={cn(
                    "flex-1 rounded-xl border-2 px-2 py-1.5 text-center text-sm font-semibold transition-colors",
                    selectedPoints === p
                      ? "border-primary-400 bg-primary-100 text-primary-700 dark:bg-primary-500/20"
                      : "border-border-subtle bg-surface"
                  )}
                >
                  {p}
                  {p === todo.suggested_points && (
                    <span className="ml-1 text-[10px] font-normal text-ink-light">Vorschlag</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          {selectedPoints !== todo.suggested_points && (
            <div>
              <Label htmlFor={`points-reason-${todo.id}`}>Begründung (optional)</Label>
              <Textarea
                id={`points-reason-${todo.id}`}
                rows={2}
                value={pointsReason}
                onChange={(e) => setPointsReason(e.target.value)}
                placeholder="Warum eine andere Punktzahl?"
              />
            </div>
          )}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={showDeleteDialog}
        title="Aufgabe löschen?"
        description={`„${todo.title}“ wird unwiderruflich gelöscht.`}
        confirmLabel="Löschen"
        loading={pending}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}
