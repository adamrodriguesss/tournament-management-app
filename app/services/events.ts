import { supabase } from '../lib/supabase';

/** Fetches events with status 'upcoming' or 'ongoing', including tournament name. */
export async function getActiveEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("*, tournaments(name)")
    .in("status", ["upcoming", "ongoing"])
    .order("scheduled_at", { ascending: true });
  return { data: data || [], error };
}
