import { useNavigate } from 'react-router';
import { getPublicEvent, getPublicMatches, getPublicEventResults } from '../../services/public';
import { getSession } from '../../services/auth';
import { Button } from '../../components/ui/Button';
import { Bracket } from '../../components/ui/Bracket';
import { formatToDDMMYYTime } from '../../lib/utils';
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
        <Button variant="secondary" onClick={() => navigate(`/tournaments/${tournamentId}`)}>
          BACK
        </Button>
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
          {event.scheduled_at && <span>🕐 {formatToDDMMYYTime(event.scheduled_at)}</span>}
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
          <div className="bg-pixel-card border-[3px] border-pixel-border overload-hidden" style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}>
            <Bracket matches={matches} isReadOnly={true} />
          </div>
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
}
