"use client";

import { useEffect, useState } from "react";

import { getCurrentProfile } from "@/lib/services/profile";
import type { Profile } from "@/lib/types/profile";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const data = await getCurrentProfile();
      setProfile(data);
    }

    loadProfile();
  }, []);

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        Loading Fight Camp...
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col p-10">
      <p className="text-sm font-semibold tracking-[0.3em] text-muted-foreground">
        KNOCKOUT
      </p>

      <h1 className="mt-4 text-5xl font-bold">
        Welcome back, {profile.display_name}
      </h1>

      {profile.nickname && (
        <p className="mt-2 text-xl italic text-muted-foreground">
          "{profile.nickname}"
        </p>
      )}

      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border p-6">
          <h3 className="text-sm text-muted-foreground">Role</h3>
          <p className="mt-2 text-2xl font-bold capitalize">
            {profile.role}
          </p>
        </div>

        <div className="rounded-xl border p-6">
          <h3 className="text-sm text-muted-foreground">Career Record</h3>
          <p className="mt-2 text-2xl font-bold">0–0</p>
        </div>

        <div className="rounded-xl border p-6">
          <h3 className="text-sm text-muted-foreground">Champion</h3>
          <p className="mt-2 text-2xl font-bold">Vacant</p>
        </div>

        <div className="rounded-xl border p-6">
          <h3 className="text-sm text-muted-foreground">Next Event</h3>
          <p className="mt-2 text-2xl font-bold">None</p>
        </div>
      </div>
    </main>
  );
}