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

/** Fetches all events for a specific tournament. */
export async function getEventsByTournament(tournamentId: string) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: false });
  return { data: data || [], error };
}

/** Creates a new event for a tournament. */
export async function createEvent(payload: {
  tournament_id: string;
  name: string;
  description: string | null;
  type: string;
  format: string;
  points_first: number;
  points_second: number;
  points_third: number;
  venue: string | null;
  scheduled_at: string | null;
  status: string;
  created_by: string;
  max_participants_per_team: number | null;
}) {
  const { error } = await supabase.from("events").insert(payload);
  return { error };
}

/** Registers a confirmed participant for an individual event. */
export async function registerParticipantForEvent(eventId: string, participantId: string) {
  const { data, error } = await supabase.from("event_registrations").insert({
    event_id: eventId,
    participant_id: participantId,
    status: 'confirmed',
  }).select().single();
  return { data, error };
}

/** Registers a confirmed team for a team event. */
export async function registerTeamForEvent(eventId: string, teamId: string) {
  const { data, error } = await supabase.from("event_registrations").insert({
    event_id: eventId,
    team_id: teamId,
    status: 'confirmed',
  }).select().single();
  return { data, error };
}

/** Fetches all event registrations for a list of teams (useful for captains). */
export async function getEventRegistrationsByTeams(teamIds: string[]) {
  if (teamIds.length === 0) return { data: [], error: null };
  const { data, error } = await supabase
    .from("event_registrations")
    .select("*, events(*)")
    .in("team_id", teamIds);
  return { data: data || [], error };
}

/** Fetches event registrations for an individual participant. */
export async function getEventRegistrationsByParticipant(participantId: string) {
  const { data, error } = await supabase
    .from("event_registrations")
    .select("*, events(*)")
    .eq("participant_id", participantId);
  return { data: data || [], error };
}

/** Fetches team participants selected for specific event registrations. */
export async function getEventTeamParticipants(registrationIds: string[]) {
  if (registrationIds.length === 0) return { data: [], error: null };
  const { data, error } = await supabase
    .from("event_team_participants")
    .select("*")
    .in("event_registration_id", registrationIds);
  return { data: data || [], error };
}

/** Adds a participant to a team event's roster. */
export async function addParticipantToTeamEvent(registrationId: string, participantId: string) {
  const { error } = await supabase.from("event_team_participants").insert({
    event_registration_id: registrationId,
    participant_id: participantId,
  });
  return { error };
}

/** Removes a participant from a team event's roster. */
export async function removeParticipantFromTeamEvent(registrationId: string, participantId: string) {
  const { error } = await supabase.from("event_team_participants")
    .delete()
    .eq("event_registration_id", registrationId)
    .eq("participant_id", participantId);
  return { error };
}

/** Fetches registration details including the event and team. */
export async function getEventRegistrationDetails(registrationId: string) {
  const { data, error } = await supabase
    .from("event_registrations")
    .select("*, events(*), teams(*)")
    .eq("id", registrationId)
    .single();
  return { data, error };
}

/** Updates the roster for a team event registration in bulk. */
export async function updateTeamEventRoster(registrationId: string, participantIds: string[]) {
  const { error: deleteError } = await supabase
    .from("event_team_participants")
    .delete()
    .eq("event_registration_id", registrationId);
  
  if (deleteError) return { error: deleteError };

  if (participantIds.length === 0) return { error: null };

  const payload = participantIds.map(pid => ({
    event_registration_id: registrationId,
    participant_id: pid
  }));

  const { error: insertError } = await supabase
    .from("event_team_participants")
    .insert(payload);
    
  return { error: insertError };
}
