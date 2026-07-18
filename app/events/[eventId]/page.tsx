"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getEventById } from "@/lib/services/event";
import {
  getCurrentUserPicks,
  savePick,
} from "@/lib/services/matchup";
import type { Event } from "@/lib/types/event";
import type { Fight } from "@/lib/types/fight";
import type { Pick } from "@/lib/types/pick";

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

function formatFightTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

function FighterAvatar({
  name,
  logo,
}: {
  name: string;
  logo: string | null;
}) {
  if (logo) {
    return (
      <img
        src={logo}
        alt={cleanText(name)}
        className="h-20 w-20 rounded-full border object-cover"
      />
    );
  }

  const initials = name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full border bg-muted text-xl font-bold">
      {initials}
    </div>
  );
}

function FightCard({
  fight,
  selectedFighterId,
  isSaving,
  onPick,
}: {
  fight: Fight;
  selectedFighterId: number | null;
  isSaving: boolean;
  onPick: (fightId: string, fighterId: number) => Promise<void>;
}) {
  const isLocked =
    new Date(fight.starts_at).getTime() <= Date.now();

  const fighterOneSelected =
    selectedFighterId === Number(fight.fighter_one_id);

  const fighterTwoSelected =
    selectedFighterId === Number(fight.fighter_two_id);

  const winnerId = fight.winner_fighter_id
    ? Number(fight.winner_fighter_id)
    : null;

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-card shadow-sm ${
        fight.is_main ? "ring-2 ring-primary/40" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {fight.is_main
              ? "Main Event"
              : fight.category || "UFC Bout"}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {formatFightTime(fight.starts_at)}
            {" · "}
            {fight.scheduled_rounds} rounds
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
            isLocked
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary"
          }`}
        >
          {isLocked ? "Locked" : "Open"}
        </span>
      </div>

      <div className="grid items-stretch md:grid-cols-[1fr_auto_1fr]">
        <button
          type="button"
          disabled={isLocked || isSaving}
          onClick={() =>
            onPick(fight.id, Number(fight.fighter_one_id))
          }
          className={`flex min-h-64 flex-col items-center justify-center p-6 text-center transition ${
            fighterOneSelected
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted/60"
          } disabled:cursor-not-allowed disabled:opacity-70`}
        >
          <FighterAvatar
            name={fight.fighter_one_name}
            logo={fight.fighter_one_logo}
          />

          <p className="mt-4 text-xl font-bold">
            {cleanText(fight.fighter_one_name)}
          </p>

          {winnerId === Number(fight.fighter_one_id) && (
            <span className="mt-3 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600">
              Winner
            </span>
          )}

          {!isLocked && (
            <span className="mt-4 text-sm font-semibold">
              {fighterOneSelected ? "Your Pick" : "Pick Fighter"}
            </span>
          )}
        </button>

        <div className="flex items-center justify-center border-y px-5 py-3 text-sm font-black uppercase tracking-[0.25em] text-muted-foreground md:border-x md:border-y-0">
          vs.
        </div>

        <button
          type="button"
          disabled={isLocked || isSaving}
          onClick={() =>
            onPick(fight.id, Number(fight.fighter_two_id))
          }
          className={`flex min-h-64 flex-col items-center justify-center p-6 text-center transition ${
            fighterTwoSelected
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted/60"
          } disabled:cursor-not-allowed disabled:opacity-70`}
        >
          <FighterAvatar
            name={fight.fighter_two_name}
            logo={fight.fighter_two_logo}
          />

          <p className="mt-4 text-xl font-bold">
            {cleanText(fight.fighter_two_name)}
          </p>

          {winnerId === Number(fight.fighter_two_id) && (
            <span className="mt-3 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600">
              Winner
            </span>
          )}

          {!isLocked && (
            <span className="mt-4 text-sm font-semibold">
              {fighterTwoSelected ? "Your Pick" : "Pick Fighter"}
            </span>
          )}
        </button>
      </div>
    </article>
  );
}

export default function EventPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;

  const [event, setEvent] = useState<Event | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [savingFightId, setSavingFightId] =
    useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);
  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadEvent() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const eventData = await getEventById(eventId);

        if (!eventData) {
          setErrorMessage("Event not found.");
          return;
        }

        setEvent(eventData);

        const fightIds = (eventData.fights ?? []).map(
          (fight) => fight.id
        );

        const pickData = await getCurrentUserPicks(fightIds);
        setPicks(pickData);
      } catch (error) {
        console.error("Could not load event:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not load this event."
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  const picksByFightId = useMemo(() => {
    return new Map(
      picks.map((pick) => [
        pick.fight_id,
        Number(pick.picked_fighter_id),
      ])
    );
  }, [picks]);

  const totalFights = event?.fights?.length ?? 0;
  const completedPicks = picks.length;

  async function handlePick(
    fightId: string,
    fighterId: number
  ) {
    try {
      setSavingFightId(fightId);
      setErrorMessage(null);
      setSuccessMessage(null);

      const savedPick = await savePick({
        fightId,
        fighterId,
      });

      setPicks((currentPicks) => {
        const existingIndex = currentPicks.findIndex(
          (pick) => pick.fight_id === fightId
        );

        if (existingIndex === -1) {
          return [...currentPicks, savedPick];
        }

        return currentPicks.map((pick) =>
          pick.fight_id === fightId ? savedPick : pick
        );
      });

      setSuccessMessage("Pick saved.");

      window.setTimeout(() => {
        setSuccessMessage(null);
      }, 1800);
    } catch (error) {
      console.error("Could not save pick:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not save your pick."
      );
    } finally {
      setSavingFightId(null);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-lg font-semibold">
          Loading Fight Card...
        </p>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="rounded-2xl border p-8 text-center">
          <h1 className="text-2xl font-bold">Event unavailable</h1>

          <p className="mt-3 text-muted-foreground">
            {errorMessage ?? "This event could not be found."}
          </p>

          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground"
          >
            Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-10 lg:px-10">
      <Link
        href="/dashboard"
        className="text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        ← Back to Dashboard
      </Link>

      <header className="mt-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          {formatEventDate(event.event_date)}
        </p>

        <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
          {cleanText(event.name)}
        </h1>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="rounded-full border px-4 py-2 text-sm font-semibold">
            {completedPicks} of {totalFights} picks made
          </span>

          <span className="rounded-full border px-4 py-2 text-sm font-semibold capitalize">
            {event.status}
          </span>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{
              width:
                totalFights === 0
                  ? "0%"
                  : `${(completedPicks / totalFights) * 100}%`,
            }}
          />
        </div>
      </header>

      {errorMessage && (
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600">
          {successMessage}
        </div>
      )}

      <section className="mt-10 space-y-6">
        {(event.fights ?? []).map((fight) => (
          <FightCard
            key={fight.id}
            fight={fight}
            selectedFighterId={
              picksByFightId.get(fight.id) ?? null
            }
            isSaving={savingFightId === fight.id}
            onPick={handlePick}
          />
        ))}
      </section>
    </main>
  );
}