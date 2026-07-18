export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  nickname: string | null;
  graded_picks: number;
  correct_picks: number;
  total_points: number;
}