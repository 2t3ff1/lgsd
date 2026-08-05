"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PetAnimal } from "@/components/pet/Animals";
import { setIsWorking, getTodayTodos } from "@/app/actions/pet";
import type { PetType, PetState } from "@/components/pet/Animals";

const INACTIVITY_MS = 10 * 60 * 1000;
const DANCE_MS = 4000;
const DEFAULT_PET: PetType = "cat";
const PET_W = 160;
const PET_H = 230;
const POPUP_W = 380;
const POPUP_H = 500;

type PresenceRow = {
  user_id: string;
  workspace_id: string;
  is_working: boolean;
  pet_type: string | null;
  display_name?: string;
};

type TodoRow = {
  id: string;
  title: string;
  status: string;
  suggested_points: number;
  workspace_id: string;
};

export default function PetPage() {
  const [petType, setPetType] = useState<PetType>(DEFAULT_PET);
  const [petState, setPetState] = useState<PetState>("active");
  const [isWorking, setIsWorkingState] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [otherPets, setOtherPets] = useState<PresenceRow[]>([]);
  const [toggling, setToggling] = useState(false);
  const [userName, setUserName] = useState("");
  const lastActivityRef = useRef(Date.now());
  const dancingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isElectron = typeof window !== "undefined" && typeof window.electronPet !== "undefined";

  const triggerDance = useCallback(() => {
    setPetState("dancing");
    if (dancingTimeoutRef.current) clearTimeout(dancingTimeoutRef.current);
    dancingTimeoutRef.current = setTimeout(() => {
      setPetState(isWorking ? "active" : "sleeping");
    }, DANCE_MS);
  }, [isWorking]);

  // Activity tracking → sleeping after inactivity
  useEffect(() => {
    const bump = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener("mousemove", bump);
    window.addEventListener("keydown", bump);

    inactivityTimerRef.current = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current > INACTIVITY_MS;
      setPetState((prev) => {
        if (prev === "dancing") return prev;
        return idle ? "sleeping" : "active";
      });
    }, 30_000);

    return () => {
      window.removeEventListener("mousemove", bump);
      window.removeEventListener("keydown", bump);
      if (inactivityTimerRef.current) clearInterval(inactivityTimerRef.current);
    };
  }, []);

  // Load user + pet type + is_working
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      supabase
        .from("profiles")
        .select("pet_type, display_name")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.pet_type) setPetType(data.pet_type as PetType);
          if (data?.display_name) setUserName(data.display_name);
        });

      supabase
        .from("user_presence")
        .select("is_working, workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.is_working) setIsWorkingState(true);
        });

      // Subscribe to own profile changes (pet_type update)
      supabase
        .channel("pet-profile")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
          (payload) => {
            const pt = (payload.new as { pet_type?: string }).pet_type;
            if (pt) setPetType(pt as PetType);
          }
        )
        .subscribe();

      // Load other workspace members' pets
      supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .then(({ data: memberships }) => {
          const wsIds = (memberships ?? []).map((m) => m.workspace_id);
          if (!wsIds.length) return;

          supabase
            .from("user_presence")
            .select("user_id, workspace_id, is_working, pet_type, profiles(display_name)")
            .in("workspace_id", wsIds)
            .eq("is_working", true)
            .neq("user_id", user.id)
            .then(({ data }) => {
              setOtherPets(
                (data ?? []).map((r) => ({
                  user_id: r.user_id,
                  workspace_id: r.workspace_id,
                  is_working: r.is_working,
                  pet_type: r.pet_type,
                  display_name: (r.profiles as unknown as { display_name: string } | null)?.display_name,
                }))
              );
            });

          // Realtime subscription for others
          const channel = supabase
            .channel("other-pets")
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "user_presence" },
              () => {
                supabase
                  .from("user_presence")
                  .select("user_id, workspace_id, is_working, pet_type, profiles(display_name)")
                  .in("workspace_id", wsIds)
                  .eq("is_working", true)
                  .neq("user_id", user.id)
                  .then(({ data }) => {
                    setOtherPets(
                      (data ?? []).map((r) => ({
                        user_id: r.user_id,
                        workspace_id: r.workspace_id,
                        is_working: r.is_working,
                        pet_type: r.pet_type,
                        display_name: (r.profiles as unknown as { display_name: string } | null)?.display_name,
                      }))
                    );
                  });
              }
            )
            .subscribe();

          return () => { supabase.removeChannel(channel); };
        });
    });
  }, []);

  // Listen for tray toggle from main process
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => handleToggleWorking();
    window.addEventListener("electron-tray-toggle", handler);
    return () => window.removeEventListener("electron-tray-toggle", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWorking]);

  async function handleToggleWorking() {
    if (toggling) return;
    setToggling(true);
    const next = !isWorking;
    setIsWorkingState(next);
    setPetState(next ? "active" : "sleeping");
    await setIsWorking(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("electron-working-changed", { detail: next }));
    }
    setToggling(false);
  }

  async function handlePetClick() {
    if (showPopup) {
      setShowPopup(false);
      if (isElectron) window.electronPet!.resize(PET_W, PET_H);
      return;
    }
    const { todos: data } = await getTodayTodos();
    setTodos(data);
    setShowPopup(true);
    if (isElectron) window.electronPet!.resize(POPUP_W, POPUP_H);
  }

  async function markDone(todoId: string) {
    const supabase = createClient();
    await supabase
      .from("todos")
      .update({ status: "pending" })
      .eq("id", todoId);
    setTodos((prev) =>
      prev.map((t) => (t.id === todoId ? { ...t, status: "pending" } : t))
    );
    triggerDance();
  }

  const doneTodos = todos.filter((t) => t.status === "confirmed" || t.status === "pending");
  const openTodos = todos.filter((t) => t.status === "open");

  return (
    <div
      style={{
        width: isElectron ? (showPopup ? POPUP_W : PET_W) : "100%",
        minHeight: isElectron ? (showPopup ? POPUP_H : PET_H) : "100vh",
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        fontFamily: "system-ui, sans-serif",
        paddingBottom: 8,
      }}
    >
      {/* todo popup */}
      {showPopup && (
        <div
          style={{
            width: POPUP_W - 20,
            maxHeight: POPUP_H - PET_H - 24,
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarWidth: "none",
            background: "rgba(15,15,25,0.96)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "16px",
            marginBottom: 10,
            color: "white",
            fontSize: 13,
            WebkitAppRegion: "no-drag",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          } as React.CSSProperties}
        >
          <style>{`div::-webkit-scrollbar { display: none; }`}</style>

          {/* header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, margin: 0, letterSpacing: -0.3 }}>
                Aufgaben heute
              </p>
              {todos.length > 0 && (
                <p style={{ margin: 0, fontSize: 11, color: "#60a5fa", marginTop: 2 }}>
                  {doneTodos.length}/{todos.length} erledigt
                </p>
              )}
            </div>
            <button
              onClick={handlePetClick}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "none",
                borderRadius: 8,
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: 14,
                lineHeight: 1,
                padding: "4px 7px",
              }}
            >
              ✕
            </button>
          </div>

          {/* progress bar */}
          {todos.length > 0 && (
            <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", marginBottom: 12 }}>
              <div style={{
                height: "100%",
                borderRadius: 2,
                background: "linear-gradient(90deg,#60a5fa,#a78bfa)",
                width: `${Math.round((doneTodos.length / todos.length) * 100)}%`,
                transition: "width 0.4s ease",
              }} />
            </div>
          )}

          {todos.length === 0 && (
            <p style={{ color: "#64748b", fontSize: 13, textAlign: "center", padding: "12px 0" }}>
              Kein Plan für heute 🎉
            </p>
          )}

          {/* open todos */}
          {openTodos.map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                borderRadius: 10,
                marginBottom: 6,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <button
                onClick={() => markDone(t.id)}
                title="Als eingereicht markieren"
                style={{
                  flexShrink: 0,
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: "2px solid #60a5fa",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  fontSize: 11,
                  color: "#60a5fa",
                }}
              />
              <span style={{ flex: 1, fontSize: 13, lineHeight: 1.35, wordBreak: "break-word" }}>
                {t.title}
              </span>
              <span style={{
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 700,
                color: "#60a5fa",
                background: "rgba(96,165,250,0.12)",
                borderRadius: 6,
                padding: "2px 6px",
              }}>
                {t.suggested_points}p
              </span>
            </div>
          ))}

          {/* done todos */}
          {doneTodos.map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                borderRadius: 10,
                marginBottom: 6,
                background: "rgba(34,197,94,0.05)",
                border: "1px solid rgba(34,197,94,0.12)",
                opacity: 0.6,
              }}
            >
              <span style={{ flexShrink: 0, color: "#4ade80", fontSize: 14 }}>✓</span>
              <span style={{ flex: 1, fontSize: 13, textDecoration: "line-through", color: "#64748b", wordBreak: "break-word" }}>
                {t.title}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* other active pets */}
      {otherPets.length > 0 && !showPopup && (
        <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
          {otherPets.slice(0, 3).map((p) => (
            <div key={p.user_id} style={{ textAlign: "center" }}>
              <PetAnimal type={(p.pet_type ?? "cat") as PetType} state="active" size={36} />
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", maxWidth: 40, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.display_name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* main pet — drag handle (the whole top area) + clickable pet */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          WebkitAppRegion: "drag",
        } as React.CSSProperties}
      >
        <div
          onClick={handlePetClick}
          style={{ cursor: "pointer", WebkitAppRegion: "no-drag" } as React.CSSProperties}
          title="Klicken für Aufgaben"
        >
          <PetAnimal type={petType} state={petState} size={110} />
        </div>

        {userName && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: -2, fontWeight: 600 }}>
            {userName}
          </div>
        )}

        <button
          onClick={handleToggleWorking}
          disabled={toggling}
          style={{
            marginTop: 6,
            padding: "4px 12px",
            borderRadius: 20,
            border: "none",
            background: isWorking ? "rgba(34,197,94,0.85)" : "rgba(255,255,255,0.15)",
            color: "white",
            fontSize: 12,
            fontWeight: 600,
            cursor: toggling ? "default" : "pointer",
            backdropFilter: "blur(8px)",
            WebkitAppRegion: "no-drag",
            transition: "background 0.2s",
          } as React.CSSProperties}
        >
          {isWorking ? "✅ Arbeite" : "☕ Arbeite jetzt"}
        </button>
      </div>
    </div>
  );
}
