import { supabase } from '../lib/supabase';

/** Creates a new team and returns the inserted row. */
export async function createTeam(payload: {
  tournament_id: string;
  name: string;
  department: string;
  registration_token: string;
  status: string;
  created_by: string;
}) {
  const { data, error } = await supabase
    .from("teams")
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

/** Fetches all teams for a given tournament. */
export async function getTeamsByTournament(tournamentId: string) {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: false });
  return { data: data || [], error };
}

/** Updates a team's status (e.g. 'confirmed', 'disqualified'). */
export async function updateTeamStatus(teamId: string, status: string) {
  const { error } = await supabase
    .from("teams")
    .update({ status })
    .eq("id", teamId);
  return { error };
}
