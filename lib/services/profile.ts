import { supabase } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/profile";

export async function getCurrentProfile(): Promise<Profile | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User error:", userError);
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Profile error:", error);
    return null;
  }

  return data as Profile;
}