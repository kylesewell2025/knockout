"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getLeaderboard } from "@/lib/services/leaderboard";
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
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  );

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const data = await getLeaderboard();
        setEntries(data);
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
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-10 lg:px-10">
      <Link
        href="/dashboard"
        className="text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        ← Back to Dashboard
      </Link>

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

      {!errorMessage && entries.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed p-10 text-center">
          <h2 className="text-xl font-bold">
            No leaderboard entries yet
          </h2>

          <p className="mt-2 text-muted-foreground">
            Standings will appear after users join and picks are graded.
          </p>
        </div>
      )}

      {entries.length > 0 && (
        <section className="mt-8 overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="hidden grid-cols-[80px_1fr_120px_120px_120px] gap-4 border-b bg-muted/40 px-6 py-4 text-sm font-semibold text-muted-foreground md:grid">
            <div>Rank</div>
            <div>Player</div>
            <div className="text-right">Record</div>
            <div className="text-right">Accuracy</div>
            <div className="text-right">Points</div>
          </div>

          <div className="divide-y">
            {entries.map((entry, index) => {
              const incorrectPicks =
                entry.graded_picks - entry.correct_picks;

              return (
                <article
                  key={entry.user_id}
                  className="grid gap-4 px-6 py-5 md:grid-cols-[80px_1fr_120px_120px_120px] md:items-center"
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
                </article>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}