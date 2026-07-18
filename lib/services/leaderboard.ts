import { supabase } from "@/lib/supabase/client";
import type { LeaderboardEntry } from "@/lib/types/leaderboard";

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("leaderboard")
    .select(`
      user_id,
      display_name,
      nickname,
      graded_picks,
      correct_picks,
      total_points
    `)
    .order("total_points", { ascending: false })
    .order("correct_picks", { ascending: false })
    .order("display_name", { ascending: true });

  if (error) {
    console.error("Could not load leaderboard:", error);
    throw new Error(error.message);
  }

  return (data ?? []) as LeaderboardEntry[];
}