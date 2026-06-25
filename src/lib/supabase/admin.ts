import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-Role-Client fuer Server-seitige Operationen, die RLS umgehen
 * muessen (z.B. Push-Subscriptions eines ANDEREN Nutzers lesen, um ihm
 * eine Benachrichtigung zu senden). Niemals im Client-Code verwenden.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
