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
  if (!user || user.role !== "admin") return redirect("/");

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
        <button onClick={() => navigate(`/admin/tournaments/${event.tournament_id}/events`)} className="text-slate-400 hover:text-slate-50 text-sm transition-colors inline-block font-medium">
          ←
        </button>
      </div>

      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{event.name} Bracket</h1>
          <p className="text-slate-400 mt-1">{event.tournaments?.name} — Single Elimination</p>
        </div>
        
        {matches.length === 0 && (
          <Button variant="primary" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating...' : '⚡ Generate Bracket'}
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-sm text-red-500 font-medium">
          {error}
        </div>
      )}

      {matches.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <span className="text-5xl mb-4 block opacity-50">🏆</span>
          <h3 className="text-xl font-semibold mb-2">Bracket Not Generated</h3>
          <p className="text-slate-400 max-w-md mx-auto mb-6 text-sm">
            Teams must be fully registered and confirmed before generating the bracket. Once generated, the setup is permanent!
          </p>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 overflow-x-auto min-h-[500px]">
          <div className="flex gap-12 min-w-max">
            {rounds.map((round: any) => {
              const roundMatches = matches.filter((m: any) => m.round_number === round);
              const isFinal = roundMatches.length === 1 && round === rounds[rounds.length - 1];

              return (
                <div key={round} className="flex flex-col gap-6 w-64 shrink-0 justify-around">
                  <h3 className="text-center font-bold text-slate-400 uppercase tracking-widest text-xs mb-2">
                    {isFinal ? 'Final' : `Round ${round}`}
                  </h3>
                  
                  {roundMatches.map((match: any, index: number) => (
                    <div 
                      key={match.id} 
                      className={`
                        border rounded-lg overflow-hidden flex flex-col transition-colors
                        ${match.status === 'completed' ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-slate-700 bg-slate-900'}
                        ${match.team_a_id && match.team_b_id && match.status !== 'completed' ? 'cursor-pointer hover:border-slate-500' : ''}
                      `}
                      onClick={() => openScoreModal(match)}
                    >
                      {/* Team A */}
                      <div className={`p-3 flex justify-between items-center border-b border-slate-800 ${match.winner_id === match.team_a_id ? 'bg-indigo-500/10 text-indigo-400 font-bold' : 'text-slate-300'}`}>
                        <span className="truncate pr-2 text-sm">{match.team_a?.name || <span className="text-slate-600 italic">TBD</span>}</span>
                        <span className="font-mono">{match.score_a ?? '-'}</span>
                      </div>
                      
                      {/* Team B */}
                      <div className={`p-3 flex justify-between items-center ${match.winner_id === match.team_b_id ? 'bg-indigo-500/10 text-indigo-400 font-bold' : 'text-slate-300'}`}>
                        <span className="truncate pr-2 text-sm">{match.team_b?.name || <span className="text-slate-600 italic">TBD</span>}</span>
                        <span className="font-mono">{match.score_b ?? '-'}</span>
                      </div>
                      
                      {/* Bye Indicator */}
                      {match.status === 'completed' && (!match.team_a_id || !match.team_b_id) && (
                        <div className="p-1.5 text-[10px] text-center bg-slate-800 text-slate-500 uppercase tracking-widest font-bold">
                          Automatic Bye
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Record Match Score</h3>
            
            <form onSubmit={handleScoreSubmit}>
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between gap-4">
                  <label className="text-sm font-medium text-slate-300 truncate w-32">
                    {selectedMatch.team_a?.name}
                  </label>
                  <input
                    type="number"
                    value={scoreA}
                    onChange={(e) => setScoreA(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-50 text-center font-mono focus:outline-none focus:border-indigo-500"
                    required
                    min={0}
                  />
                </div>
                
                <div className="flex items-center justify-between gap-4">
                  <label className="text-sm font-medium text-slate-300 truncate w-32">
                    {selectedMatch.team_b?.name}
                  </label>
                  <input
                    type="number"
                    value={scoreB}
                    onChange={(e) => setScoreB(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-50 text-center font-mono focus:outline-none focus:border-indigo-500"
                    required
                    min={0}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="secondary" fullWidth onClick={() => setSelectedMatch(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" fullWidth disabled={submittingScore}>
                  {submittingScore ? 'Saving...' : 'Save Results'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
