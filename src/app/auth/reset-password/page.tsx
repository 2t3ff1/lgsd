"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError("Passwort konnte nicht geändert werden. Bitte fordere einen neuen Link an.");
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <Link href="/" className="mb-8">
        <Logo className="text-xl" />
      </Link>
      <Card className="w-full max-w-sm rounded-3xl">
        <h1 className="mb-1 text-2xl font-extrabold">Neues Passwort</h1>
        <p className="mb-6 text-sm text-ink-light">Lege ein neues Passwort für dein Konto fest.</p>

        {done ? (
          <div className="space-y-4">
            <p className="rounded-xl bg-success-100 px-3 py-2 text-sm font-medium text-success-700 dark:bg-success-500/20 dark:text-success-400">
              Dein Passwort wurde geändert.
            </p>
            <Button className="w-full" onClick={() => router.push("/dashboard")}>
              Weiter zum Dashboard
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">Neues Passwort</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Passwort wiederholen</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-danger-100 px-3 py-2 text-sm font-medium text-danger-600 dark:bg-danger-500/20 dark:text-danger-400">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Speichern …" : "Passwort speichern"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
