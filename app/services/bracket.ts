import { supabase } from '../lib/supabase';

/** Fetch all matches for an event, ordered by round and created time */
export async function getMatchesByEvent(eventId: string) {
  const { data, error } = await supabase
    .from('matches')
    .select('*, team_a:teams!team_a_id(name), team_b:teams!team_b_id(name), winner:teams!winner_id(name)')
    .eq('event_id', eventId)
    .order('round_number', { ascending: true })
    .order('id', { ascending: true });
  return { data: data || [], error };
}

/** Generates a single-elimination bracket for the event */
export async function generateBracket(eventId: string, adminId: string) {
  // 1. Fetch confimed registrations
  const { data: regs, error: regError } = await supabase
    .from('event_registrations')
    .select('team_id')
    .eq('event_id', eventId)
    .eq('status', 'confirmed');

  if (regError) return { error: regError };
  if (!regs || regs.length < 2) return { error: new Error('Need at least 2 confirmed teams to generate a bracket.') };

  // 2. Fetch event details
  const { data: event } = await supabase.from('events').select('*').eq('id', eventId).single();
  if (!event || event.format !== 'bracket') return { error: new Error('Event must be a bracket format.') };

  const p = Math.pow(2, Math.ceil(Math.log2(regs.length)));
  const totalMatches = p - 1;

  // 3. Create all matches in memory
  const matches = Array.from({ length: totalMatches }, () => ({
    id: crypto.randomUUID(),
    event_id: eventId,
    round_number: 1,
    team_a_id: null as string | null,
    team_b_id: null as string | null,
    score_a: null as number | null,
    score_b: null as number | null,
    winner_id: null as string | null,
    status: 'scheduled',
    next_match_id: null as string | null,
    entered_by: adminId,
  }));

  let currentRoundStart = 0;
  let roundSize = p / 2;
  let roundNumber = 1;

  while (roundSize >= 1) {
    for (let i = 0; i < roundSize; i++) {
      const match = matches[currentRoundStart + i];
      match.round_number = roundNumber;

      if (roundSize > 1) {
        const nextRoundStart = currentRoundStart + roundSize;
        const nextMatchOffset = Math.floor(i / 2);
        match.next_match_id = matches[nextRoundStart + nextMatchOffset].id;
      }
    }
    currentRoundStart += roundSize;
    roundSize /= 2;
    roundNumber++;
  }

  // 4. Seed teams randomly
  const shuffledTeams = regs.map(r => r.team_id).sort(() => 0.5 - Math.random());
  const slots = [...shuffledTeams];
  while (slots.length < p) slots.push(null); // pad with byes (nulls)

  for (let i = 0; i < p / 2; i++) {
    const teamA = slots[i * 2];
    const teamB = slots[i * 2 + 1];
    const match = matches[i];

    match.team_a_id = teamA;
    match.team_b_id = teamB;

    // Default status handling
    if (teamA && !teamB) {
      match.winner_id = teamA;
      match.status = 'completed';

      // Auto-advance
      const nextMatch = matches.find(m => m.id === match.next_match_id);
      if (nextMatch) {
        if (i % 2 === 0) nextMatch.team_a_id = teamA;
        else nextMatch.team_b_id = teamA;
      }
    } else if (!teamA && teamB) {
      match.winner_id = teamB;
      match.status = 'completed';

      // Auto-advance
      const nextMatch = matches.find(m => m.id === match.next_match_id);
      if (nextMatch) {
        if (i % 2 === 0) nextMatch.team_a_id = teamB;
        else nextMatch.team_b_id = teamB;
      }
    }
  }

  // 5. Insert all into database
  const { error: insertError } = await supabase.from('matches').insert(matches);
  return { error: insertError };
}

/** Records a score for a match and advances the winner */
export async function recordMatchScore(
  matchId: string, 
  scoreA: number, 
  scoreB: number, 
  adminId: string
) {
  // 1. Get the match and event
  const { data: match, error: fetchErr } = await supabase
    .from('matches')
    .select('*, events(points_first, points_second)')
    .eq('id', matchId)
    .single();

  if (fetchErr || !match) return { error: fetchErr || new Error('Match not found') };
  if (scoreA === scoreB) return { error: new Error('Matches cannot end in a draw.') };

  const winnerId = scoreA > scoreB ? match.team_a_id : match.team_b_id;
  const loserId = scoreA > scoreB ? match.team_b_id : match.team_a_id;

  // 2. Update the current match
  const { error: updateErr } = await supabase
    .from('matches')
    .update({
      score_a: scoreA,
      score_b: scoreB,
      winner_id: winnerId,
      status: 'completed',
      entered_by: adminId,
      updated_at: new Date().toISOString()
    })
    .eq('id', matchId);

  if (updateErr) return { error: updateErr };

  // 3. Advance to next match if one exists
  if (match.next_match_id) {
    // We need to know if we are filling team_a_id or team_b_id of the next match
    const { data: nextMatch } = await supabase
      .from('matches')
      .select('team_a_id, team_b_id')
      .eq('id', match.next_match_id)
      .single();

    if (nextMatch) {
      // If team_a_id is empty, fill it. Else fill team_b_id.
      // A more robust way was calculating i % 2, but since we retrieve it via DB, we can just check emptiness.
      const updateData: any = {};
      if (!nextMatch.team_a_id) updateData.team_a_id = winnerId;
      else updateData.team_b_id = winnerId;

      const { error: nextErr } = await supabase.from('matches').update(updateData).eq('id', match.next_match_id);
      if (nextErr) return { error: nextErr };
    }
  } else {
    // 4. If there is NO next match, this was the Final!
    // Record the overall event results for 1st and 2nd place.
    const event = match.events;

    // 1st Place
    await supabase.from('event_results').upsert({
      event_id: match.event_id,
      team_id: winnerId,
      position: 1,
      points_awarded: event.points_first,
      recorded_by: adminId
    }, { onConflict: 'event_id, position' });

    // 2nd Place
    await supabase.from('event_results').upsert({
      event_id: match.event_id,
      team_id: loserId,
      position: 2,
      points_awarded: event.points_second,
      recorded_by: adminId
    }, { onConflict: 'event_id, position' });
  }

  return { error: null };
}
