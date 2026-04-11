import { useState } from 'react';
import { redirect, useNavigate, useRevalidator } from 'react-router';
import { getSession, getRoleProfile } from '../../services/auth';
import { getMatchesByEvent, generateBracket, recordMatchScore } from '../../services/bracket';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
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
    if (match.status === 'completed') return;

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
      <button onClick={() => navigate(`/admin/tournaments/${event.tournament_id}/events`)}
        className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate hover:text-pixel-gold transition-colors tracking-wide">
        ← BACK
      </button>
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
          {generating ? 'GENERATING...' : '⚡ GENERATE BRACKET'}
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
        className="bg-pixel-card border-[3px] border-pixel-border p-6 overflow-x-auto min-h-[500px]"
        style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
      >
        <div className="flex gap-10 min-w-max">
          {rounds.map((round: any) => {
            const roundMatches = matches.filter((m: any) => m.round_number === round);
            const isFinal = roundMatches.length === 1 && round === rounds[rounds.length - 1];

            return (
              <div key={round} className="flex flex-col gap-6 w-60 shrink-0 justify-around">
                <h3 className="text-center font-[family-name:var(--font-pixel)] text-[10px] text-pixel-gold uppercase tracking-[3px] mb-2">
                  {isFinal ? '★ FINAL ★' : `ROUND ${round}`}
                </h3>

                {roundMatches.map((match: any) => (
                  <div
                    key={match.id}
                    className={`
                      border-[3px] overflow-hidden flex flex-col transition-all
                      ${match.status === 'completed'
                        ? 'border-pixel-cyan-dim bg-pixel-cyan/5'
                        : 'border-pixel-border bg-pixel-dark'}
                      ${match.team_a_id && match.team_b_id && match.status !== 'completed'
                        ? 'cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-pixel-slate'
                        : ''}
                    `}
                    style={{ boxShadow: '2px 2px 0 var(--color-pixel-border)' }}
                    onClick={() => openScoreModal(match)}
                  >
                    {/* Team A */}
                    <div className={`p-3 flex justify-between items-center border-b-2 border-pixel-border
                      ${match.winner_id === match.team_a_id
                        ? 'bg-pixel-gold/10 text-pixel-gold'
                        : 'text-pixel-slate-light'}
                    `}>
                      <span className="font-[family-name:var(--font-vt)] text-[26px] truncate pr-2">
                        {match.team_a?.name || <span className="text-pixel-border italic">TBD</span>}
                      </span>
                      <span className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-cyan">
                        {match.score_a ?? '-'}
                      </span>
                    </div>

                    {/* Team B */}
                    <div className={`p-3 flex justify-between items-center
                      ${match.winner_id === match.team_b_id
                        ? 'bg-pixel-gold/10 text-pixel-gold'
                        : 'text-pixel-slate-light'}
                    `}>
                      <span className="font-[family-name:var(--font-vt)] text-[26px] truncate pr-2">
                        {match.team_b?.name || <span className="text-pixel-border italic">TBD</span>}
                      </span>
                      <span className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-cyan">
                        {match.score_b ?? '-'}
                      </span>
                    </div>

                    {/* Bye */}
                    {match.status === 'completed' && (!match.team_a_id || !match.team_b_id) && (
                      <div className="p-1.5 text-center bg-pixel-black border-t-2 border-pixel-border">
                        <span className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate tracking-[2px]">
                          AUTO BYE
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
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
              <Button type="button" variant="secondary" fullWidth onClick={() => setSelectedMatch(null)}>
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
