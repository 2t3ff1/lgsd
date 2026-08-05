"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setIsWorking(isWorking: boolean) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("pet_type")
    .eq("id", user.id)
    .single();

  const workspaces = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id);

  const workspaceIds = (workspaces.data ?? []).map((m) => m.workspace_id);
  if (!workspaceIds.length) return { success: true };

  await Promise.all(
    workspaceIds.map((wsId) =>
      supabase.from("user_presence").upsert(
        {
          user_id: user.id,
          workspace_id: wsId,
          is_working: isWorking,
          pet_type: profile?.pet_type ?? null,
          last_seen: new Date().toISOString(),
        },
        { onConflict: "user_id,workspace_id" }
      )
    )
  );

  return { success: true };
}

export async function getTodayTodos() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("todos")
    .select("id, title, status, suggested_points, workspace_id")
    .eq("user_id", user.id)
    .eq("date", today)
    .neq("status", "missed")
    .order("created_at", { ascending: true });

  return { todos: data ?? [] };
}

export async function updatePetType(petType: string | null) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("profiles").update({ pet_type: petType }).eq("id", user.id);
  return { success: true };
}
