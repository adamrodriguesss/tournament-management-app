import { useNavigate } from 'react-router';
import { getTournamentWithEvents, getTeamStandingsDetailed } from '../../services/public';
import { getSession } from '../../services/auth';
import { Button } from '../../components/ui/Button';
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
      case 'upcoming': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'ongoing': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'completed': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default: return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
  };

  const formatBadge = (f: string) => {
    switch (f) {
      case 'bracket': return { label: 'Bracket', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'judged': return { label: 'Judged', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      default: return { label: f, color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/tournaments')} className="text-slate-400 hover:text-white transition-colors font-medium">←</button>
          <h1 className="text-xl font-bold text-indigo-400">FestFlow</h1>
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
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">{tournament.name}</h2>
          {tournament.description && (
            <p className="text-slate-400 mb-3">{tournament.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            {tournament.start_date && <span>📅 {new Date(tournament.start_date).toLocaleDateString()}</span>}
            {tournament.end_date && <span>→ {new Date(tournament.end_date).toLocaleDateString()}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Events List — takes 2 cols */}
          <div className="lg:col-span-2">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>📋</span> Events
            </h3>
            {events.length === 0 ? (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
                <p className="text-slate-400 text-sm">No events have been created yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event: any) => {
                  const fmt = formatBadge(event.format);
                  return (
                    <div
                      key={event.id}
                      onClick={() => navigate(`/tournaments/${tournament.id}/events/${event.id}`)}
                      className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-5 hover:border-indigo-500/50 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <h4 className="font-semibold group-hover:text-indigo-400 transition-colors">{event.name}</h4>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${fmt.color}`}>
                            {fmt.label}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${statusColor(event.status)}`}>
                            {event.status}
                          </span>
                        </div>
                      </div>
                      {event.description && (
                        <p className="text-sm text-slate-400 mb-2 line-clamp-1">{event.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="capitalize">📌 {event.type}</span>
                        {event.venue && <span>📍 {event.venue}</span>}
                        {event.scheduled_at && <span>🕐 {new Date(event.scheduled_at).toLocaleString()}</span>}
                        <span>🏅 {event.points_first}/{event.points_second}/{event.points_third} pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Leaderboard — takes 1 col */}
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>🏆</span> Standings
            </h3>
            {standings.length === 0 ? (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
                <p className="text-slate-400 text-sm">No results recorded yet.</p>
              </div>
            ) : (
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                {standings.map((team: any, idx: number) => {
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`;
                  const isTop3 = idx < 3;
                  return (
                    <div
                      key={team.id}
                      className={`flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 last:border-0 ${isTop3 ? 'bg-slate-800' : ''}`}
                    >
                      <span className={`text-lg w-8 text-center shrink-0 ${!isTop3 ? 'text-slate-500 text-sm font-mono' : ''}`}>
                        {medal}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isTop3 ? 'text-slate-50' : 'text-slate-300'}`}>
                          {team.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{team.department}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${isTop3 ? 'text-indigo-400' : 'text-slate-400'}`}>
                          {team.totalPoints} pts
                        </p>
                        <div className="flex items-center justify-end gap-1.5 text-xs text-slate-500">
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
