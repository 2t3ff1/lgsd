"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function savePushSubscription(subscriptionJson: unknown) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Use endpoint as dedup key — avoid duplicate rows for same device
  const endpoint = (subscriptionJson as { endpoint?: string })?.endpoint;

  if (endpoint) {
    // Update if same endpoint already exists
    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .filter("subscription_json->>endpoint", "eq", endpoint)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("push_subscriptions")
        .update({ subscription_json: subscriptionJson })
        .eq("id", existing.id);
      return { success: true };
    }
  }

  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: user.id,
    subscription_json: subscriptionJson,
  });

  if (error) return { error: "Push-Abonnement konnte nicht gespeichert werden." };
  return { success: true };
}
