"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Abonniert Aenderungen an Todos, Punkten und Streaks fuer diesen Workspace
 * und aktualisiert die Server-Daten der Seite, sobald andere Mitglieder
 * etwas aendern (neue Aufgaben, Statuswechsel, Verschiebungsantraege, ...).
 */
export function RealtimeRefresher({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    function scheduleRefresh() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => router.refresh(), 300);
    }

    const channel = supabase
      .channel(`workspace-${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todos", filter: `workspace_id=eq.${workspaceId}` },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "points", filter: `workspace_id=eq.${workspaceId}` },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "streaks", filter: `workspace_id=eq.${workspaceId}` },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes", filter: `workspace_id=eq.${workspaceId}` },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "note_replies" },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [workspaceId, router]);

  return null;
}
