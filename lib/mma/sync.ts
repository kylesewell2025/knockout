import {
  getFightResult,
  getFightsByDate,
  type ApiFight,
} from "@/lib/mma/api";

import { calculatePickPoints } from "@/lib/services/scoring";
import { createAdminClient } from "@/lib/supabase/admin";

type EventGroup = {
  cardKey: string;
  fights: ApiFight[];
};

function getPreviousSaturday(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const day = date.getUTCDay();

  const daysSinceSaturday = (day + 1) % 7;

  date.setUTCDate(date.getUTCDate() - daysSinceSaturday);

  return date.toISOString().slice(0, 10);
}

function getEventSeries(slug: string): string {
  const normalized = slug.trim().toLowerCase();

  if (normalized.startsWith("ufc fight night")) {
    return "ufc-fight-night";
  }

  if (normalized.startsWith("ufc ")) {
    return "ufc-numbered";
  }

  return normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function createCardKey(fight: ApiFight): string {
  const saturday = getPreviousSaturday(fight.timestamp);
  const series = getEventSeries(fight.slug);

  return `${series}:${saturday}`;
}

function createEventName(fights: ApiFight[]): string {
  const sortedFights = [...fights].sort(
    (first, second) => second.timestamp - first.timestamp
  );

  const latestFight = sortedFights[0];

  if (!latestFight) {
    return "UFC Event";
  }

  const fighterOne = latestFight.fighters.first.name;
  const fighterTwo = latestFight.fighters.second.name;

  const originalSlug = latestFight.slug.trim();

  if (originalSlug.toLowerCase().startsWith("ufc fight night")) {
    return `UFC Fight Night: ${fighterOne} vs. ${fighterTwo}`;
  }

  if (originalSlug.toLowerCase().startsWith("ufc ")) {
    const numberedEvent = originalSlug.match(/^UFC\s+\d+/i)?.[0];

    if (numberedEvent) {
      return `${numberedEvent.toUpperCase()}: ${fighterOne} vs. ${fighterTwo}`;
    }
  }

  return originalSlug;
}

function createEventSlug(name: string): string {
  return name;
}

function mapResultType(wonType: string | null) {
  const normalized = wonType?.toUpperCase() ?? "";

  if (
    normalized.includes("POINT") ||
    normalized.includes("DECISION")
  ) {
    return "decision";
  }

  if (
    normalized.includes("KO") ||
    normalized.includes("TKO")
  ) {
    return "ko_tko";
  }

  if (normalized.includes("SUB")) {
    return "submission";
  }

  return "other";
}

function getWinnerFighterId(fight: ApiFight) {
  if (fight.fighters.first.winner === true) {
    return fight.fighters.first.id;
  }

  if (fight.fighters.second.winner === true) {
    return fight.fighters.second.id;
  }

  return null;
}

function isCancelledFight(fight: ApiFight) {
  const status = fight.status.short.toUpperCase();

  return ["CANC", "PST", "POSTPONED", "CANCELLED"].includes(status);
}

async function fetchRollingWindowFights() {
  const now = new Date();
  const fightsById = new Map<number, ApiFight>();

  for (let offset = -1; offset <= 14; offset += 1) {
    const date = new Date(now);
    date.setUTCDate(now.getUTCDate() + offset);

    const dateString = date.toISOString().slice(0, 10);
    const fights = await getFightsByDate(dateString);

    for (const fight of fights) {
      if (!isCancelledFight(fight)) {
        fightsById.set(fight.id, fight);
      }
    }
  }

  return [...fightsById.values()];
}

function groupFightsIntoEvents(apiFights: ApiFight[]): EventGroup[] {
  const groupedEvents = new Map<string, ApiFight[]>();

  for (const fight of apiFights) {
    if (!fight.slug) {
      continue;
    }

    const cardKey = createCardKey(fight);
    const existingFights = groupedEvents.get(cardKey) ?? [];

    existingFights.push(fight);
    groupedEvents.set(cardKey, existingFights);
  }

  return [...groupedEvents.entries()].map(([cardKey, fights]) => ({
    cardKey,
    fights,
  }));
}
async function completeEventMatchups(
  supabase: ReturnType<typeof createAdminClient>,
  eventId: string
): Promise<number> {
  const { data: matchups, error: matchupsError } = await supabase
    .from("matchups")
    .select(`
      id,
      challenger_id,
      challenged_id
    `)
    .eq("event_id", eventId)
    .eq("status", "accepted");

  if (matchupsError) {
    throw new Error(
      `Could not load matchups for event ${eventId}: ${matchupsError.message}`
    );
  }

  if (!matchups || matchups.length === 0) {
    return 0;
  }

  const { data: fights, error: fightsError } = await supabase
    .from("fights")
    .select("id")
    .eq("event_id", eventId);

  if (fightsError) {
    throw new Error(
      `Could not load fights for event ${eventId}: ${fightsError.message}`
    );
  }

  const fightIds = (fights ?? []).map((fight) => fight.id);

  if (fightIds.length === 0) {
    return 0;
  }

  let completedCount = 0;

  for (const matchup of matchups) {
    const playerIds = [
      matchup.challenger_id,
      matchup.challenged_id,
    ];

    const { data: picks, error: picksError } = await supabase
      .from("picks")
      .select(`
        user_id,
        points
      `)
      .in("fight_id", fightIds)
      .in("user_id", playerIds);

    if (picksError) {
      throw new Error(
        `Could not load picks for matchup ${matchup.id}: ${picksError.message}`
      );
    }

    const challengerPoints = (picks ?? [])
      .filter(
        (pick) => pick.user_id === matchup.challenger_id
      )
      .reduce(
        (total, pick) => total + Number(pick.points ?? 0),
        0
      );

    const challengedPoints = (picks ?? [])
      .filter(
        (pick) => pick.user_id === matchup.challenged_id
      )
      .reduce(
        (total, pick) => total + Number(pick.points ?? 0),
        0
      );

    let winnerId: string | null = null;

    if (challengerPoints > challengedPoints) {
      winnerId = matchup.challenger_id;
    } else if (challengedPoints > challengerPoints) {
      winnerId = matchup.challenged_id;
    }

    const { error: updateError } = await supabase
      .from("matchups")
      .update({
        challenger_points: challengerPoints,
        challenged_points: challengedPoints,
        winner_id: winnerId,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", matchup.id)
      .eq("status", "accepted");

    if (updateError) {
      throw new Error(
        `Could not complete matchup ${matchup.id}: ${updateError.message}`
      );
    }

    completedCount += 1;
  }

  return completedCount;
}
export async function syncRollingWindow() {
  const supabase = createAdminClient();
  const apiFights = await fetchRollingWindowFights();
  const eventGroups = groupFightsIntoEvents(apiFights);

  let eventCount = 0;
  let fightCount = 0;
  let scoredPickCount = 0;
  let completedMatchupCount = 0;
  const syncedEvents = [];

  for (const eventGroup of eventGroups) {
    const sortedFights = [...eventGroup.fights].sort(
      (first, second) => first.timestamp - second.timestamp
    );

    if (sortedFights.length === 0) {
      continue;
    }

    const eventName = createEventName(sortedFights);
    const eventSlug = createEventSlug(eventName);
    const eventDate = getPreviousSaturday(sortedFights[0].timestamp);

    const startsAt = new Date(
      Math.min(...sortedFights.map((fight) => fight.timestamp * 1000))
    ).toISOString();

    const eventCompleted = sortedFights.every(
      (fight) => fight.status.short.toUpperCase() === "FT"
    );

    const { data: event, error: eventError } = await supabase
      .from("events")
      .upsert(
        {
          external_event_id: eventGroup.cardKey,
          slug: eventSlug,
          name: eventName,
          event_date: eventDate,
          starts_at: startsAt,
          status: eventCompleted ? "completed" : "scheduled",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "external_event_id",
        }
      )
      .select("id, name, event_date")
      .single();

    if (eventError) {
      throw new Error(
        `Could not save event ${eventName}: ${eventError.message}`
      );
    }

    eventCount += 1;

    /*
     * API-Sports marks multiple bouts as is_main.
     * We instead treat the latest scheduled fight as the true main event.
     */
    const mainEventFightId =
      sortedFights[sortedFights.length - 1].id;

    for (let index = 0; index < sortedFights.length; index += 1) {
      const fight = sortedFights[index];
      const isMainEvent = fight.id === mainEventFightId;
      const winnerFighterId = getWinnerFighterId(fight);

      let result = null;

      if (winnerFighterId) {
        try {
          result = await getFightResult(fight.id);
        } catch (error) {
          console.error(
            `Could not load result for fight ${fight.id}:`,
            error
          );
        }
      }

      const { data: storedFight, error: fightError } = await supabase
        .from("fights")
        .upsert(
          {
            event_id: event.id,
            external_fight_id: fight.id,
            starts_at: new Date(
              fight.timestamp * 1000
            ).toISOString(),
            sort_order: index,
            category: fight.category,
            status: fight.status.short,
            is_main: isMainEvent,
            scheduled_rounds: isMainEvent ? 5 : 3,

            fighter_one_id: fight.fighters.first.id,
            fighter_one_name: fight.fighters.first.name,
            fighter_one_logo: fight.fighters.first.logo,

            fighter_two_id: fight.fighters.second.id,
            fighter_two_name: fight.fighters.second.name,
            fighter_two_logo: fight.fighters.second.logo,

            winner_fighter_id: winnerFighterId,

            result_type: winnerFighterId
              ? mapResultType(result?.won_type ?? null)
              : null,

            ending_round: result?.round ?? null,
            ending_time: result?.minute ?? null,

            result_detail:
              result?.sub_type ??
              result?.ko_type ??
              result?.target ??
              null,

            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "external_fight_id",
          }
        )
        .select(
          `
            id,
            winner_fighter_id,
            result_type,
            ending_round,
            scheduled_rounds
          `
        )
        .single();

      if (fightError) {
        throw new Error(
          `Could not save fight ${fight.id}: ${fightError.message}`
        );
      }

      fightCount += 1;

      if (!storedFight.winner_fighter_id) {
        continue;
      }

      const { data: picks, error: picksError } = await supabase
        .from("picks")
        .select("id, picked_fighter_id")
        .eq("fight_id", storedFight.id);

      if (picksError) {
        throw new Error(
          `Could not load picks for fight ${fight.id}: ${picksError.message}`
        );
      }

      for (const pick of picks ?? []) {
        const points = calculatePickPoints({
          pickedFighterId: Number(pick.picked_fighter_id),
          winnerFighterId: Number(
            storedFight.winner_fighter_id
          ),
          resultType: storedFight.result_type,
          endingRound: storedFight.ending_round,
          scheduledRounds:
            storedFight.scheduled_rounds ?? 3,
        });

        const { error: updateError } = await supabase
          .from("picks")
          .update({
            points,
            updated_at: new Date().toISOString(),
          })
          .eq("id", pick.id);

        if (updateError) {
          throw new Error(
            `Could not score pick ${pick.id}: ${updateError.message}`
          );
        }

        scoredPickCount += 1;
      }
    }
    if (eventCompleted) {
      const completedForEvent = await completeEventMatchups(
        supabase,
        event.id
      );

      completedMatchupCount += completedForEvent;
    }
    syncedEvents.push({
      id: event.id,
      name: event.name,
      eventDate: event.event_date,
      fightCount: sortedFights.length,
    });
  }

  return {
    ok: true,
    eventCount,
    fightCount,
    scoredPickCount,
    completedMatchupCount,
    events: syncedEvents,
  };
}