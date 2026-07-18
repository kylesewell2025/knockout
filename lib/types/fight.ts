export interface Fight {
  id: string;
  event_id: string;
  external_fight_id: number;
  starts_at: string;
  sort_order: number;
  category: string | null;
  status: string;
  is_main: boolean;
  scheduled_rounds: 3 | 5;

  fighter_one_id: number;
  fighter_one_name: string;
  fighter_one_logo: string | null;

  fighter_two_id: number;
  fighter_two_name: string;
  fighter_two_logo: string | null;

  winner_fighter_id: number | null;
  result_type:
    | "decision"
    | "ko_tko"
    | "submission"
    | "other"
    | null;

  ending_round: number | null;
  ending_time: string | null;
  result_detail: string | null;
}