"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";

export default function RegisterPage() {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        setError("Diese E-Mail-Adresse ist bereits registriert.");
      } else {
        setError("Registrierung fehlgeschlagen. Bitte versuch es erneut.");
      }
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
        <Link href="/" className="mb-8">
          <Logo className="text-xl" />
        </Link>
        <Card className="w-full max-w-sm rounded-3xl text-center">
          <div className="mb-3 text-4xl">📬</div>
          <h1 className="mb-2 text-xl font-extrabold">Fast geschafft!</h1>
          <p className="text-sm text-ink-light">
            Wir haben dir eine Bestätigungs-E-Mail geschickt. Klick auf den Link, um deinen
            Account zu aktivieren und loszulegen.
          </p>
          <Link href="/login" className="mt-6 inline-block">
            <Button variant="outline">Zurück zum Login</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <Link href="/" className="mb-8">
        <Logo className="text-xl" />
      </Link>
      <Card className="w-full max-w-sm rounded-3xl">
        <h1 className="mb-1 text-2xl font-extrabold">Konto erstellen</h1>
        <p className="mb-6 text-sm text-ink-light">
          Leg los und schaff dir Verbindlichkeit mit deinen Freunden.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Wie sollen wir dich nennen?"
            />
          </div>
          <div>
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="du@beispiel.de"
            />
          </div>
          <div>
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mind. 6 Zeichen"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-danger-100 px-3 py-2 text-sm font-medium text-danger-600">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Konto wird erstellt …" : "Registrieren"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-light">
          Schon dabei?{" "}
          <Link href="/login" className="font-semibold text-primary-600 hover:underline">
            Anmelden
          </Link>
        </p>
      </Card>
    </div>
  );
}
