import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// URL der deployten Next.js-App + geteiltes Secret, damit die Edge Function
// die eigentliche Web-Push-Zustellung (Node-Crypto) an die App delegieren kann.
const SITE_URL = Deno.env.get("SITE_URL");
const CRON_SECRET = Deno.env.get("CRON_SECRET");

Deno.serve(async () => {
  if (!SITE_URL || !CRON_SECRET) {
    return new Response(JSON.stringify({ error: "SITE_URL/CRON_SECRET nicht konfiguriert" }), {
      status: 500,
    });
  }

  const nowUTC = new Date();
  const currentHour = nowUTC.getUTCHours().toString().padStart(2, "0");
  const currentMinute = nowUTC.getUTCMinutes().toString().padStart(2, "0");
  const currentTime = `${currentHour}:${currentMinute}`;

  // Alle Profile mit Erinnerungszeit in der aktuellen Stunde
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, reminder_time")
    .not("reminder_time", "is", null)
    .like("reminder_time", `${currentHour}:%`);

  if (profileError) {
    return new Response(JSON.stringify({ error: profileError.message }), { status: 500 });
  }

  const todayISO = nowUTC.toISOString().slice(0, 10);
  let sent = 0;

  for (const profile of profiles ?? []) {
    // Pruefen ob die Minute auch passt (auf Minute genau)
    if (!profile.reminder_time?.startsWith(currentTime)) continue;

    // Offene Aufgaben fuer heute suchen
    const { data: openTodos } = await supabase
      .from("todos")
      .select("title")
      .eq("user_id", profile.id)
      .eq("date", todayISO)
      .eq("status", "open");

    if (!openTodos || openTodos.length === 0) continue;

    await fetch(`${SITE_URL}/api/push/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": CRON_SECRET,
      },
      body: JSON.stringify({
        userId: profile.id,
        title: `⏰ ${openTodos.length} offene Aufgabe${openTodos.length > 1 ? "n" : ""} heute`,
        body: `Hey ${profile.display_name}, hak deine Aufgaben ab bevor der Tag endet!`,
        url: "/dashboard",
      }),
    });

    sent++;
  }

  return new Response(JSON.stringify({ sent, time: currentTime }), { status: 200 });
});
