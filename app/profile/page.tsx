export interface Profile {
  id: string;
  display_name: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  role: "admin" | "player";
  created_at: string;
  updated_at: string;
}