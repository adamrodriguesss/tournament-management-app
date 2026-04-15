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

async function eliminateDownstreamMatchWinner(matchIdToStartFrom: string | null, oldWinnerIdToErase: string | null) {
  if (!matchIdToStartFrom || !oldWinnerIdToErase) return;
  
  let currId: string | null = matchIdToStartFrom;
  while (currId) {
    const result: any = await supabase.from('matches').select('*').eq('id', currId).single();
    const currMatch = result.data;
    if (!currMatch) break;
    
    let updateData: any = {};
    let fieldToClear = null;
    if (currMatch.team_a_id === oldWinnerIdToErase) fieldToClear = 'team_a_id';
    else if (currMatch.team_b_id === oldWinnerIdToErase) fieldToClear = 'team_b_id';

    if (fieldToClear) {
      updateData[fieldToClear] = null;
      if (currMatch.status === 'completed') {
        updateData.status = 'scheduled';
        updateData.score_a = null;
        updateData.score_b = null;
        updateData.winner_id = null;
        
        await supabase.from('matches').update(updateData).eq('id', currId);
        // Since we are resetting this match, we must also tell the loop to erase ITS winner later downstream
        currId = currMatch.next_match_id; 
        oldWinnerIdToErase = currMatch.winner_id; 
      } else {
        await supabase.from('matches').update(updateData).eq('id', currId);
        break; // Match wasn't played yet, no need to recurse deeper
      }
    } else {
      break; 
    }
  }
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

  const oldWinnerId = match.winner_id;
  const newWinnerId = scoreA > scoreB ? match.team_a_id : match.team_b_id;
  const newLoserId = scoreA > scoreB ? match.team_b_id : match.team_a_id;

  // 2. Update the current match
  const { error: updateErr } = await supabase
    .from('matches')
    .update({
      score_a: scoreA,
      score_b: scoreB,
      winner_id: newWinnerId,
      status: 'completed',
      entered_by: adminId,
      updated_at: new Date().toISOString()
    })
    .eq('id', matchId);

  if (updateErr) return { error: updateErr };

  // 3. Advance to next match if one exists
  if (match.next_match_id) {
    const { data: nextMatch } = await supabase
      .from('matches')
      .select('id, team_a_id, team_b_id, status, winner_id, next_match_id')
      .eq('id', match.next_match_id)
      .single();

    if (nextMatch) {
      const updateData: any = {};
      let weAreErasingOldWinner = false;

      if (oldWinnerId && oldWinnerId !== newWinnerId) {
         // It's an edit, and winner changed
         if (nextMatch.team_a_id === oldWinnerId) {
           updateData.team_a_id = newWinnerId;
           weAreErasingOldWinner = true;
         } else if (nextMatch.team_b_id === oldWinnerId) {
           updateData.team_b_id = newWinnerId;
           weAreErasingOldWinner = true;
         } else {
           if (!nextMatch.team_a_id) updateData.team_a_id = newWinnerId;
           else updateData.team_b_id = newWinnerId;
         }
      } else {
         // Either first time recording, or old winner didn't change
         if (oldWinnerId !== newWinnerId) {
            if (!nextMatch.team_a_id) updateData.team_a_id = newWinnerId;
            else updateData.team_b_id = newWinnerId;
         }
      }

      if (Object.keys(updateData).length > 0) {
        if (weAreErasingOldWinner && nextMatch.status === 'completed') {
           updateData.status = 'scheduled';
           updateData.score_a = null;
           updateData.score_b = null;
           updateData.winner_id = null;
           await supabase.from('matches').update(updateData).eq('id', nextMatch.id);
           
           // Cascade erase!
           await eliminateDownstreamMatchWinner(nextMatch.next_match_id, nextMatch.winner_id);
        } else {
           await supabase.from('matches').update(updateData).eq('id', nextMatch.id);
        }
      }
    }
  } else {
    // 4. If there is NO next match, this was the Final!
    const event = match.events;

    // Delete any previous final awards for this event via match editing
    if (oldWinnerId && oldWinnerId !== newWinnerId) {
      // Just clear out all results for the event to recreate them freshly
      await supabase.from('event_results').delete().eq('event_id', match.event_id).in('position', [1, 2]);
    }

    // 1st Place
    await supabase.from('event_results').upsert({
      event_id: match.event_id,
      team_id: newWinnerId,
      position: 1,
      points_awarded: event.points_first,
      recorded_by: adminId
    }, { onConflict: 'event_id, position' });

    // 2nd Place
    await supabase.from('event_results').upsert({
      event_id: match.event_id,
      team_id: newLoserId,
      position: 2,
      points_awarded: event.points_second,
      recorded_by: adminId
    }, { onConflict: 'event_id, position' });

    // Mark event as completed
    await supabase.from('events').update({ status: 'completed' }).eq('id', match.event_id);
  }

  return { error: null };
}
