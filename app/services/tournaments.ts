import { supabase } from '../lib/supabase';

/** Fetches tournaments with status 'registration_open' or 'ongoing' and whose end_date hasn't passed. */
export async function getActiveTournaments() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .in("status", ["registration_open", "ongoing"])
    .or(`end_date.gte.${today},end_date.is.null`)
    .order("created_at", { ascending: false });
  return { data: data || [], error };
}

/** Fetches ALL tournaments (for admin). */
export async function getAllTournaments() {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false });
  return { data: data || [], error };
}

/** Fetches a single tournament by ID. */
export async function getTournamentById(id: string) {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();
  return { data, error };
}

/** Creates a new tournament. */
export async function createTournament(payload: {
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_by: string;
}) {
  const { error } = await supabase.from("tournaments").insert(payload);
  return { error };
}

/**
 * Auto-marks tournaments and their events as 'completed'
 * when the tournament's end_date has passed.
 * Called lazily on public/participant page loads.
 */
export async function autoCompleteExpired() {
  const today = new Date().toISOString().split('T')[0];

  // Mark tournaments whose end_date has passed as 'completed'
  await supabase
    .from("tournaments")
    .update({ status: 'completed' })
    .lt("end_date", today)
    .neq("status", "completed");

  // Mark events whose scheduled_at has passed as 'completed'
  await supabase
    .from("events")
    .update({ status: 'completed' })
    .lt("scheduled_at", new Date().toISOString())
    .neq("status", "completed");
}

/** Deletes a tournament entirely. */
export async function deleteTournament(id: string) {
  const { error } = await supabase.from("tournaments").delete().eq("id", id);
  return { error };
}
