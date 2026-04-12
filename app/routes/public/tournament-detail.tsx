import { useNavigate } from 'react-router';
import { getTournamentWithEvents, getTeamStandingsDetailed } from '../../services/public';
import { getSession } from '../../services/auth';
import { Button } from '../../components/ui/Button';
import { formatToDDMMYY, formatToDDMMYYTime } from '../../lib/utils';
import type { Route } from './+types/tournament-detail';

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const session = await getSession();
  const tournamentId = params.id;
  const { tournament, events, error } = await getTournamentWithEvents(tournamentId);
  const { data: standings } = await getTeamStandingsDetailed(tournamentId);

  if (error || !tournament) {
    return { tournament: null, events: [], standings: [], isLoggedIn: !!session };
  }

  return { tournament, events, standings, isLoggedIn: !!session };
}

export default function TournamentDetail({ loaderData }: { loaderData: any }) {
  const navigate = useNavigate();
  const { tournament, events, standings, isLoggedIn } = loaderData;

  if (!tournament) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Tournament Not Found</h2>
          <Button onClick={() => navigate('/tournaments')}>← View All Tournaments</Button>
        </div>
      </div>
    );
  }

  const statusColor = (s: string) => {
  switch (s) {
    case 'upcoming':          return 'bg-pixel-cyan/10 text-pixel-cyan-dim border-pixel-cyan-dim';
    case 'ongoing':           return 'bg-pixel-green/10 text-pixel-green-dim border-pixel-green-dim';
    case 'completed':         return 'bg-pixel-slate/10 text-pixel-slate border-pixel-border';
    case 'registration_open': return 'bg-pixel-gold/10 text-pixel-gold border-pixel-gold-dark';
    default:                  return 'bg-amber-500/10 text-amber-400 border-amber-500';
  }
};

