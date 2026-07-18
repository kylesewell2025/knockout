"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getLeaderboard } from "@/lib/services/leaderboard";
import { createChallenge } from "@/lib/services/matchups";
import { supabase } from "@/lib/supabase/client";
import type { LeaderboardEntry } from "@/lib/types/leaderboard";

function getAccuracy(entry: LeaderboardEntry) {
  if (entry.graded_picks === 0) {
    return 0;
  }

  return Math.round(
    (entry.correct_picks / entry.graded_picks) * 100
  );
}

function getRankLabel(index: number) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";

  return `${index + 1}`;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    null
  );
  const [challengingUserId, setChallengingUserId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  );
  const [successMessage, setSuccessMessage] = useState<
    string | null
  >(null);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const [
          leaderboardData,
          {
            data: { user },
            error: userError,
          },
        ] = await Promise.all([
          getLeaderboard(),
          supabase.auth.getUser(),
        ]);

        if (userError) {
          throw new Error(userError.message);
        }

        setEntries(leaderboardData);
        setCurrentUserId(user?.id ?? null);
      } catch (error) {
        console.error("Could not load leaderboard:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not load the leaderboard."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadLeaderboard();
  }, []);

  async function handleChallenge(entry: LeaderboardEntry) {
    try {
      setChallengingUserId(entry.user_id);
      setErrorMessage(null);
      setSuccessMessage(null);

      await createChallenge(entry.user_id);

      setSuccessMessage(
        `Challenge sent to ${entry.display_name}.`
      );
    } catch (error) {
      console.error("Could not send challenge:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not send the challenge."
      );
    } finally {
      setChallengingUserId(null);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-lg font-semibold">
          Loading Leaderboard...
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
          href="/matchups"
          className="rounded-lg border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
        >
          My Matchups
        </Link>
      </div>

      <header className="mt-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          KNOCKOUT
        </p>

        <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
          Leaderboard
        </h1>

        <p className="mt-3 text-muted-foreground">
          Overall standings across all graded UFC picks.
        </p>
      </header>

      {errorMessage && (
        <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 font-semibold text-emerald-700">
          {successMessage}
        </div>
      )}

      {!errorMessage && entries.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed p-10 text-center">
          <h2 className="text-xl font-bold">
            No leaderboard entries yet
          </h2>

          <p className="mt-2 text-muted-foreground">
            Standings will appear after users join and make picks.
          </p>
        </div>
      )}

      {entries.length > 0 && (
        <section className="mt-8 overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="hidden grid-cols-[70px_1fr_100px_100px_100px_130px] gap-4 border-b bg-muted/40 px-6 py-4 text-sm font-semibold text-muted-foreground md:grid">
            <div>Rank</div>
            <div>Player</div>
            <div className="text-right">Record</div>
            <div className="text-right">Accuracy</div>
            <div className="text-right">Points</div>
            <div className="text-right">Matchup</div>
          </div>

          <div className="divide-y">
            {entries.map((entry, index) => {
              const incorrectPicks =
                entry.graded_picks - entry.correct_picks;

              const isCurrentUser =
                entry.user_id === currentUserId;

              const isSending =
                challengingUserId === entry.user_id;

              return (
                <article
                  key={entry.user_id}
                  className="grid gap-4 px-6 py-5 md:grid-cols-[70px_1fr_100px_100px_100px_130px] md:items-center"
                >
                  <div className="text-2xl font-black">
                    {getRankLabel(index)}
                  </div>

                  <div>
                    <p className="text-lg font-bold">
                      {entry.display_name}
                    </p>

                    {entry.nickname && (
                      <p className="text-sm italic text-muted-foreground">
                        &quot;{entry.nickname}&quot;
                      </p>
                    )}

                    {isCurrentUser && (
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        You
                      </p>
                    )}
                  </div>

                  <div className="md:text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:hidden">
                      Record
                    </p>

                    <p className="font-bold">
                      {entry.correct_picks}–{incorrectPicks}
                    </p>
                  </div>

                  <div className="md:text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:hidden">
                      Accuracy
                    </p>

                    <p className="font-bold">
                      {getAccuracy(entry)}%
                    </p>
                  </div>

                  <div className="md:text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:hidden">
                      Points
                    </p>

                    <p className="text-xl font-black">
                      {entry.total_points}
                    </p>
                  </div>

                  <div className="md:text-right">
                    {!isCurrentUser ? (
                      <button
                        type="button"
                        disabled={
                          isSending ||
                          challengingUserId !== null
                        }
                        onClick={() => handleChallenge(entry)}
                        className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSending
                          ? "Sending..."
                          : "Challenge"}
                      </button>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        —
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}