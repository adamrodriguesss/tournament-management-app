import { useState } from 'react';
import { redirect, useNavigate, useRevalidator } from 'react-router';
import { getSession, getRoleProfile } from '../../services/auth';
import { getMatchesByEvent, generateBracket, recordMatchScore } from '../../services/bracket';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Bracket } from '../../components/ui/Bracket';
import { AdminLayout } from '../../components/layout/AdminLayout';
import type { Route } from './+types/bracket';

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const session = await getSession();
  if (!session) return redirect("/login");

  const { data: user } = await getRoleProfile(session.user.id);
  if (!user || !['admin', 'event_manager'].includes(user.role)) return redirect("/");

  const eventId = params.id;

  // Fetch event details
  const { data: event } = await supabase.from('events').select('*, tournaments(name)').eq('id', eventId).single();
  if (!event || event.format !== 'bracket') return redirect("/admin/tournaments");

  if (user.role === 'event_manager' && event.assigned_to !== session.user.id) {
    return redirect("/event-manager");
  }

  // Fetch matches
  const { data: matches } = await getMatchesByEvent(eventId);

  return {
    user: { ...user, id: session.user.id },
    event,
    matches
  };
}

export default function AdminBracket({ loaderData }: { loaderData: any }) {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { user, event, matches } = loaderData;

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Score Modal State
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [scoreA, setScoreA] = useState<number | ''>('');
  const [scoreB, setScoreB] = useState<number | ''>('');
  const [submittingScore, setSubmittingScore] = useState(false);

  const rounds = Array.from(new Set(matches.map((m: any) => m.round_number))).sort();

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    const { error: genErr } = await generateBracket(event.id, user.id);
    if (genErr) {
      setError(genErr.message);
    } else {
      revalidator.revalidate();
    }
    setGenerating(false);
  };

  const openScoreModal = (match: any) => {
    // Only allow scoring if both teams exist
    if (!match.team_a_id || !match.team_b_id) return;

    setSelectedMatch(match);
    setScoreA(match.score_a !== null ? match.score_a : '');
    setScoreB(match.score_b !== null ? match.score_b : '');
  };

  const handleScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (scoreA === '' || scoreB === '') return;
    if (scoreA === scoreB) {
      alert("A match cannot end in a tie in a single elimination bracket.");
      return;
    }

    setSubmittingScore(true);
    const { error: scoreErr } = await recordMatchScore(selectedMatch.id, Number(scoreA), Number(scoreB), user.id);
    if (scoreErr) {
      alert(scoreErr.message);
    } else {
      setSelectedMatch(null);
      revalidator.revalidate();
    }
    setSubmittingScore(false);
  };

  return (
    <AdminLayout user={user} activeItem="Event Management" tournamentName={event.tournaments?.name}>
      <div className="mb-4">
        {user.role === 'event_manager' ? (
          <div className="mb-4">
            <Button variant="secondary" onClick={() => navigate('/event-manager')}>
              BACK
            </Button>
          </div>
        ) : (
          <div className="mb-4">
            <Button variant="secondary" onClick={() => navigate(`/admin/tournaments/${event.tournament_id}/events`)}>
              BACK
            </Button>
          </div>
        )}
      </div>

      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="border-l-4 border-pixel-gold pl-4 py-1">
          <h1 className="font-[family-name:var(--font-pixel)] text-[11px] text-pixel-gold leading-relaxed tracking-wide">
            {event.name.toUpperCase()} BRACKET
          </h1>
          <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate mt-1">
            {event.tournaments?.name} — Single Elimination
          </p>
        </div>
        {matches.length === 0 && (
          <Button variant="primary" onClick={handleGenerate} disabled={generating}>
            {generating ? 'GENERATING...' : 'GENERATE BRACKET'}
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-6 border-2 border-pixel-red bg-pixel-red/10 p-4 font-[family-name:var(--font-pixel)] text-[12px] text-pixel-red tracking-wide leading-relaxed">
          ⚠ {error}
        </div>
      )}

      {matches.length === 0 ? (
        <div className="bg-pixel-card border-[3px] border-pixel-border p-12 text-center" style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}>
          <span className="text-5xl mb-4 block opacity-30">🏆</span>
          <h3 className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate-light mb-3 leading-relaxed">
            BRACKET NOT GENERATED
          </h3>
          <p className="font-[family-name:var(--font-vt)] text-[22px] text-pixel-slate max-w-md mx-auto">
            Teams must be fully registered and confirmed before generating the bracket. Once generated, the setup is permanent!
          </p>
        </div>
      ) : (
        <div
          className="bg-pixel-card border-[3px] border-pixel-border p-6 overflow-hidden"
          style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
        >
          <Bracket matches={matches} onMatchClick={openScoreModal} />
        </div>
      )}

      {/* Score Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pixel-black/85">
          <div
            className="bg-pixel-panel border-[3px] border-pixel-border p-6 w-full max-w-sm relative"
            style={{ boxShadow: '5px 5px 0 var(--color-pixel-border)' }}
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-pixel-gold" />
            <h3 className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-gold mb-5 leading-relaxed tracking-wide">
              RECORD MATCH SCORE
            </h3>

            <form onSubmit={handleScoreSubmit}>
              {selectedMatch.status === 'completed' && (
                <div className="mb-4 border-2 border-amber-500 bg-amber-500/10 p-2 font-[family-name:var(--font-pixel)] text-[10px] text-amber-500 tracking-wide leading-relaxed">
                  ⚠ EDITING PAST MATCH: If the winner changes, any downstream matches they played in will be reset!
                </div>
              )}
              <div className="space-y-4 mb-6">
                {[
                  { label: selectedMatch.team_a?.name, value: scoreA, set: setScoreA },
                  { label: selectedMatch.team_b?.name, value: scoreB, set: setScoreB },
                ].map(({ label, value, set }) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <label className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate-light truncate w-32 leading-relaxed">
                      {label}
                    </label>
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-20 bg-pixel-black border-[3px] border-pixel-border text-pixel-cyan text-center font-[family-name:var(--font-pixel)] text-[24px] py-2 outline-none focus:border-pixel-cyan-dim [box-shadow:inset_2px_2px_0_rgba(0,0,0,0.5)]"
                      required min={0}
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="danger" fullWidth onClick={() => setSelectedMatch(null)}>
                  CANCEL
                </Button>
                <Button type="submit" variant="primary" fullWidth disabled={submittingScore}>
                  {submittingScore ? 'SAVING...' : 'SAVE RESULTS'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
