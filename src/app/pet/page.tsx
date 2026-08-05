"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PetAnimal } from "@/components/pet/Animals";
import { setIsWorking } from "@/app/actions/pet";
import type { PetType, PetState } from "@/components/pet/Animals";

const INACTIVITY_MS = 10 * 60 * 1000;
const DANCE_MS = 4000;
const DEFAULT_PET: PetType = "cat";
const PET_W = 104;
const PET_H = 120;
const DRAG_THRESHOLD = 4;

type PresenceRow = {
  user_id: string;
  workspace_id: string;
  is_working: boolean;
  pet_type: string | null;
  display_name?: string;
};

export default function PetPage() {
  const [petType, setPetType] = useState<PetType>(DEFAULT_PET);
  const [petState, setPetState] = useState<PetState>("active");
  const [isWorking, setIsWorkingState] = useState(false);
  const [otherPets, setOtherPets] = useState<PresenceRow[]>([]);
  const [toggling, setToggling] = useState(false);
  const [userName, setUserName] = useState("");
  const [isElectron, setIsElectron] = useState(false);

  const lastActivityRef = useRef(Date.now());
  const dancingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // drag tracking — delta-based to avoid transparent window coordinate offset on Windows
  const dragRef = useRef<{
    startClientX: number;
    startClientY: number;
    lastClientX: number;
    lastClientY: number;
    moved: boolean;
  } | null>(null);
  // rAF throttling — accumulate deltas, flush once per frame (~16ms = 60fps)
  const pendingDeltaRef = useRef<{ dx: number; dy: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setIsElectron(typeof window.electronPet !== "undefined");
  }, []);

  // Cancel any pending rAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const triggerDance = useCallback(() => {
    setPetState("dancing");
    if (dancingTimeoutRef.current) clearTimeout(dancingTimeoutRef.current);
    dancingTimeoutRef.current = setTimeout(() => {
      setPetState(isWorking ? "active" : "sleeping");
    }, DANCE_MS);
  }, [isWorking]);

  // Dance trigger forwarded from popup window via IPC → DOM event in preload
  useEffect(() => {
    const handler = () => triggerDance();
    window.addEventListener("pet-trigger-dance", handler);
    return () => window.removeEventListener("pet-trigger-dance", handler);
  }, [triggerDance]);

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

      supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .then(({ data: memberships }) => {
          const wsIds = (memberships ?? []).map((m) => m.workspace_id);
          if (!wsIds.length) return;

          const loadOthers = () =>
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

          loadOthers();

          const channel = supabase
            .channel("other-pets")
            .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, loadOthers)
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

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!isElectron) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      lastClientX: e.clientX,
      lastClientY: e.clientY,
      moved: false,
    };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const absDx = e.clientX - dragRef.current.startClientX;
    const absDy = e.clientY - dragRef.current.startClientY;
    if (!dragRef.current.moved && (Math.abs(absDx) > DRAG_THRESHOLD || Math.abs(absDy) > DRAG_THRESHOLD)) {
      dragRef.current.moved = true;
    }
    if (dragRef.current.moved) {
      const dx = e.clientX - dragRef.current.lastClientX;
      const dy = e.clientY - dragRef.current.lastClientY;
      dragRef.current.lastClientX = e.clientX;
      dragRef.current.lastClientY = e.clientY;
      if (dx !== 0 || dy !== 0) {
        if (!pendingDeltaRef.current) pendingDeltaRef.current = { dx: 0, dy: 0 };
        pendingDeltaRef.current.dx += dx;
        pendingDeltaRef.current.dy += dy;
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            const delta = pendingDeltaRef.current;
            pendingDeltaRef.current = null;
            if (delta && (delta.dx !== 0 || delta.dy !== 0)) {
              window.electronPet!.moveDelta(Math.round(delta.dx), Math.round(delta.dy));
            }
          });
        }
      }
    }
  }

  function handlePointerUp() {
    if (!dragRef.current) return;
    const moved = dragRef.current.moved;
    dragRef.current = null;

    // Flush any buffered delta before processing release
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      const delta = pendingDeltaRef.current;
      pendingDeltaRef.current = null;
      if (delta && (delta.dx !== 0 || delta.dy !== 0) && isElectron) {
        window.electronPet!.moveDelta(Math.round(delta.dx), Math.round(delta.dy));
      }
    }

    if (!moved) {
      if (isElectron) window.electronPet!.openPopup();
    } else {
      // Save final position (main process already clamped during move)
      void window.electronPet!.getWindowPos().then((pos) => {
        if (!pos) return;
        window.electronPet!.setPosition(pos.x, pos.y);
        try { localStorage.setItem("lgsd-pet-pos", JSON.stringify(pos)); } catch {}
      });
    }
  }

  return (
    <div
      style={{
        width: isElectron ? PET_W : 380,
        minHeight: isElectron ? PET_H : 500,
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        fontFamily: "system-ui, sans-serif",
        paddingBottom: 6,
      }}
    >
      {/* other active pets — mini row above */}
      {otherPets.length > 0 && (
        <div style={{ display: "flex", gap: 3, marginBottom: 2, justifyContent: "center" }}>
          {otherPets.slice(0, 3).map((p) => (
            <div key={p.user_id} style={{ textAlign: "center" }}>
              <PetAnimal type={(p.pet_type ?? "cat") as PetType} state="active" size={24} />
            </div>
          ))}
        </div>
      )}

      {/* pet + controls — drag from anywhere except the working button */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          cursor: "grab",
          userSelect: "none",
          paddingBottom: 4,
        }}
      >
        <PetAnimal type={petType} state={petState} size={56} />

        {userName && (
          <div style={{
            fontSize: 9,
            color: "rgba(255,255,255,0.75)",
            marginTop: 1,
            fontWeight: 700,
            letterSpacing: 0.3,
            maxWidth: 90,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {userName}
          </div>
        )}

        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleToggleWorking}
          disabled={toggling}
          style={{
            marginTop: 4,
            padding: "2px 10px",
            borderRadius: 20,
            border: "none",
            background: isWorking ? "rgba(34,197,94,0.85)" : "rgba(255,255,255,0.14)",
            color: "white",
            fontSize: 10,
            fontWeight: 700,
            cursor: toggling ? "default" : "pointer",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            transition: "background 0.2s",
            letterSpacing: 0.2,
          } as React.CSSProperties}
        >
          {isWorking ? "✅ aktiv" : "☕ los"}
        </button>
      </div>
    </div>
  );
}
