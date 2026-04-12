import { useNavigate } from 'react-router';
import { getPublicTournaments } from '../../services/public';
import { getSession } from '../../services/auth';
import { autoCompleteExpired } from '../../services/tournaments';
import { Button } from '../../components/ui/Button';
import { formatToDDMMYY } from '../../lib/utils';

export async function clientLoader() {
  const session = await getSession();
  await autoCompleteExpired();
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
  <div className="min-h-screen bg-pixel-black text-pixel-slate-light flex flex-col">
    {/* Header */}
    <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b-[3px] border-pixel-border bg-pixel-dark">
      <div className="flex items-center gap-3">
        <h1 className="font-[family-name:var(--font-pixel)] text-[15px] text-pixel-gold tracking-wider">
          ★ FESTFLOW
        </h1>
      </div>
      <Button
        variant={isLoggedIn ? 'primary' : 'secondary'}
        onClick={() => navigate(isLoggedIn ? '/' : '/login')}
      >
        {isLoggedIn ? 'Go to Dashboard' : 'Sign In'}
      </Button>
    </header>

    <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
      {/* Hero */}
      <div className="text-center mb-10 pt-6">
        <div className="flex items-center gap-3 justify-center mb-4">
          <div className="h-[2px] w-12 bg-pixel-gold opacity-40" />
          <h2 className="font-[family-name:var(--font-pixel)] text-[18px] md:text-[22px] text-pixel-gold tracking-wider leading-relaxed">
            UNIVERSITY TOURNAMENTS
          </h2>
          <div className="h-[2px] w-12 bg-pixel-gold opacity-40" />
        </div>
        <p className="text-xl text-pixel-slate max-w-xl mx-auto font-[family-name:var(--font-vt)]">
          Explore live brackets, results, and team standings across all university events.
        </p>
      </div>

      {/* Tournament Cards */}
      {tournaments.length === 0 ? (
        <div
          className="bg-pixel-card border-[3px] border-pixel-border p-12 text-center"
          style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
        >
          <span className="text-5xl mb-4 block opacity-40">🏆</span>
          <h3 className="font-[family-name:var(--font-pixel)] text-[14px] text-pixel-slate-light mb-2 leading-relaxed">
            NO TOURNAMENTS YET
          </h3>
          <p className="text-xl text-pixel-slate font-[family-name:var(--font-vt)]">
            Check back later for upcoming tournaments.
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tournaments.map((t: any) => {
            const isEnded = t.status === 'completed' || (t.end_date && new Date(t.end_date) < new Date());
            return (
            <div
              key={t.id}
              onClick={() => navigate(`/tournaments/${t.id}`)}
              className={`bg-pixel-card border-[3px] border-pixel-border p-6 cursor-pointer relative
                transition-transform duration-100 group
                ${isEnded ? 'opacity-60' : 'hover:-translate-x-0.5 hover:-translate-y-0.5'}`}
              style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: isEnded
                  ? 'linear-gradient(90deg, #64748b, #475569)'
                  : 'linear-gradient(90deg, var(--color-pixel-gold), var(--color-pixel-purple))' }}
              />

              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex flex-col gap-1">
                  {isEnded && (
                    <span className="font-[family-name:var(--font-pixel)] text-[8px] text-slate-500 tracking-wider">
                      ✓ CONCLUDED
                    </span>
                  )}
                  <h3 className={`font-[family-name:var(--font-pixel)] text-[13px]
                    leading-relaxed tracking-wide
                    ${isEnded ? 'text-pixel-slate' : 'text-pixel-slate-light group-hover:text-pixel-gold transition-colors'}`}>
                    {t.name.toUpperCase()}
                  </h3>
                </div>
                <span className={`font-[family-name:var(--font-pixel)] text-[10px] px-3 py-1 border-2 shrink-0 tracking-wide leading-relaxed ${statusColor(t.status)}`}>
                  {statusLabel(t.status).toUpperCase()}
                </span>
              </div>

              {t.description && (
                <p className="text-xl font-[family-name:var(--font-vt)] text-pixel-slate mb-4 line-clamp-2">
                  {t.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-lg font-[family-name:var(--font-vt)] text-pixel-slate border-t-2 border-pixel-border pt-3 mt-3">
                {t.start_date && <span>📅 {formatToDDMMYY(t.start_date)}</span>}
                {t.end_date && <span>→ {formatToDDMMYY(t.end_date)}</span>}
              </div>
            </div>
          );
          })}
        </div>
      )}
    </main>
  </div>
);
}
