import { supabase } from '../lib/supabase';

/** Fetches all participations for a given user, including team & tournament data. */
export async function getParticipationsByUser(userId: string) {
  const { data, error } = await supabase
    .from("participants")
    .select("*, teams(*), tournaments(*)")
    .eq("user_id", userId);
  return { data: data || [], error };
}

/** Fetches pending participants for the teams where the user is a captain. */
export async function getPendingMembersForCaptains(captainTeamIds: string[]) {
  if (captainTeamIds.length === 0) return [];
  const { data } = await supabase
    .from("participants")
    .select("*, users!participants_user_id_fkey(full_name, email)")
    .in("team_id", captainTeamIds)
    .eq("status", "pending");
  return data || [];
}

/** Fetches all participants for a list of team IDs (admin view). */
export async function getParticipantsByTeamIds(teamIds: string[]) {
  if (teamIds.length === 0) return [];
  const { data } = await supabase
    .from("participants")
    .select("*, users!participants_user_id_fkey(full_name, email, department)")
    .in("team_id", teamIds)
    .order("registered_at", { ascending: true });
  return data || [];
}

/** Inserts a captain participation row when creating a team. */
export async function createCaptainParticipation(payload: {
  user_id: string;
  team_id: string;
  tournament_id: string;
}) {
  const { error } = await supabase.from("participants").insert({
    ...payload,
    role_in_team: 'captain',
    status: 'confirmed',
  });
  return { error };
}

/** Calls the join_team RPC. */
export async function joinTeam(joinCode: string, userId: string, fullName: string) {
  const { data, error } = await supabase.rpc('join_team', {
    p_token: joinCode,
    p_user_id: userId,
    p_full_name: fullName,
    p_roll_number: null,
  });
  return { data, error };
}

/** Approves a participant. */
export async function approveParticipant(participantId: string, approverId: string) {
  const { error } = await supabase
    .from("participants")
    .update({
      status: 'confirmed',
      approved_by: approverId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", participantId);
  return { error };
}

/** Rejects a participant. */
export async function rejectParticipant(participantId: string) {
  const { error } = await supabase
    .from("participants")
    .update({ status: 'rejected' })
    .eq("id", participantId);
  return { error };
}
