"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TodoRow = {
  id: string;
  title: string;
  status: string;
  suggested_points: number;
};

export default function PetPopupPage() {
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodos();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadTodos() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("todos")
      .select("id, title, status, suggested_points")
      .eq("user_id", user.id)
      .eq("date", today)
      .neq("status", "missed")
      .order("created_at", { ascending: true });
    setTodos(data ?? []);
    setLoading(false);
  }

  async function markDone(todoId: string) {
    const supabase = createClient();
    await supabase.from("todos").update({ status: "pending" }).eq("id", todoId);
    setTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, status: "pending" } : t)));
    if (typeof window.electronPopup !== "undefined") {
      window.electronPopup!.markDone();
    }
  }

  function handleClose() {
    if (typeof window.electronPopup !== "undefined") {
      window.electronPopup!.close();
    }
  }

  const doneTodos = todos.filter((t) => t.status === "confirmed" || t.status === "pending");
  const openTodos = todos.filter((t) => t.status === "open");

  return (
    <div style={{
      width: 380, height: 500,
      background: "rgba(15,15,25,0.96)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,0.08)",
      padding: "16px",
      color: "white",
      fontSize: 13,
      fontFamily: "system-ui, sans-serif",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexShrink: 0 }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 15, margin: 0, letterSpacing: -0.3 }}>Aufgaben heute</p>
          {todos.length > 0 && (
            <p style={{ margin: 0, fontSize: 11, color: "#60a5fa", marginTop: 2 }}>
              {doneTodos.length}/{todos.length} erledigt
            </p>
          )}
        </div>
        <button
          onClick={handleClose}
          style={{
            background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8,
            color: "#94a3b8", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "4px 7px",
          }}
        >
          ✕
        </button>
      </div>

      {/* progress bar */}
      {todos.length > 0 && (
        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", marginBottom: 12, flexShrink: 0 }}>
          <div style={{
            height: "100%", borderRadius: 2,
            background: "linear-gradient(90deg,#60a5fa,#a78bfa)",
            width: `${Math.round((doneTodos.length / todos.length) * 100)}%`,
            transition: "width 0.4s ease",
          }} />
        </div>
      )}

      {/* scrollable list */}
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
        <style dangerouslySetInnerHTML={{ __html: "div::-webkit-scrollbar{display:none}" }} />

        {loading && (
          <p style={{ color: "#64748b", textAlign: "center", padding: "12px 0" }}>Lädt...</p>
        )}
        {!loading && todos.length === 0 && (
          <p style={{ color: "#64748b", textAlign: "center", padding: "12px 0" }}>Kein Plan für heute 🎉</p>
        )}

        {openTodos.map((t) => (
          <div key={t.id} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
            borderRadius: 10, marginBottom: 6,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <button
              onClick={() => markDone(t.id)}
              title="Als eingereicht markieren"
              style={{
                flexShrink: 0, width: 22, height: 22, borderRadius: 6,
                border: "2px solid #60a5fa", background: "transparent",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", padding: 0, fontSize: 11, color: "#60a5fa",
              }}
            />
            <span style={{ flex: 1, fontSize: 13, lineHeight: 1.35, wordBreak: "break-word" }}>
              {t.title}
            </span>
            <span style={{
              flexShrink: 0, fontSize: 11, fontWeight: 700, color: "#60a5fa",
              background: "rgba(96,165,250,0.12)", borderRadius: 6, padding: "2px 6px",
            }}>
              {t.suggested_points}p
            </span>
          </div>
        ))}

        {doneTodos.map((t) => (
          <div key={t.id} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
            borderRadius: 10, marginBottom: 6,
            background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.12)", opacity: 0.6,
          }}>
            <span style={{ flexShrink: 0, color: "#4ade80", fontSize: 14 }}>✓</span>
            <span style={{ flex: 1, fontSize: 13, textDecoration: "line-through", color: "#64748b", wordBreak: "break-word" }}>
              {t.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
