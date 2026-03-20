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
      <div className="min-h-screen bg-slate-900 text-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Event Not Found</h2>
          <Button onClick={() => navigate('/tournaments')}>← View Tournaments</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/tournaments/${tournamentId}`)} className="text-slate-400 hover:text-white transition-colors font-medium">←</button>
          <h1 className="text-xl font-bold text-indigo-400">{event.tournaments?.name || 'FestFlow'}</h1>
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
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold">{event.name}</h2>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
              event.format === 'bracket'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
            }`}>
              {event.format === 'bracket' ? '🏆 Bracket' : '⭐ Judged'}
            </span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${
              event.status === 'ongoing' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
              event.status === 'completed' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' :
              'bg-amber-500/10 text-amber-500 border-amber-500/20'
            }`}>
              {event.status}
            </span>
          </div>
          {event.description && <p className="text-slate-400 mb-3">{event.description}</p>}
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="capitalize">📌 {event.type} event</span>
            {event.venue && <span>📍 {event.venue}</span>}
            {event.scheduled_at && <span>🕐 {new Date(event.scheduled_at).toLocaleString()}</span>}
            <span>🏅 {event.points_first}/{event.points_second}/{event.points_third} pts</span>
          </div>
        </div>

        {/* Results Section (for both bracket and judged) */}
        {results.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">🏅 Results</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {results.map((r: any) => {
                const medal = r.position === 1 ? '🥇' : r.position === 2 ? '🥈' : '🥉';
                const borderColor = r.position === 1
                  ? 'border-yellow-500/40 bg-yellow-500/5'
                  : r.position === 2
                    ? 'border-slate-300/30 bg-slate-300/5'
                    : 'border-amber-700/30 bg-amber-700/5';
                return (
                  <div key={r.id} className={`border rounded-xl p-5 text-center ${borderColor}`}>
                    <span className="text-4xl block mb-2">{medal}</span>
                    <p className="font-bold text-lg mb-1">{r.team?.name || 'TBD'}</p>
                    <p className="text-xs text-slate-400 mb-2">{r.team?.department}</p>
                    <p className="text-sm font-semibold text-indigo-400">{r.points_awarded} pts</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bracket Visualization */}
        {event.format === 'bracket' && matches.length > 0 && (
          <div>
            <h3 className="text-xl font-bold mb-4">🏆 Bracket</h3>
            <BracketView matches={matches} />
          </div>
        )}

        {/* Empty State */}
        {results.length === 0 && matches.length === 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
            <span className="text-4xl mb-4 block">⏳</span>
            <h3 className="text-lg font-semibold mb-1">Awaiting Results</h3>
            <p className="text-slate-400 text-sm">Scores and results haven't been entered for this event yet.</p>
          </div>
        )}
      </main>
    </div>
  );
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
