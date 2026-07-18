"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  acceptChallenge,
  cancelChallenge,
  declineChallenge,
  getCurrentUserMatchups,
} from "@/lib/services/matchups";
import type { Matchup, MatchupPlayer } from "@/lib/types/matchup";

function cleanText(value: string | null | undefined) {
  return value
    ?.replaceAll("&amp;", "&")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"') ?? "";
}

function formatEventDate(date: string | null | undefined) {
  if (!date) {
    return "Event unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function getPlayerName(player: MatchupPlayer | null) {
  if (!player) {
    return "Player";
  }

  return (
    player.display_name ||
    player.username ||
    player.nickname ||
    "Player"
  );
}

function getOpponent(
  matchup: Matchup,
  currentUserId: string
): MatchupPlayer | null {
  return matchup.challenger_id === currentUserId
    ? matchup.challenged
    : matchup.challenger;
}

type MatchupCardProps = {
  matchup: Matchup;
  currentUserId: string;
  busyMatchupId: string | null;
  onAccept?: (matchupId: string) => void;
  onDecline?: (matchupId: string) => void;
  onCancel?: (matchupId: string) => void;
};

function MatchupCard({
  matchup,
  currentUserId,
  busyMatchupId,
  onAccept,
  onDecline,
  onCancel,
}: MatchupCardProps) {
  const opponent = getOpponent(matchup, currentUserId);
  const isBusy = busyMatchupId === matchup.id;
  const isIncoming =
    matchup.challenged_id === currentUserId &&
    matchup.status === "pending";
  const isSent =
    matchup.challenger_id === currentUserId &&
    matchup.status === "pending";

  const currentUserPoints =
    matchup.challenger_id === currentUserId
      ? matchup.challenger_points
      : matchup.challenged_points;

  const opponentPoints =
    matchup.challenger_id === currentUserId
      ? matchup.challenged_points
      : matchup.challenger_points;

  return (
    <article className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {isIncoming
              ? "Incoming Challenge"
              : isSent
                ? "Challenge Sent"
                : "Head-to-Head"}
          </p>

          <h3 className="mt-2 text-2xl font-black">
            You vs. {getPlayerName(opponent)}
          </h3>

          {opponent?.nickname && (
            <p className="mt-1 text-sm italic text-muted-foreground">
              &quot;{opponent.nickname}&quot;
            </p>
          )}
        </div>

        <span className="rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide">
          {matchup.status}
        </span>
      </div>

      <div className="mt-5 rounded-xl bg-muted/40 p-4">
        <p className="font-bold">
          {cleanText(matchup.event?.name) || "UFC Event"}
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          {formatEventDate(matchup.event?.event_date)}
        </p>
      </div>

      {(matchup.status === "accepted" ||
        matchup.status === "completed") && (
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="rounded-xl border p-4 text-center">
            <p className="text-sm text-muted-foreground">Your points</p>
            <p className="mt-1 text-3xl font-black">
              {currentUserPoints}
            </p>
          </div>

          <div className="rounded-xl border p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Opponent points
            </p>
            <p className="mt-1 text-3xl font-black">
              {opponentPoints}
            </p>
          </div>
        </div>
      )}

      {isIncoming && (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onAccept?.(matchup.id)}
            className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy ? "Saving..." : "Accept"}
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={() => onDecline?.(matchup.id)}
            className="rounded-lg border px-5 py-3 font-bold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      )}

      {isSent && (
        <div className="mt-6">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onCancel?.(matchup.id)}
            className="rounded-lg border px-5 py-3 font-bold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy ? "Cancelling..." : "Cancel Challenge"}
          </button>
        </div>
      )}

      {matchup.status === "accepted" && matchup.event && (
        <div className="mt-6">
          <Link
            href={`/events/${matchup.event.id}`}
            className="inline-flex rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground"
          >
            Make Picks
          </Link>
        </div>
      )}
    </article>
  );
}

