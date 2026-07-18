import type { Fight } from "./fight";

export interface Event {
  id: string;
  external_event_id: string;
  slug: string;
  name: string;
  event_date: string;
  starts_at: string | null;
  status: string;
  fights?: Fight[];
}