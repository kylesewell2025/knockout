import { supabase } from "@/lib/supabase/client";
import type { Pick } from "@/lib/types/pick";

export async function getCurrentUserPicks(
  fightIds: string[]
): Promise<Pick[]> {
  if (fightIds.length === 0) {
    return [];
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error("You must be logged in to view picks.");
  }

  const { data, error } = await supabase
    .from("picks")
    .select(`
      id,
      user_id,
      fight_id,
      picked_fighter_id,
      points
    `)
    .eq("user_id", user.id)
    .in("fight_id", fightIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Pick[];
}

export async function savePick(input: {
  fightId: string;
  fighterId: number;
}): Promise<Pick> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error("You must be logged in to make a pick.");
  }

  const { data: fight, error: fightError } = await supabase
    .from("fights")
    .select(`
      id,
      starts_at,
      fighter_one_id,
      fighter_two_id
    `)
    .eq("id", input.fightId)
    .single();

  if (fightError) {
    throw new Error(fightError.message);
  }

  if (!fight) {
    throw new Error("Fight not found.");
  }

  if (new Date(fight.starts_at).getTime() <= Date.now()) {
    throw new Error("This fight is locked.");
  }

  const validFighterIds = [
    Number(fight.fighter_one_id),
    Number(fight.fighter_two_id),
  ];

  if (!validFighterIds.includes(input.fighterId)) {
    throw new Error("That fighter is not part of this matchup.");
  }

  const { data: existingPick, error: existingPickError } =
    await supabase
      .from("picks")
      .select("id")
      .eq("user_id", user.id)
      .eq("fight_id", input.fightId)
      .maybeSingle();

  if (existingPickError) {
    throw new Error(existingPickError.message);
  }

  if (existingPick) {
    const { data, error } = await supabase
      .from("picks")
      .update({
        picked_fighter_id: input.fighterId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingPick.id)
      .eq("user_id", user.id)
      .select(`
        id,
        user_id,
        fight_id,
        picked_fighter_id,
        points
      `)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as Pick;
  }

  const { data, error } = await supabase
    .from("picks")
    .insert({
      user_id: user.id,
      fight_id: input.fightId,
      picked_fighter_id: input.fighterId,
      points: 0,
    })
    .select(`
      id,
      user_id,
      fight_id,
      picked_fighter_id,
      points
    `)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Pick;
}