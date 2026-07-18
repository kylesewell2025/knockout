"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getUpcomingEvents } from "@/lib/services/event";
import { getCurrentUserMatchups } from "@/lib/services/matchups";
import { getCurrentProfile } from "@/lib/services/profile";

import { supabase } from "@/lib/supabase/client";

import type { Event } from "@/lib/types/event";
import type { Matchup } from "@/lib/types/matchup";
import type { Profile } from "@/lib/types/profile";

function cleanText(value: string) {
  return value
    .replaceAll("Å¡", "š")
    .replaceAll("Å¾", "ž")
    .replaceAll("Ä‡", "ć")
    .replaceAll("Ä", "č")
    .replaceAll("Ä‘", "đ")
    .replaceAll("â€“", "–")
    .replaceAll("â€”", "—");
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatEventTime(value: string | null) {
  if (!value) {
    return "Time TBD";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [pendingChallenges, setPendingChallenges] = useState<Matchup[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
    async function loadDashboard() {
      try {
        const [profileData, eventData, matchupData] =
          await Promise.all([
            getCurrentProfile(),
            getUpcomingEvents(),
            getCurrentUserMatchups(),
          ]);

        const incomingChallenges = matchupData.matchups.filter(
          (matchup) =>
            matchup.status === "pending" &&
            matchup.challenged_id === matchupData.currentUserId
        );

        setProfile(profileData);
        setEvents(eventData);
        setPendingChallenges(incomingChallenges);
      } catch (error) {
        console.error("Could not load dashboard:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not load the dashboard."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, []);

  async function handleLogout() {
    try {
      setIsLoggingOut(true);
      setErrorMessage(null);

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw new Error(error.message);
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Could not log out:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not log out."
      );

      setIsLoggingOut(false);
    }
  }

  const nextEvent = events[0] ?? null;

  const mainEvent = useMemo(() => {
    return nextEvent?.fights?.find((fight) => fight.is_main) ?? null;
  }, [nextEvent]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-lg font-semibold">Loading Fight Camp...</p>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border p-8 text-center">
          <h1 className="text-2xl font-bold">Dashboard unavailable</h1>

          <p className="mt-3 text-muted-foreground">
            {errorMessage}
          </p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Profile not found.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-10 lg:px-10">
      <header className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
  <div>
    <p className="text-sm font-semibold tracking-[0.3em] text-muted-foreground">
      KNOCKOUT
    </p>

    <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
      Welcome back, {profile.display_name}
    </h1>

    {profile.nickname && (
      <p className="mt-2 text-xl italic text-muted-foreground">
        &quot;{profile.nickname}&quot;
      </p>
    )}
  </div>

  <button
    type="button"
    onClick={handleLogout}
    disabled={isLoggingOut}
    className="inline-flex min-h-11 items-center justify-center rounded-lg border px-5 font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
  >
    {isLoggingOut ? "Logging Out..." : "Log Out"}
  </button>
</header>
{pendingChallenges.length > 0 && (
  <section className="mt-8 rounded-2xl border border-red-500/40 bg-red-500/10 p-6 shadow-sm">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.2em] text-red-600">
          You&apos;ve Been Challenged
        </p>

        <h2 className="mt-2 text-2xl font-black">
          {pendingChallenges.length === 1
            ? `${
                pendingChallenges[0].challenger?.display_name ||
                pendingChallenges[0].challenger?.username ||
                "Another player"
              } challenged you`
            : `You have ${pendingChallenges.length} pending challenges`}
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          {pendingChallenges.length === 1
            ? `Accept the matchup for ${
                pendingChallenges[0].event?.name || "the next event"
              } to unlock your picks.`
            : "Review your matchup requests and choose who you want to face."}
        </p>
      </div>

      <Link
        href="/matchups"
        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-red-600 px-5 font-bold text-white transition-opacity hover:opacity-90"
      >
        {pendingChallenges.length === 1
          ? "View Challenge"
          : "View Challenges"}
      </Link>
    </div>
  </section>
)}
      <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Role</p>

          <p className="mt-2 text-2xl font-bold capitalize">
            {profile.role}
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Career Record
          </p>

          <p className="mt-2 text-2xl font-bold">0–0</p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Champion</p>

          <p className="mt-2 text-2xl font-bold">Vacant</p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Upcoming Events
          </p>

          <p className="mt-2 text-2xl font-bold">
            {events.length}
          </p>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Next Event
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              Fight Card
            </h2>
          </div>
        </div>

        {!nextEvent ? (
          <div className="mt-5 rounded-2xl border border-dashed p-10 text-center">
            <p className="text-lg font-semibold">
              No upcoming event found
            </p>

            <p className="mt-2 text-muted-foreground">
              Run the event sync to import the next UFC card.
            </p>
          </div>
        ) : (
          <article className="mt-5 overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="border-b p-6 md:p-8">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                    {formatEventDate(nextEvent.event_date)}
                  </p>

                  <h3 className="mt-2 text-3xl font-bold">
                    {cleanText(nextEvent.name)}
                  </h3>

                  <p className="mt-3 text-muted-foreground">
                    {formatEventTime(nextEvent.starts_at)}
                    {" · "}
                    {nextEvent.fights?.length ?? 0} fights
                  </p>
                </div>

                <span className="w-fit rounded-full border px-3 py-1 text-sm font-semibold capitalize">
                  {nextEvent.status}
                </span>
              </div>
            </div>

            {mainEvent && (
              <div className="border-b bg-muted/30 p-6 md:p-8">
                <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Main Event
                </p>

                <div className="mt-5 grid items-center gap-4 text-center md:grid-cols-[1fr_auto_1fr]">
                  <div>
                    <p className="text-2xl font-bold">
                      {cleanText(mainEvent.fighter_one_name)}
                    </p>
                  </div>

                  <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    vs.
                  </div>

                  <div>
                    <p className="text-2xl font-bold">
                      {cleanText(mainEvent.fighter_two_name)}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-center text-sm text-muted-foreground">
                  {mainEvent.scheduled_rounds} rounds
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 p-6 sm:flex-row md:p-8">
              <Link
                href={`/events/${nextEvent.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                View Fight Card
              </Link>

              <Link
                href="/leaderboard"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border px-5 font-semibold transition-colors hover:bg-muted"
              >
                View Leaderboard
              </Link>
            </div>
          </article>
        )}
      </section>

      {events.length > 1 && (
        <section className="mt-10">
          <h2 className="text-2xl font-bold">Later Events</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {events.slice(1).map((event) => (
              <article
                key={event.id}
                className="rounded-2xl border bg-card p-6 shadow-sm"
              >
                <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  {formatEventDate(event.event_date)}
                </p>

                <h3 className="mt-2 text-xl font-bold">
                  {cleanText(event.name)}
                </h3>

                <p className="mt-2 text-sm text-muted-foreground">
                  {event.fights?.length ?? 0} fights
                </p>

                <Link
                  href={`/events/${event.id}`}
                  className="mt-5 inline-flex font-semibold underline-offset-4 hover:underline"
                >
                  View event
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}