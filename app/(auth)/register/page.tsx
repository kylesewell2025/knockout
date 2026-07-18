"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setIsSubmitting(true);

    const cleanUsername = username.trim().toLowerCase();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError) {
      setErrorMessage(signUpError.message);
      setIsSubmitting(false);
      return;
    }

    if (!data.user) {
      setErrorMessage("Your account could not be created.");
      setIsSubmitting(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      display_name: displayName.trim(),
      username: cleanUsername,
      nickname: nickname.trim() || null,
      role: "player",
    });

    if (profileError) {
      setErrorMessage(profileError.message);
      setIsSubmitting(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <p className="text-sm font-semibold tracking-[0.3em] text-muted-foreground">
            KNOCKOUT
          </p>

          <CardTitle className="text-3xl">Create Your Fighter</CardTitle>

          <CardDescription>
            Build your identity and enter the competition.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Kyle Sewell"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="kylesewell"
                autoCapitalize="none"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">Fighter nickname</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="The Analyst"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>

            {errorMessage && (
              <p
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {errorMessage}
              </p>
            )}

            <Button
              className="w-full"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating Fighter..." : "Enter the Octagon"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}