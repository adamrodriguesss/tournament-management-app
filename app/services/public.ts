import { supabase } from '../lib/supabase';

/** Fetches all tournaments, ordered by start date. */
export async function getPublicTournaments() {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .order("start_date", { ascending: false });
  return { data: data || [], error };
}

/** Fetches a single tournament with all its events. */
export async function getTournamentWithEvents(tournamentId: string) {
  const [tournamentRes, eventsRes] = await Promise.all([
    supabase.from("tournaments").select("*").eq("id", tournamentId).single(),
    supabase.from("events").select("*").eq("tournament_id", tournamentId).order("scheduled_at", { ascending: true }),
  ]);
  return {
    tournament: tournamentRes.data,
    events: eventsRes.data || [],
    error: tournamentRes.error || eventsRes.error,
  };
}

/** Aggregates team standings for a tournament by total points from event_results. */
export async function getTeamStandings(tournamentId: string) {
  const { data, error } = await supabase
    .from("event_results")
    .select(`
      points_awarded,
      team:team_id (
        id, name, department, tournament_id
      ),
      event:event_id (
        tournament_id
      )
    `)
    .order("points_awarded", { ascending: false });

  if (error) return { data: [], error };

  // Filter to only this tournament's results and aggregate by team
  const standings = new Map<string, { id: string; name: string; department: string; totalPoints: number; golds: number; silvers: number; bronzes: number }>();

  for (const row of (data || [])) {
    const event = row.event as any;
    const team = row.team as any;
    if (!team || !event || event.tournament_id !== tournamentId) continue;

    if (!standings.has(team.id)) {
      standings.set(team.id, {
        id: team.id,
        name: team.name,
        department: team.department,
        totalPoints: 0,
        golds: 0,
        silvers: 0,
        bronzes: 0,
      });
    }
    const entry = standings.get(team.id)!;
    entry.totalPoints += row.points_awarded;

    // Determine medal from position (we don't have position directly, infer from points)
    // Actually let's query position too
  }

  return { data: Array.from(standings.values()).sort((a, b) => b.totalPoints - a.totalPoints), error: null };
}

/** Fetches team standings with position info. */
export async function getTeamStandingsDetailed(tournamentId: string) {
  const { data, error } = await supabase
    .from("event_results")
    .select(`
      points_awarded,
      position,
      team:team_id (id, name, department, tournament_id),
      event:event_id (tournament_id)
    `);

  if (error) return { data: [], error };

  const standings = new Map<string, { id: string; name: string; department: string; totalPoints: number; golds: number; silvers: number; bronzes: number }>();

  for (const row of (data || [])) {
    const event = row.event as any;
    const team = row.team as any;
    if (!team || !event || event.tournament_id !== tournamentId) continue;

    if (!standings.has(team.id)) {
      standings.set(team.id, { id: team.id, name: team.name, department: team.department, totalPoints: 0, golds: 0, silvers: 0, bronzes: 0 });
    }
    const entry = standings.get(team.id)!;
    entry.totalPoints += row.points_awarded;
    if (row.position === 1) entry.golds++;
    else if (row.position === 2) entry.silvers++;
    else if (row.position === 3) entry.bronzes++;
  }

  return { data: Array.from(standings.values()).sort((a, b) => b.totalPoints - a.totalPoints), error: null };
}

/** Fetches matches for viewing a public bracket. */
export async function getPublicMatches(eventId: string) {
  const { data, error } = await supabase
    .from("matches")
    .select("*, team_a:team_a_id(id, name), team_b:team_b_id(id, name), winner:winner_id(id, name)")
    .eq("event_id", eventId)
    .order("round_number", { ascending: true })
    .order("id", { ascending: true });
  return { data: data || [], error };
}

/** Fetches event results (1st/2nd/3rd) for a judged event. */
export async function getPublicEventResults(eventId: string) {
  const { data, error } = await supabase
    .from("event_results")
    .select("*, team:team_id(id, name, department)")
    .eq("event_id", eventId)
    .order("position", { ascending: true });
  return { data: data || [], error };
}

/** Fetches a single event with tournament info. */
export async function getPublicEvent(eventId: string) {
  const { data, error } = await supabase
    .from("events")
    .select("*, tournaments(name)")
    .eq("id", eventId)
    .single();
  return { data, error };
}