const formatBadge = (f: string) => {
  switch (f) {
    case 'bracket': return { label: 'Bracket', color: 'bg-pixel-cyan/10 text-pixel-cyan-dim border-pixel-cyan-dim' };
    case 'judged':  return { label: 'Judged',  color: 'bg-pixel-purple/10 text-pixel-purple border-pixel-purple' };
    default:        return { label: f,         color: 'bg-pixel-slate/10 text-pixel-slate border-pixel-border' };
  }
};

  return (
  <div className="min-h-screen bg-pixel-black text-pixel-slate-light flex flex-col">
    {/* Header */}
    <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b-[3px] border-pixel-border bg-pixel-dark">
      <div className="flex items-center gap-4">
        <Button variant="secondary" onClick={() => navigate('/tournaments')}>
          BACK
        </Button>
        <h1 className="font-[family-name:var(--font-pixel)] text-[14px] text-pixel-gold tracking-wider">
          ★ FESTFLOW
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
      {/* Tournament Header */}
      <div className="mb-8 border-l-4 border-pixel-gold pl-4 py-1">
        <h2 className="font-[family-name:var(--font-pixel)] text-[16px] sm:text-[20px] text-pixel-gold leading-relaxed tracking-wide mb-2">
          {tournament.name.toUpperCase()}
        </h2>
        {tournament.description && (
          <p className="text-xl font-[family-name:var(--font-vt)] text-pixel-slate mb-3">
            {tournament.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4 text-lg font-[family-name:var(--font-vt)] text-pixel-slate">
          {tournament.start_date && <span>📅 {formatToDDMMYY(tournament.start_date)}</span>}
          {tournament.end_date && <span>→ {formatToDDMMYY(tournament.end_date)}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events List */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-[2px] w-4 bg-pixel-cyan-dim opacity-60" />
            <h3 className="font-[family-name:var(--font-pixel)] text-[13px] text-pixel-cyan-dim tracking-wider">
              📋 EVENTS
            </h3>
          </div>

          {events.length === 0 ? (
            <div
              className="bg-pixel-card border-[3px] border-pixel-border p-6 text-center"
              style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
            >
              <p className="text-xl font-[family-name:var(--font-vt)] text-pixel-slate">
                No events have been created yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event: any) => {
                const fmt = formatBadge(event.format);
                const isEnded = event.status === 'completed' || (event.scheduled_at && new Date(event.scheduled_at) < new Date());

                return (
                  <div
                    key={event.id}
                    onClick={() => navigate(`/tournaments/${tournament.id}/events/${event.id}`)}
                    className={`bg-pixel-card border-[3px] border-pixel-border p-4 sm:p-5 cursor-pointer relative
                      transition-transform duration-100 group
                      ${isEnded ? 'opacity-60' : 'hover:-translate-x-0.5 hover:-translate-y-0.5'}`}
                    style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
                  >
                    <div className={`absolute top-0 left-0 right-0 h-[2px] opacity-50 ${isEnded ? 'bg-slate-600' : 'bg-pixel-purple'}`} />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex flex-col gap-1">
                        {isEnded && (
                          <span className="font-[family-name:var(--font-pixel)] text-[8px] text-slate-500 tracking-wider">
                            ✓ CONCLUDED
                          </span>
                        )}
                        <h4 className={`font-[family-name:var(--font-pixel)] text-[12px]
                          ${isEnded ? 'text-pixel-slate' : 'text-pixel-slate-light group-hover:text-pixel-gold transition-colors'}
                          leading-relaxed tracking-wide`}>
                          {event.name.toUpperCase()}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-[family-name:var(--font-pixel)] text-[9px] px-2 py-0.5 border tracking-wide ${fmt.color}`}>
                          {fmt.label.toUpperCase()}
                        </span>
                        <span className={`font-[family-name:var(--font-pixel)] text-[9px] px-2 py-0.5 border capitalize tracking-wide ${statusColor(event.status)}`}>
                          {event.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {event.description && (
                      <p className="text-lg font-[family-name:var(--font-vt)] text-pixel-slate mb-2 line-clamp-1">
                        {event.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-lg font-[family-name:var(--font-vt)] text-pixel-slate">
                      <span className="capitalize">📌 {event.type}</span>
                      {event.venue && <span>📍 {event.venue}</span>}
                      {event.scheduled_at && <span>🕐 {formatToDDMMYYTime(event.scheduled_at)}</span>}
                      <span>🏅 {event.points_first}/{event.points_second}/{event.points_third} pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Standings */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-[2px] w-4 bg-pixel-gold opacity-60" />
            <h3 className="font-[family-name:var(--font-pixel)] text-[13px] text-pixel-gold tracking-wider">
              🏆 STANDINGS
            </h3>
          </div>

          {standings.length === 0 ? (
            <div
              className="bg-pixel-card border-[3px] border-pixel-border p-6 text-center"
              style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
            >
              <p className="text-xl font-[family-name:var(--font-vt)] text-pixel-slate">
                No results recorded yet.
              </p>
            </div>
          ) : (
            <div
              className="bg-pixel-card border-[3px] border-pixel-border overflow-hidden"
              style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
            >
              {standings.map((team: any, idx: number) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`;
                const isTop3 = idx < 3;
                return (
                  <div
                    key={team.id}
                    className={`flex items-center gap-3 px-4 py-3 border-b-2 border-pixel-border last:border-0
                      ${isTop3 ? 'bg-pixel-dark' : ''}`}
                  >
                    <span className={`text-xl w-8 text-center shrink-0 ${!isTop3 ? 'font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate' : ''}`}>
                      {medal}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-[family-name:var(--font-pixel)] text-[10px] truncate leading-relaxed
                        ${isTop3 ? 'text-pixel-slate-light' : 'text-pixel-slate'}`}>
                        {team.name}
                      </p>
                      <p className="text-lg font-[family-name:var(--font-vt)] text-pixel-slate truncate">
                        {team.department}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-[family-name:var(--font-pixel)] text-[11px] leading-relaxed
                        ${isTop3 ? 'text-pixel-gold' : 'text-pixel-slate'}`}>
                        {team.totalPoints} PTS
                      </p>
                      <div className="flex items-center justify-end gap-1.5 text-base font-[family-name:var(--font-vt)] text-pixel-slate">
                        {team.golds > 0 && <span>🥇{team.golds}</span>}
                        {team.silvers > 0 && <span>🥈{team.silvers}</span>}
                        {team.bronzes > 0 && <span>🥉{team.bronzes}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  </div>
);
}
