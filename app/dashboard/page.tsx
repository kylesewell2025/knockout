"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getUpcomingEvents } from "@/lib/services/event";
import { getCurrentProfile } from "@/lib/services/profile";
import type { Event } from "@/lib/types/event";
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [profileData, eventData] = await Promise.all([
          getCurrentProfile(),
          getUpcomingEvents(),
        ]);

        setProfile(profileData);
        setEvents(eventData);
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
      <header>
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
      </header>

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