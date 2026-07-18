import { supabase } from "@/lib/supabase/client";
import type { Event } from "@/lib/types/event";

export async function getUpcomingEvents(): Promise<Event[]> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("events")
    .select(`
      id,
      external_event_id,
      slug,
      name,
      event_date,
      starts_at,
      status,
      fights (
        id,
        event_id,
        external_fight_id,
        starts_at,
        sort_order,
        category,
        status,
        is_main,
        scheduled_rounds,
        fighter_one_id,
        fighter_one_name,
        fighter_one_logo,
        fighter_two_id,
        fighter_two_name,
        fighter_two_logo,
        winner_fighter_id,
        result_type,
        ending_round,
        ending_time,
        result_detail
      )
    `)
    .gte("event_date", today)
    .order("event_date", { ascending: true });

  if (error) {
    console.error("Could not load upcoming events:", error);
    throw new Error(error.message);
  }

  return (data ?? []).map((event) => ({
    ...event,
    fights: [...(event.fights ?? [])].sort(
      (first, second) => first.sort_order - second.sort_order
    ),
  })) as Event[];
}

export async function getEventById(
  eventId: string
): Promise<Event | null> {
  const { data, error } = await supabase
    .from("events")
    .select(`
      id,
      external_event_id,
      slug,
      name,
      event_date,
      starts_at,
      status,
      fights (
        id,
        event_id,
        external_fight_id,
        starts_at,
        sort_order,
        category,
        status,
        is_main,
        scheduled_rounds,
        fighter_one_id,
        fighter_one_name,
        fighter_one_logo,
        fighter_two_id,
        fighter_two_name,
        fighter_two_logo,
        winner_fighter_id,
        result_type,
        ending_round,
        ending_time,
        result_detail
      )
    `)
    .eq("id", eventId)
    .single();

  if (error) {
    console.error("Could not load event:", error);
    return null;
  }

  return {
    ...data,
    fights: [...(data.fights ?? [])].sort(
      (first, second) => second.sort_order - first.sort_order
    ),
  } as Event;
}