export default function MatchupsPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    null
  );
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [busyMatchupId, setBusyMatchupId] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  );
  const [successMessage, setSuccessMessage] = useState<
    string | null
  >(null);

  const loadMatchups = useCallback(async () => {
    try {
      setErrorMessage(null);

      const data = await getCurrentUserMatchups();

      setCurrentUserId(data.currentUserId);
      setMatchups(data.matchups);
    } catch (error) {
      console.error("Could not load matchups:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not load your matchups."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatchups();
  }, [loadMatchups]);

  const groupedMatchups = useMemo(() => {
    if (!currentUserId) {
      return {
        incoming: [],
        sent: [],
        active: [],
        completed: [],
      };
    }

    return {
      incoming: matchups.filter(
        (matchup) =>
          matchup.status === "pending" &&
          matchup.challenged_id === currentUserId
      ),
      sent: matchups.filter(
        (matchup) =>
          matchup.status === "pending" &&
          matchup.challenger_id === currentUserId
      ),
      active: matchups.filter(
        (matchup) => matchup.status === "accepted"
      ),
      completed: matchups.filter((matchup) =>
        ["completed", "declined", "cancelled"].includes(
          matchup.status
        )
      ),
    };
  }, [currentUserId, matchups]);

  async function runAction(
    matchupId: string,
    action: () => Promise<void>,
    message: string
  ) {
    try {
      setBusyMatchupId(matchupId);
      setErrorMessage(null);
      setSuccessMessage(null);

      await action();
      await loadMatchups();

      setSuccessMessage(message);
    } catch (error) {
      console.error("Could not update matchup:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not update the matchup."
      );
    } finally {
      setBusyMatchupId(null);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-lg font-semibold">
          Loading Matchups...
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-10 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          ← Back to Dashboard
        </Link>

        <Link
          href="/leaderboard"
          className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          Find an Opponent
        </Link>
      </div>

      <header className="mt-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          KNOCKOUT
        </p>

        <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
          My Matchups
        </h1>

        <p className="mt-3 text-muted-foreground">
          Accept challenges, make picks, and beat your opponent.
        </p>
      </header>

      {errorMessage && (
        <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/10 p-4 font-semibold text-destructive">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 font-semibold text-emerald-600">
          {successMessage}
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-2xl font-black">
          Incoming Challenges
        </h2>

        {groupedMatchups.incoming.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            You do not have any incoming challenges.
          </div>
        ) : (
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            {groupedMatchups.incoming.map((matchup) => (
              <MatchupCard
                key={matchup.id}
                matchup={matchup}
                currentUserId={currentUserId!}
                busyMatchupId={busyMatchupId}
                onAccept={(matchupId) =>
                  runAction(
                    matchupId,
                    () => acceptChallenge(matchupId),
                    "Challenge accepted. Picks are now unlocked."
                  )
                }
                onDecline={(matchupId) =>
                  runAction(
                    matchupId,
                    () => declineChallenge(matchupId),
                    "Challenge declined."
                  )
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-black">Active Matchups</h2>

        {groupedMatchups.active.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            You do not have any active matchups.
          </div>
        ) : (
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            {groupedMatchups.active.map((matchup) => (
              <MatchupCard
                key={matchup.id}
                matchup={matchup}
                currentUserId={currentUserId!}
                busyMatchupId={busyMatchupId}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-black">Sent Challenges</h2>

        {groupedMatchups.sent.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            You do not have any pending sent challenges.
          </div>
        ) : (
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            {groupedMatchups.sent.map((matchup) => (
              <MatchupCard
                key={matchup.id}
                matchup={matchup}
                currentUserId={currentUserId!}
                busyMatchupId={busyMatchupId}
                onCancel={(matchupId) =>
                  runAction(
                    matchupId,
                    () => cancelChallenge(matchupId),
                    "Challenge cancelled."
                  )
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-black">Matchup History</h2>

        {groupedMatchups.completed.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            No matchup history yet.
          </div>
        ) : (
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            {groupedMatchups.completed.map((matchup) => (
              <MatchupCard
                key={matchup.id}
                matchup={matchup}
                currentUserId={currentUserId!}
                busyMatchupId={busyMatchupId}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}