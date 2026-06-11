"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createWorkspace(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) return { error: "Bitte gib einen Namen an." };

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({ name, description: description || null, created_by: user.id })
    .select()
    .single();

  if (error || !workspace) {
    return { error: "Workspace konnte nicht erstellt werden." };
  }

  await supabase.from("workspace_members").insert({ workspace_id: workspace.id, user_id: user.id });

  revalidatePath("/dashboard");
  redirect(`/workspace/${workspace.id}`);
}

export async function inviteMember(workspaceId: string, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) return { error: "Bitte gib eine E-Mail-Adresse an." };

  const { error } = await supabase.from("workspace_invites").insert({
    workspace_id: workspaceId,
    invited_email: email,
    invited_by: user.id,
  });

  if (error) {
    return { error: "Einladung konnte nicht versendet werden." };
  }

  await supabase.rpc("try_add_existing_user_to_workspace", {
    _workspace_id: workspaceId,
    _email: email,
  });

  revalidatePath(`/workspace/${workspaceId}/settings`);
  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}

export async function removeMember(workspaceId: string, userId: string) {
  const supabase = createClient();
  await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  revalidatePath(`/workspace/${workspaceId}/settings`);
}

export async function cancelInvite(workspaceId: string, inviteId: string) {
  const supabase = createClient();
  await supabase.from("workspace_invites").delete().eq("id", inviteId);
  revalidatePath(`/workspace/${workspaceId}/settings`);
}

export async function updateWorkspace(workspaceId: string, formData: FormData) {
  const supabase = createClient();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) return { error: "Bitte gib einen Namen an." };

  await supabase
    .from("workspaces")
    .update({ name, description: description || null })
    .eq("id", workspaceId);

  revalidatePath(`/workspace/${workspaceId}/settings`);
  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}

export async function leaveWorkspace(workspaceId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
