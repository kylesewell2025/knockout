export type MatchupStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "completed"
  | "cancelled";

export type MatchupPlayer = {
  id: string;
  display_name: string | null;
  username: string | null;
  nickname: string | null;
};

export type MatchupEvent = {
  id: string;
  name: string;
  event_date: string;
  status: string;
};

export type Matchup = {
  id: string;
  challenger_id: string;
  challenged_id: string;
  event_id: string | null;
  status: MatchupStatus;
  challenger_points: number;
  challenged_points: number;
  winner_id: string | null;
  created_at: string;
  responded_at: string | null;
  completed_at: string | null;
  challenger: MatchupPlayer | null;
  challenged: MatchupPlayer | null;
  event: MatchupEvent | null;
};