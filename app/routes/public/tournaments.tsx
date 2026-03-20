import { useNavigate } from 'react-router';
import { getPublicTournaments } from '../../services/public';
import { getSession } from '../../services/auth';
import { Button } from '../../components/ui/Button';

export async function clientLoader() {
  const session = await getSession();
  const { data: tournaments } = await getPublicTournaments();
  return { tournaments, isLoggedIn: !!session };
}

export default function PublicTournaments({ loaderData }: { loaderData: any }) {
  const navigate = useNavigate();
  const { tournaments, isLoggedIn } = loaderData;

  const statusColor = (s: string) => {
    switch (s) {
      case 'registration_open': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'ongoing': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'completed': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default: return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
  };

  const statusLabel = (s: string) => s.replace(/_/g, ' ');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex flex-col">
      {/* Public Header */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-slate-800 bg-slate-950">
        <h1 className="text-xl font-bold text-indigo-400">FestFlow</h1>
        <Button
          variant={isLoggedIn ? 'primary' : 'secondary'}
          onClick={() => navigate(isLoggedIn ? '/' : '/login')}
        >
          {isLoggedIn ? 'Go to Dashboard' : 'Sign In'}
        </Button>
      </header>

      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full">
        {/* Hero */}
        <div className="text-center mb-10 pt-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            University Tournaments
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Explore live brackets, results, and team standings across all university events.
          </p>
        </div>

        {/* Tournament Cards */}
        {tournaments.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
            <span className="text-4xl mb-4 block">🏆</span>
            <h3 className="text-lg font-semibold mb-1">No Tournaments Yet</h3>
            <p className="text-slate-400 text-sm">Check back later for upcoming tournaments.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tournaments.map((t: any) => (
              <div
                key={t.id}
                onClick={() => navigate(`/tournaments/${t.id}`)}
                className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-indigo-500/50 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-lg font-bold group-hover:text-indigo-400 transition-colors">{t.name}</h3>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize shrink-0 ${statusColor(t.status)}`}>
                    {statusLabel(t.status)}
                  </span>
                </div>
                {t.description && (
                  <p className="text-sm text-slate-400 mb-4 line-clamp-2">{t.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  {t.start_date && <span>📅 {new Date(t.start_date).toLocaleDateString()}</span>}
                  {t.end_date && <span>→ {new Date(t.end_date).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
