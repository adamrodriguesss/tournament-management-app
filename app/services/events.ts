import { supabase } from '../lib/supabase';

/** Fetches events with status 'upcoming' or 'ongoing', including tournament name. */
export async function getActiveEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("*, tournaments(name)")
    .in("status", ["upcoming", "ongoing", "completed"])
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

/** Fetches event registrations for a list of participants. */
export async function getEventRegistrationsByParticipants(participantIds: string[]) {
  if (participantIds.length === 0) return { data: [], error: null };
  const { data, error } = await supabase
    .from("event_registrations")
    .select("*, events(*)")
    .in("participant_id", participantIds);
  return { data: data || [], error };
}

/** Unregisters a participant from an individual event. */
export async function unregisterParticipantFromEvent(registrationId: string) {
  const { error } = await supabase
    .from("event_registrations")
    .delete()
    .eq("id", registrationId);
  return { error };
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

/** Fetches all confirmed registrations for a specific event */
export async function getConfirmedRegistrationsByEvent(eventId: string) {
  const { data, error } = await supabase
    .from("event_registrations")
    .select(`
      *,
      team:team_id (*),
      participant:participant_id (
        *,
        team:team_id (*),
        user:user_id (*)
      )
    `)
    .eq("event_id", eventId)
    .eq("status", "confirmed");
  return { data: data || [], error };
}

/** Calls the record_judged_results RPC to assign 1st, 2nd, and 3rd place */
export async function recordJudgedResults(payload: {
  p_event_id: string;
  p_first_team_id: string;
  p_second_team_id: string | null;
  p_third_team_id: string | null;
  p_recorded_by: string;
}) {
  const { error } = await supabase.rpc('record_judged_results', payload);
  return { error };
}

/** Fetches existing results for an event */
export async function getEventResults(eventId: string) {
  const { data, error } = await supabase
    .from("event_results")
    .select("*")
    .eq("event_id", eventId)
    .order("position", { ascending: true });
  return { data: data || [], error };
}

/** Fetches all users with the event_manager role */
export async function getEventManagers() {
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("role", "event_manager")
    .order("full_name", { ascending: true });
  return { data: data || [], error };
}

/** Assigns an event manager to an event (or clears the assignment) */
export async function assignEventManager(eventId: string, userId: string | null) {
  const { error } = await supabase
    .from("events")
    .update({ assigned_to: userId })
    .eq("id", eventId);
  return { error };
}

/** Fetches events assigned to a specific user */
export async function getEventsAssignedTo(userId: string) {
  const { data, error } = await supabase
    .from("events")
    .select("*, tournaments(name)")
    .eq("assigned_to", userId)
    .in("status", ["upcoming", "ongoing", "completed"])
    .order("scheduled_at", { ascending: true });
  return { data: data || [], error };
}

/** Deletes an event. Cascading FKs automatically remove registrations, matches, results, and roster entries. */
export async function deleteEvent(eventId: string) {
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId);
  return { error };
}

