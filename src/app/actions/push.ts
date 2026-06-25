"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function savePushSubscription(subscriptionJson: unknown) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: user.id,
    subscription_json: subscriptionJson,
  });

  if (error) return { error: "Push-Abonnement konnte nicht gespeichert werden." };
  return { success: true };
}
