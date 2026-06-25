"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendChatMessage } from "@/app/actions/chat";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { ChatMessage, Profile } from "@/types/database";
import { ONLINE_THRESHOLD_MS } from "@/types/database";

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function ChatBox({
  workspaceId,
  currentUserId,
  members,
  initialMessages,
  initialPresence,
}: {
  workspaceId: string;
  currentUserId: string;
  members: Profile[];
  initialMessages: ChatMessage[];
  initialPresence: Record<string, string>;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [presence, setPresence] = useState<Record<string, string>>(initialPresence);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const membersById = useRef(new Map(members.map((m) => [m.id, m])));

  useEffect(() => {
    membersById.current = new Map(members.map((m) => [m.id, m]));
  }, [members]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();

    supabase.rpc("touch_presence", { _workspace_id: workspaceId });
    const heartbeat = setInterval(() => {
      supabase.rpc("touch_presence", { _workspace_id: workspaceId });
    }, 60_000);

    const channel = supabase
      .channel(`chat-${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          const row = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          const row = payload.new as { user_id: string; last_seen: string };
          setPresence((prev) => ({ ...prev, [row.user_id]: row.last_seen }));
        }
      )
      .subscribe();

    return () => {
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);

  function isOnline(userId: string) {
    const lastSeen = presence[userId];
    if (!lastSeen) return false;
    return Date.now() - new Date(lastSeen).getTime() < ONLINE_THRESHOLD_MS;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setDraft("");
    const res = await sendChatMessage(workspaceId, content);
    if (res?.error) {
      setDraft(content);
    }
    setSending(false);
  }

  return (
    <Card className="flex h-[420px] flex-col rounded-2xl">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-bold">💬 Chat</h2>
        <div className="flex -space-x-2">
          {members.map((m) => (
            <div key={m.id} className="relative">
              <Avatar name={m.display_name} url={m.avatar_url} color={m.avatar_color} size="sm" />
              {isOnline(m.id) && (
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-success-500" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="mt-6 text-center text-sm text-ink-light">Noch keine Nachrichten. Schreib was! 👋</p>
        ) : (
          messages.map((m) => {
            const sender = membersById.current.get(m.user_id);
            const isOwn = m.user_id === currentUserId;
            return (
              <div key={m.id} className={`flex items-start gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
                <Avatar
                  name={sender?.display_name ?? "?"}
                  url={sender?.avatar_url}
                  color={sender?.avatar_color}
                  size="sm"
                />
                <div className={`max-w-[75%] ${isOwn ? "text-right" : ""}`}>
                  <div
                    className={`inline-block rounded-2xl px-3 py-2 text-sm ${
                      isOwn ? "bg-primary-500 text-white" : "bg-surface-muted"
                    }`}
                  >
                    {m.content}
                  </div>
                  <p className="mt-0.5 text-[11px] text-ink-light">
                    {sender?.display_name ?? "?"} · {formatTime(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Nachricht schreiben…"
          className="flex-1 rounded-xl border-2 border-border-subtle bg-surface px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
        />
        <Button type="submit" size="sm" disabled={sending || !draft.trim()}>
          Senden
        </Button>
      </form>
    </Card>
  );
}
