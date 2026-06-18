import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("REMINDER_FROM_EMAIL") ?? "LGSD <noreply@lgsd.app>";

Deno.serve(async () => {
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

    // Auth-User fuer E-Mail-Adresse
    const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
    const email = authUser?.user?.email;
    if (!email) continue;

    // Offene Aufgaben fuer heute suchen
    const { data: openTodos } = await supabase
      .from("todos")
      .select("title")
      .eq("user_id", profile.id)
      .eq("date", todayISO)
      .eq("status", "open");

    if (!openTodos || openTodos.length === 0) continue;

    // E-Mail via Resend senden
    if (!RESEND_API_KEY) continue;

    const todoList = openTodos.map((t) => `<li>${t.title}</li>`).join("");

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: `⏰ ${openTodos.length} offene Aufgabe${openTodos.length > 1 ? "n" : ""} heute`,
        html: `
          <h2>Hey ${profile.display_name} 👋</h2>
          <p>Du hast noch <strong>${openTodos.length} offene Aufgabe${openTodos.length > 1 ? "n" : ""}</strong> für heute:</p>
          <ul>${todoList}</ul>
          <p>Hak sie ab bevor der Tag endet!</p>
          <p style="color: #888; font-size: 12px;">
            Du erhältst diese E-Mail weil du in LGSD eine tägliche Erinnerung eingestellt hast.
          </p>
        `,
      }),
    });

    sent++;
  }

  return new Response(JSON.stringify({ sent, time: currentTime }), { status: 200 });
});
