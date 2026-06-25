"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!displayName) return { error: "Bitte gib einen Namen an." };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (error) return { error: "Profil konnte nicht gespeichert werden." };

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateReminderTime(time: string | null) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ reminder_time: time })
    .eq("id", user.id);

  if (error) return { error: "Erinnerung konnte nicht gespeichert werden." };
  revalidatePath("/profile");
  return { success: true };
}

export async function updateCommitmentReminder(day: number | null, time: string | null) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ commitment_reminder_day: day, commitment_reminder_time: time })
    .eq("id", user.id);

  if (error) return { error: "Erinnerung konnte nicht gespeichert werden." };
  revalidatePath("/profile");
  return { success: true };
}

async function uploadImage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  file: File,
  fileName: string
) {
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${userId}/${fileName}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) return { error: `Upload fehlgeschlagen: ${error.message}` };

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);
  return { url: `${publicUrl}?t=${Date.now()}` };
}

export async function updateAppearance(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const updates: Record<string, string | null> = {};

  const avatarColor = formData.get("avatar_color");
  if (typeof avatarColor === "string") {
    updates.avatar_color = avatarColor || null;
  }

  const avatarFile = formData.get("avatar_file");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    const res = await uploadImage(supabase, user.id, avatarFile, "avatar");
    if (res.error) return { error: res.error };
    updates.avatar_url = res.url ?? null;
    updates.avatar_color = null;
  }

  const backgroundColor = formData.get("background_color");
  if (typeof backgroundColor === "string") {
    updates.background_color = backgroundColor || null;
  }

  const backgroundFile = formData.get("background_file");
  if (backgroundFile instanceof File && backgroundFile.size > 0) {
    const res = await uploadImage(supabase, user.id, backgroundFile, "background");
    if (res.error) return { error: res.error };
    updates.background_image_url = res.url ?? null;
  }

  const cardColor = formData.get("card_color");
  if (typeof cardColor === "string") {
    updates.card_color = cardColor || null;
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) return { error: "Darstellung konnte nicht gespeichert werden." };

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/workspace/[id]", "page");
  return { success: true };
}
