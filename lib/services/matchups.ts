import { supabase } from "@/lib/supabase/client";

import type { Matchup } from "@/lib/types/matchup";

type MatchupQueryRow = Omit<
  Matchup,
  "challenger" | "challenged" | "event"
> & {
  challenger: Matchup["challenger"] | Matchup["challenger"][];
  challenged: Matchup["challenged"] | Matchup["challenged"][];
  event: Matchup["event"] | Matchup["event"][];
};

function getSingleRelation<T>(
  relation: T | T[] | null
): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function normalizeMatchup(row: MatchupQueryRow): Matchup {
  return {
    ...row,
    challenger: getSingleRelation(row.challenger),
    challenged: getSingleRelation(row.challenged),
    event: getSingleRelation(row.event),
  };
}

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error("You must be logged in.");
  }

  return user.id;
}

export async function createChallenge(
  challengedUserId: string
): Promise<void> {
  const currentUserId = await getCurrentUserId();

  if (currentUserId === challengedUserId) {
    throw new Error("You cannot challenge yourself.");
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: nextEvent, error: eventError } = await supabase
    .from("events")
    .select("id, name, event_date")
    .gte("event_date", today)
    .neq("status", "completed")
    .order("event_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (eventError) {
    throw new Error(eventError.message);
  }

  if (!nextEvent) {
    throw new Error("There is no upcoming UFC event available.");
  }

  const { error } = await supabase.from("matchups").insert({
    challenger_id: currentUserId,
    challenged_id: challengedUserId,
    event_id: nextEvent.id,
    status: "pending",
    challenger_points: 0,
    challenged_points: 0,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "A pending or active matchup already exists with this player."
      );
    }

    throw new Error(error.message);
  }
}

export async function getCurrentUserMatchups(): Promise<{
  currentUserId: string;
  matchups: Matchup[];
}> {
  const currentUserId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("matchups")
    .select(`
      id,
      challenger_id,
      challenged_id,
      event_id,
      status,
      challenger_points,
      challenged_points,
      winner_id,
      created_at,
      responded_at,
      completed_at,
      challenger:profiles!matchups_challenger_id_fkey(
        id,
        display_name,
        username,
        nickname
      ),
      challenged:profiles!matchups_challenged_id_fkey(
        id,
        display_name,
        username,
        nickname
      ),
      event:events!matchups_event_id_fkey(
        id,
        name,
        event_date,
        status
      )
    `)
    .or(
      `challenger_id.eq.${currentUserId},challenged_id.eq.${currentUserId}`
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const matchups = ((data ?? []) as unknown as MatchupQueryRow[]).map(
    normalizeMatchup
  );

  return {
    currentUserId,
    matchups,
  };
}

export async function acceptChallenge(
  matchupId: string
): Promise<void> {
  const currentUserId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("matchups")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString(),
    })
    .eq("id", matchupId)
    .eq("challenged_id", currentUserId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      "This challenge is no longer available to accept."
    );
  }
}

export async function declineChallenge(
  matchupId: string
): Promise<void> {
  const currentUserId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("matchups")
    .update({
      status: "declined",
      responded_at: new Date().toISOString(),
    })
    .eq("id", matchupId)
    .eq("challenged_id", currentUserId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      "This challenge is no longer available to decline."
    );
  }
}

export async function cancelChallenge(
  matchupId: string
): Promise<void> {
  const currentUserId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("matchups")
    .update({
      status: "cancelled",
      responded_at: new Date().toISOString(),
    })
    .eq("id", matchupId)
    .eq("challenger_id", currentUserId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      "This challenge is no longer available to cancel."
    );
  }
}

export async function hasAcceptedMatchupForEvent(
  eventId: string
): Promise<boolean> {
  const currentUserId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("matchups")
    .select("id")
    .eq("event_id", eventId)
    .eq("status", "accepted")
    .or(
      `challenger_id.eq.${currentUserId},challenged_id.eq.${currentUserId}`
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}