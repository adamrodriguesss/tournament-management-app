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
        <button onClick={() => navigate(`/admin/tournaments/${event.tournament_id}/events`)} className="text-slate-400 hover:text-slate-50 text-sm transition-colors inline-block font-medium">
          ←
        </button>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">{event.name} Results</h1>
        <p className="text-slate-400 mt-1">{event.tournaments?.name} — Judged Event</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <span className="text-2xl">🏆</span> Enter Results
            </h2>
            
            {registrations.length === 0 ? (
              <div className="text-center py-6 bg-slate-900/50 rounded-lg border border-slate-700/50">
                {regError ? (
                  <p className="text-red-400">Error fetching registrations: {JSON.stringify(regError)}</p>
                ) : (
                  <>
                    <p className="text-slate-400">No confirmed registrations yet.</p>
                    <p className="text-sm text-slate-500 mt-1">Teams must register before results can be entered.</p>
                  </>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-sm text-red-400 font-medium">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg text-sm text-emerald-400 font-medium">
                    {success}
                  </div>
                )}

                <div className="space-y-4">
                  {/* 1st Place — always shown */}
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-center bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
                    <div className="sm:w-32 shrink-0">
                      <span className="font-bold text-amber-500">🥇 1st Place</span>
                      <p className="text-xs text-amber-500/70 mt-0.5">{event.points_first} pts</p>
                    </div>
                    <select
                      value={firstPlace}
                      onChange={(e) => setFirstPlace(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-amber-500/50"
                      required
                    >
                      <option value="">-- Select Winner --</option>
                      {options.map((opt: any) => (
                        <option key={opt.teamId} value={opt.teamId}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* 2nd Place — shown only when 2+ registrations */}
                  {registrations.length >= 2 && (
                    <div className="flex flex-col sm:flex-row gap-4 sm:items-center bg-slate-400/10 border border-slate-400/20 p-4 rounded-lg">
                      <div className="sm:w-32 shrink-0">
                        <span className="font-bold text-slate-300">🥈 2nd Place</span>
                        <p className="text-xs text-slate-400/70 mt-0.5">{event.points_second} pts</p>
                      </div>
                      <select
                        value={secondPlace}
                        onChange={(e) => setSecondPlace(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-slate-400/50"
                      >
                        <option value="">-- Optional --</option>
                        {options.map((opt: any) => (
                          <option key={opt.teamId} value={opt.teamId}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 3rd Place — shown only when 3+ registrations */}
                  {registrations.length >= 3 && (
                    <div className="flex flex-col sm:flex-row gap-4 sm:items-center bg-orange-700/10 border border-orange-700/20 p-4 rounded-lg">
                      <div className="sm:w-32 shrink-0">
                        <span className="font-bold text-orange-400">🥉 3rd Place</span>
                        <p className="text-xs text-orange-400/70 mt-0.5">{event.points_third} pts</p>
                      </div>
                      <select
                        value={thirdPlace}
                        onChange={(e) => setThirdPlace(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-orange-500/50"
                      >
                        <option value="">-- Optional --</option>
                        {options.map((opt: any) => (
                          <option key={opt.teamId} value={opt.teamId}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" variant="primary" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Results'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-slate-300">Event Info</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Status</p>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-emerald-500/10 text-emerald-500 border-emerald-500/20 capitalize">
                  {event.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Format & Type</p>
                <p className="text-sm text-slate-300 capitalize">{event.format} • {event.type}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Registered Teams</p>
                <p className="text-sm text-slate-300">{registrations.length} total</p>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-700/50">
              <p className="text-sm text-slate-400">
                Judged event results allocate points immediately upon saving. 
                You can correct mistakes anytime by simply changing the selections and saving again.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
