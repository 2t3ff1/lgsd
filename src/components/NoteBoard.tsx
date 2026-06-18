"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createNote, deleteNote, createNoteReply, deleteNoteReply } from "@/app/actions/notes";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Note } from "@/types/database";

const NOTE_COLOR_CLASSES: Record<string, string> = {
  yellow: "bg-yellow-100 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800/40",
  green:  "bg-green-100 border-green-200 dark:bg-green-900/30 dark:border-green-800/40",
  blue:   "bg-blue-100 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800/40",
  pink:   "bg-pink-100 border-pink-200 dark:bg-pink-900/30 dark:border-pink-800/40",
  purple: "bg-purple-100 border-purple-200 dark:bg-purple-900/30 dark:border-purple-800/40",
  orange: "bg-orange-100 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800/40",
  sky:    "bg-sky-100 border-sky-200 dark:bg-sky-900/30 dark:border-sky-800/40",
};

export function NoteBoard({
  workspaceId,
  notes,
}: {
  workspaceId: string;
  notes: Note[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  function handleAddNote() {
    if (!newContent.trim()) return;
    startTransition(async () => {
      await createNote(workspaceId, newContent.trim());
      setNewContent("");
      setShowForm(false);
      router.refresh();
    });
  }

  function handleDeleteNote(noteId: string) {
    startTransition(async () => {
      await deleteNote(workspaceId, noteId);
      if (expandedId === noteId) setExpandedId(null);
      router.refresh();
    });
  }

  function handleAddReply(noteId: string) {
    if (!replyContent.trim()) return;
    startTransition(async () => {
      await createNoteReply(workspaceId, noteId, replyContent.trim());
      setReplyContent("");
      router.refresh();
    });
  }

  function handleDeleteReply(replyId: string) {
    startTransition(async () => {
      await deleteNoteReply(workspaceId, replyId);
      router.refresh();
    });
  }

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">
          📌 Zettel-Tafel
          {notes.length > 0 && (
            <span className="ml-2 text-sm font-normal text-ink-light">{notes.length}</span>
          )}
        </h2>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Abbrechen" : "+ Zettel"}
        </Button>
      </div>

      {showForm && (
        <div className="mb-4 rounded-2xl border-2 border-yellow-200 bg-yellow-100 p-4 dark:border-yellow-800/40 dark:bg-yellow-900/30">
          <textarea
            rows={3}
            placeholder="Was möchtest du pinnen?"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            maxLength={500}
            className="w-full resize-none rounded-xl border-0 bg-transparent text-sm focus:outline-none placeholder:text-ink-light/60"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" onClick={handleAddNote} disabled={pending || !newContent.trim()}>
              Pinnen
            </Button>
            <span className="text-xs text-ink-light">{newContent.length}/500</span>
          </div>
        </div>
      )}

      {notes.length === 0 && !showForm && (
        <p className="rounded-xl bg-surface-muted px-4 py-6 text-center text-sm text-ink-light">
          Noch keine Zettel — sei der Erste! 📌
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {notes.map((note) => {
          const colorClass = NOTE_COLOR_CLASSES[note.color] ?? NOTE_COLOR_CLASSES.yellow;
          const isExpanded = expandedId === note.id;
          const replyCount = note.note_replies?.length ?? 0;

          return (
            <div key={note.id} className={cn("rounded-2xl border-2 p-4 transition-shadow hover:shadow-soft", colorClass)}>
              {/* Header */}
              <div className="mb-2 flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-ink-light">
                  {note.profiles?.display_name ?? "Jemand"}
                </span>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  disabled={pending}
                  className="text-xs text-ink-light/50 transition-colors hover:text-danger-500"
                  title="Zettel löschen"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {note.content}
              </p>

              {/* Footer */}
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => {
                    setExpandedId(isExpanded ? null : note.id);
                    setReplyContent("");
                  }}
                  className="text-xs font-semibold text-ink-light transition-colors hover:text-primary-600"
                >
                  💬 {replyCount} {replyCount === 1 ? "Antwort" : "Antworten"}
                </button>
                <span className="text-[10px] text-ink-light/40">
                  {new Date(note.created_at).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </span>
              </div>

              {/* Replies */}
              {isExpanded && (
                <div className="mt-3 space-y-2 border-t border-black/10 pt-3 dark:border-white/10">
                  {(note.note_replies ?? []).map((reply) => (
                    <div key={reply.id} className="flex items-start gap-2 text-xs">
                      <span className="shrink-0 font-semibold text-ink-light">
                        {reply.profiles?.display_name ?? "?"}:
                      </span>
                      <span className="flex-1 break-words">{reply.content}</span>
                      <button
                        onClick={() => handleDeleteReply(reply.id)}
                        disabled={pending}
                        className="shrink-0 text-ink-light/40 transition-colors hover:text-danger-500"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* Reply input */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Antworten…"
                      maxLength={500}
                      className="flex-1 rounded-xl border border-black/15 bg-transparent px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-400 dark:border-white/15"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAddReply(note.id);
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAddReply(note.id)}
                      disabled={pending || !replyContent.trim()}
                      className="px-3 text-xs"
                    >
                      ↵
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
