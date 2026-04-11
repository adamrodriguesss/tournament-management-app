import { useState } from 'react';
import { redirect, useNavigate, useRevalidator } from 'react-router';
import { getSession, getRoleProfile } from '../../services/auth';
import { getEventRegistrationDetails, getConfirmedRegistrationsByEvent, recordJudgedResults, getEventResults } from '../../services/events';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { AdminLayout } from '../../components/layout/AdminLayout';
import type { Route } from './+types/judged-results';

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const session = await getSession();
  if (!session) return redirect("/login");

  const { data: user } = await getRoleProfile(session.user.id);
  if (!user || !['admin', 'event_manager'].includes(user.role)) return redirect("/");

  const eventId = params.id;
  
  // Fetch event details
  const { data: event } = await supabase.from('events').select('*, tournaments(name)').eq('id', eventId).single();
  if (!event || event.format !== 'judged') return redirect("/admin/tournaments");

  // Fetch confirmed registrations
  const { data: registrations, error: regError } = await getConfirmedRegistrationsByEvent(eventId);

  // Fetch existing results
  const { data: results } = await getEventResults(eventId);

  return { 
    user: { ...user, id: session.user.id },
    event,
    registrations,
    results,
    regError
  };
}

export default function AdminJudgedResults({ loaderData }: { loaderData: any }) {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { user, event, registrations, results, regError } = loaderData;

  // Initialize state from existing results if they exist
  const existing1st = results.find((r: any) => r.position === 1)?.team_id || '';
  const existing2nd = results.find((r: any) => r.position === 2)?.team_id || '';
  const existing3rd = results.find((r: any) => r.position === 3)?.team_id || '';

  const [firstPlace, setFirstPlace] = useState<string>(existing1st);
  const [secondPlace, setSecondPlace] = useState<string>(existing2nd);
  const [thirdPlace, setThirdPlace] = useState<string>(existing3rd);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Formatting options for the dropdowns
  const options = registrations.map((reg: any) => {
    if (event.type === 'team') {
      return {
        label: `${reg.team?.name} (${reg.team?.department})`,
        teamId: reg.team_id
      };
    } else {
      return {
        label: `${reg.participant?.user?.full_name} (${reg.participant?.team?.name})`,
        teamId: reg.participant?.team_id
      };
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validate entries: 1st place is required.
    if (!firstPlace) {
      setError("1st place must be selected.");
      setLoading(false);
      return;
    }

    // Checking for duplicates
    const selected = [firstPlace, secondPlace, thirdPlace].filter(Boolean);
    const unique = new Set(selected);
    if (selected.length !== unique.size) {
      setError("A team cannot hold multiple places in the same event.");
      setLoading(false);
      return;
    }

    const { error: submitError } = await recordJudgedResults({
      p_event_id: event.id,
      p_first_team_id: firstPlace,
      p_second_team_id: secondPlace || null,
      p_third_team_id: thirdPlace || null,
      p_recorded_by: user.id
    });

    if (submitError) {
      setError(submitError.message || "Failed to submit results.");
    } else {
      setSuccess("Results successfully recorded!");
      revalidator.revalidate();
    }
    
    setLoading(false);
  };
return (
  <AdminLayout user={user} activeItem="Event Management" tournamentName={event.tournaments?.name}>
    <div className="mb-4">
      <button onClick={() => navigate(`/admin/tournaments/${event.tournament_id}/events`)}
        className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate hover:text-pixel-gold transition-colors tracking-wide">
        ← BACK
      </button>
    </div>

    <div className="mb-8 border-l-4 border-pixel-gold pl-4 py-1">
      <h1 className="font-[family-name:var(--font-pixel)] text-[11px] text-pixel-gold leading-relaxed tracking-wide">
        {event.name.toUpperCase()} RESULTS
      </h1>
      <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate mt-1">
        {event.tournaments?.name} — Judged Event
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Main Form */}
      <div className="md:col-span-2 space-y-6">
        <div
          className="bg-pixel-card border-[3px] border-pixel-border p-6 relative"
          style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-[3px]"
            style={{ background: 'linear-gradient(90deg, var(--color-pixel-gold), var(--color-pixel-purple))' }}
          />
          <h2 className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-gold mb-5 flex items-center gap-2 leading-relaxed tracking-wide">
            🏆 ENTER RESULTS
          </h2>

          {registrations.length === 0 ? (
            <div className="text-center py-6 bg-pixel-dark border-2 border-pixel-border">
              {regError ? (
                <p className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-red leading-relaxed">
                  Error fetching registrations.
                </p>
              ) : (
                <>
                  <p className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate leading-relaxed mb-2">
                    NO CONFIRMED REGISTRATIONS YET.
                  </p>
                  <p className="font-[family-name:var(--font-vt)] text-[26px] text-pixel-slate">
                    Teams must register before results can be entered.
                  </p>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="border-2 border-pixel-red bg-pixel-red/10 p-3 font-[family-name:var(--font-pixel)] text-[12px] text-pixel-red tracking-wide leading-relaxed">⚠ {error}</div>
              )}
              {success && (
                <div className="border-2 border-pixel-green-dim bg-pixel-green/10 p-3 font-[family-name:var(--font-pixel)] text-[12px] text-pixel-green-dim tracking-wide leading-relaxed">✓ {success}</div>
              )}

              <div className="space-y-3">
                {/* 1st Place */}
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center bg-amber-500/10 border-2 border-amber-500/40 p-4">
                  <div className="sm:w-32 shrink-0">
                    <span className="font-[family-name:var(--font-pixel)] text-[10px] text-amber-400 leading-relaxed">🥇 1ST PLACE</span>
                    <p className="font-[family-name:var(--font-vt)] text-[24px] text-amber-400/70 mt-0.5">{event.points_first} pts</p>
                  </div>
                  <select value={firstPlace} onChange={(e) => setFirstPlace(e.target.value)} required
                    className="flex-1 bg-pixel-black border-[3px] border-pixel-border text-pixel-slate-light font-[family-name:var(--font-vt)] text-[22px] px-3 py-2 outline-none focus:border-amber-500/50 [box-shadow:inset_2px_2px_0_rgba(0,0,0,0.5)]">
                    <option value="">-- Select Winner --</option>
                    {options.map((opt: any) => <option key={opt.teamId} value={opt.teamId}>{opt.label}</option>)}
                  </select>
                </div>

                {/* 2nd Place */}
                {registrations.length >= 2 && (
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-center bg-pixel-slate/10 border-2 border-pixel-slate/30 p-4">
                    <div className="sm:w-32 shrink-0">
                      <span className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate-light leading-relaxed">🥈 2ND PLACE</span>
                      <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate mt-0.5">{event.points_second} pts</p>
                    </div>
                    <select value={secondPlace} onChange={(e) => setSecondPlace(e.target.value)}
                      className="flex-1 bg-pixel-black border-[3px] border-pixel-border text-pixel-slate-light font-[family-name:var(--font-vt)] text-[22px] px-3 py-2 outline-none focus:border-pixel-slate [box-shadow:inset_2px_2px_0_rgba(0,0,0,0.5)]">
                      <option value="">-- Optional --</option>
                      {options.map((opt: any) => <option key={opt.teamId} value={opt.teamId}>{opt.label}</option>)}
                    </select>
                  </div>
                )}

                {/* 3rd Place */}
                {registrations.length >= 3 && (
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-center bg-orange-700/10 border-2 border-orange-700/30 p-4">
                    <div className="sm:w-32 shrink-0">
                      <span className="font-[family-name:var(--font-pixel)] text-[10px] text-orange-400 leading-relaxed">🥉 3RD PLACE</span>
                      <p className="font-[family-name:var(--font-vt)] text-[24px] text-orange-400/70 mt-0.5">{event.points_third} pts</p>
                    </div>
                    <select value={thirdPlace} onChange={(e) => setThirdPlace(e.target.value)}
                      className="flex-1 bg-pixel-black border-[3px] border-pixel-border text-pixel-slate-light font-[family-name:var(--font-vt)] text-[22px] px-3 py-2 outline-none focus:border-orange-500/50 [box-shadow:inset_2px_2px_0_rgba(0,0,0,0.5)]">
                      <option value="">-- Optional --</option>
                      {options.map((opt: any) => <option key={opt.teamId} value={opt.teamId}>{opt.label}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? 'SAVING...' : 'SAVE RESULTS'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Sidebar Info */}
      <div>
        <div
          className="bg-pixel-card border-[3px] border-pixel-border p-6 relative"
          style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-pixel-cyan-dim" />
          <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate-light mb-5 tracking-wide leading-relaxed">
            EVENT INFO
          </h3>
          <div className="space-y-4">
            <div>
              <p className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate uppercase tracking-[2px] mb-1">Status</p>
              <span className="font-[family-name:var(--font-pixel)] text-[12px] px-2 py-1 bg-pixel-green/10 border border-pixel-green-dim text-pixel-green-dim tracking-wide capitalize">
                {event.status.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate uppercase tracking-[2px] mb-1">Format & Type</p>
              <p className="font-[family-name:var(--font-vt)] text-[22px] text-pixel-slate-light capitalize">
                {event.format} · {event.type}
              </p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate uppercase tracking-[2px] mb-1">Registered Teams</p>
              <p className="font-[family-name:var(--font-pixel)] text-[24px] text-pixel-cyan">{registrations.length}</p>
            </div>
          </div>
          <div className="mt-6 pt-5 border-t-2 border-pixel-border">
            <p className="font-[family-name:var(--font-vt)] text-[26px] text-pixel-slate leading-relaxed">
              Judged event results allocate points immediately upon saving. You can correct mistakes anytime by changing selections and saving again.
            </p>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
);
}
