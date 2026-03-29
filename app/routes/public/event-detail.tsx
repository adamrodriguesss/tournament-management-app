import { useNavigate } from 'react-router';
import { getPublicEvent, getPublicMatches, getPublicEventResults } from '../../services/public';
import { getSession } from '../../services/auth';
import { Button } from '../../components/ui/Button';
import type { Route } from './+types/event-detail';

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const session = await getSession();
  const eventId = params.eventId;
  const tournamentId = params.id;
  const { data: event } = await getPublicEvent(eventId);

  if (!event) {
    return { event: null, matches: [], results: [], isLoggedIn: !!session, tournamentId };
  }

  const [matchesRes, resultsRes] = await Promise.all([
    event.format === 'bracket' ? getPublicMatches(eventId) : Promise.resolve({ data: [] }),
    getPublicEventResults(eventId),
  ]);

  return {
    event,
    matches: matchesRes.data || [],
    results: resultsRes.data || [],
    isLoggedIn: !!session,
    tournamentId,
  };
}

export default function EventDetail({ loaderData }: { loaderData: any }) {
  const navigate = useNavigate();
  const { event, matches, results, isLoggedIn, tournamentId } = loaderData;

  if (!event) {
  return (
    <div className="min-h-screen bg-pixel-black text-pixel-slate-light flex items-center justify-center">
      <div className="text-center">
        <h2 className="font-[family-name:var(--font-pixel)] text-[16px] text-pixel-gold mb-4 leading-relaxed">
          EVENT NOT FOUND
        </h2>
        <Button onClick={() => navigate('/tournaments')}>← VIEW TOURNAMENTS</Button>
      </div>
    </div>
  );
}

return (
  <div className="min-h-screen bg-pixel-black text-pixel-slate-light flex flex-col">
    {/* Header */}
    <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b-[3px] border-pixel-border bg-pixel-dark">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/tournaments/${tournamentId}`)}
          className="font-[family-name:var(--font-pixel)] text-[11px] text-pixel-slate hover:text-pixel-gold transition-colors tracking-wide"
        >
          ← BACK
        </button>
        <h1 className="font-[family-name:var(--font-pixel)] text-[14px] text-pixel-gold tracking-wider">
          {event.tournaments?.name?.toUpperCase() || 'FESTFLOW'}
        </h1>
      </div>
      <Button
        variant={isLoggedIn ? 'primary' : 'secondary'}
        onClick={() => navigate(isLoggedIn ? '/' : '/login')}
      >
        {isLoggedIn ? 'Dashboard' : 'Sign In'}
      </Button>
    </header>

    <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full">
      {/* Event Header */}
      <div className="mb-8 border-l-4 border-pixel-gold pl-4 py-1">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h2 className="font-[family-name:var(--font-pixel)] text-[16px] sm:text-[20px] text-pixel-gold leading-relaxed tracking-wide">
            {event.name.toUpperCase()}
          </h2>
          <span className={`font-[family-name:var(--font-pixel)] text-[9px] px-2 py-1 border-2 tracking-wide
            ${event.format === 'bracket'
              ? 'bg-pixel-cyan/10 text-pixel-cyan-dim border-pixel-cyan-dim'
              : 'bg-pixel-purple/10 text-pixel-purple border-pixel-purple'}`}>
            {event.format === 'bracket' ? '🏆 BRACKET' : '⭐ JUDGED'}
          </span>
          <span className={`font-[family-name:var(--font-pixel)] text-[9px] px-2 py-1 border-2 capitalize tracking-wide
            ${event.status === 'ongoing'
              ? 'bg-pixel-green/10 text-pixel-green-dim border-pixel-green-dim'
              : event.status === 'completed'
              ? 'bg-pixel-slate/10 text-pixel-slate border-pixel-border'
              : 'bg-amber-500/10 text-amber-400 border-amber-500'}`}>
            {event.status.toUpperCase()}
          </span>
        </div>

        {event.description && (
          <p className="text-xl font-[family-name:var(--font-vt)] text-pixel-slate mb-3">
            {event.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-lg font-[family-name:var(--font-vt)] text-pixel-slate">
          <span className="capitalize">📌 {event.type} event</span>
          {event.venue && <span>📍 {event.venue}</span>}
          {event.scheduled_at && <span>🕐 {new Date(event.scheduled_at).toLocaleString()}</span>}
          <span>🏅 {event.points_first}/{event.points_second}/{event.points_third} pts</span>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-[2px] w-4 bg-pixel-gold opacity-60" />
            <h3 className="font-[family-name:var(--font-pixel)] text-[13px] text-pixel-gold tracking-wider">
              🏅 RESULTS
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {results.map((r: any) => {
              const medal = r.position === 1 ? '🥇' : r.position === 2 ? '🥈' : '🥉';
              const styles =
                r.position === 1 ? 'border-pixel-gold bg-pixel-gold/5'
                : r.position === 2 ? 'border-pixel-slate bg-pixel-slate/5'
                : 'border-amber-700/50 bg-amber-700/5';
              return (
                <div
                  key={r.id}
                  className={`border-[3px] p-5 text-center ${styles}`}
                  style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
                >
                  <span className="text-4xl block mb-3">{medal}</span>
                  <p className="font-[family-name:var(--font-pixel)] text-[11px] text-pixel-slate-light mb-1 leading-relaxed">
                    {r.team?.name?.toUpperCase() || 'TBD'}
                  </p>
                  <p className="text-lg font-[family-name:var(--font-vt)] text-pixel-slate mb-2">
                    {r.team?.department}
                  </p>
                  <p className="font-[family-name:var(--font-pixel)] text-[11px] text-pixel-gold tracking-wide">
                    {r.points_awarded} PTS
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bracket */}
      {event.format === 'bracket' && matches.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-[2px] w-4 bg-pixel-cyan-dim opacity-60" />
            <h3 className="font-[family-name:var(--font-pixel)] text-[13px] text-pixel-cyan-dim tracking-wider">
              🏆 BRACKET
            </h3>
          </div>
          <BracketView matches={matches} />
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && matches.length === 0 && (
        <div
          className="bg-pixel-card border-[3px] border-pixel-border p-12 text-center"
          style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
        >
          <span className="text-5xl mb-4 block opacity-40">⏳</span>
          <h3 className="font-[family-name:var(--font-pixel)] text-[13px] text-pixel-slate-light mb-2 leading-relaxed">
            AWAITING RESULTS
          </h3>
          <p className="text-xl font-[family-name:var(--font-vt)] text-pixel-slate">
            Scores and results haven't been entered for this event yet.
          </p>
        </div>
      )}
    </main>
  </div>
);

// BracketView
function BracketView({ matches }: { matches: any[] }) {
  const rounds = new Map<number, any[]>();
  for (const m of matches) {
    const r = m.round_number;
    if (!rounds.has(r)) rounds.set(r, []);
    rounds.get(r)!.push(m);
  }
  const sortedRounds = Array.from(rounds.entries()).sort((a, b) => a[0] - b[0]);
  const totalRounds = sortedRounds.length;

  const roundLabel = (roundNum: number, total: number) => {
    if (roundNum === total) return 'FINAL';
    if (roundNum === total - 1) return 'SEMIFINALS';
    if (roundNum === total - 2) return 'QUARTERFINALS';
    return `ROUND ${roundNum}`;
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {sortedRounds.map(([roundNum, roundMatches]) => (
        <div key={roundNum} className="flex flex-col gap-4 min-w-[220px]">
          <h4 className="font-[family-name:var(--font-pixel)] text-[9px] text-pixel-gold uppercase tracking-widest text-center leading-relaxed">
            {roundLabel(roundNum, totalRounds)}
          </h4>
          {roundMatches.map((match: any) => (
            <div
              key={match.id}
              className="bg-pixel-dark border-[3px] border-pixel-border overflow-hidden"
              style={{ boxShadow: '2px 2px 0 var(--color-pixel-border)' }}
            >
              <MatchSlot
                team={match.team_a}
                score={match.score_a}
                isWinner={match.winner?.id === match.team_a?.id}
                isCompleted={match.status === 'completed'}
              />
              <div className="border-t-2 border-pixel-border" />
              <MatchSlot
                team={match.team_b}
                score={match.score_b}
                isWinner={match.winner?.id === match.team_b?.id}
                isCompleted={match.status === 'completed'}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function MatchSlot({ team, score, isWinner, isCompleted }: {
  team: any; score: number | null; isWinner: boolean; isCompleted: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-3 py-2.5 ${isWinner && isCompleted ? 'bg-pixel-gold/10' : ''}`}>
      <span className={`text-lg font-[family-name:var(--font-vt)] truncate
        ${isCompleted
          ? isWinner ? 'text-pixel-gold font-bold' : 'text-pixel-slate'
          : 'text-pixel-slate-light'}`}>
        {team?.name || <span className="text-pixel-border italic">TBD</span>}
      </span>
      {score !== null && score !== undefined && (
        <span className={`font-[family-name:var(--font-pixel)] text-[11px] ml-3
          ${isWinner ? 'text-pixel-gold' : 'text-pixel-slate'}`}>
          {score}
        </span>
      )}
    </div>
  );
}
}

/** Read-only bracket tree visualization */
function BracketView({ matches }: { matches: any[] }) {
  const rounds = new Map<number, any[]>();
  for (const m of matches) {
    const r = m.round_number;
    if (!rounds.has(r)) rounds.set(r, []);
    rounds.get(r)!.push(m);
  }

  const sortedRounds = Array.from(rounds.entries()).sort((a, b) => a[0] - b[0]);
  const totalRounds = sortedRounds.length;

  const roundLabel = (roundNum: number, totalRounds: number) => {
    if (roundNum === totalRounds) return 'Final';
    if (roundNum === totalRounds - 1) return 'Semifinals';
    if (roundNum === totalRounds - 2) return 'Quarterfinals';
    return `Round ${roundNum}`;
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {sortedRounds.map(([roundNum, roundMatches]) => (
        <div key={roundNum} className="flex flex-col gap-4 min-w-[220px]">
          <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide text-center">
            {roundLabel(roundNum, totalRounds)}
          </h4>
          {roundMatches.map((match: any) => (
            <div key={match.id} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              <MatchSlot
                team={match.team_a}
                score={match.score_a}
                isWinner={match.winner?.id === match.team_a?.id}
                isCompleted={match.status === 'completed'}
              />
              <div className="border-t border-slate-700" />
              <MatchSlot
                team={match.team_b}
                score={match.score_b}
                isWinner={match.winner?.id === match.team_b?.id}
                isCompleted={match.status === 'completed'}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function MatchSlot({ team, score, isWinner, isCompleted }: {
  team: any;
  score: number | null;
  isWinner: boolean;
  isCompleted: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-3 py-2.5 ${isWinner && isCompleted ? 'bg-emerald-500/10' : ''}`}>
      <span className={`text-sm truncate ${
        isCompleted
          ? isWinner ? 'font-bold text-emerald-400' : 'text-slate-500'
          : 'text-slate-300'
      }`}>
        {team?.name || 'TBD'}
      </span>
      {score !== null && score !== undefined && (
        <span className={`text-sm font-mono font-bold ml-3 ${
          isWinner ? 'text-emerald-400' : 'text-slate-500'
        }`}>
          {score}
        </span>
      )}
    </div>
  );
}
