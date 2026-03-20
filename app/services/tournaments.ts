import { supabase } from '../lib/supabase';

/** Fetches tournaments with status 'registration_open' or 'ongoing'. */
export async function getActiveTournaments() {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .in("status", ["registration_open", "ongoing"])
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
