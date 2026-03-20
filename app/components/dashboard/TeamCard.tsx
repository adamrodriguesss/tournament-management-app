import { useState } from 'react';
import { useRevalidator } from 'react-router';
import { approveParticipant, rejectParticipant } from '../../services/participants';
import { Button } from '../ui/Button';

export function TeamCard({ participation, team, tournament, pendingMembers, profile, events, eventRegistrations, onRegisterTeam }: any) {
  const revalidator = useRevalidator();
  const [showEvents, setShowEvents] = useState(false);

  // Filter events for this tournament
  const teamEvents = events.filter((e: any) => e.tournament_id === tournament.id && e.type === 'team');
  const teamRegistrations = eventRegistrations.filter((er: any) => er.team_id === team.id);

  const teamPendingMembers = pendingMembers.filter((m: any) => m.team_id === team.id);

  const handleApprove = async (id: string) => {
    await approveParticipant(id, profile.id);
    revalidator.revalidate();
  };

  const handleReject = async (id: string) => {
    await rejectParticipant(id);
    revalidator.revalidate();
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold">{team.name}</h3>
          <p className="text-xs text-slate-400">{tournament.name}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border w-fit ${team.status === 'confirmed'
          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
          : team.status === 'disqualified'
            ? 'bg-red-500/10 text-red-500 border-red-500/20'
            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
          }`}>
          Team: {team.status}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Your Role</p>
          <p className="capitalize">{participation.role_in_team}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Your Status</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${participation.status === 'confirmed'
            ? 'bg-emerald-500/10 text-emerald-500'
            : participation.status === 'rejected'
              ? 'bg-red-500/10 text-red-500'
              : 'bg-amber-500/10 text-amber-500'
            }`}>
            {participation.status}
          </span>
        </div>

        {participation.role_in_team === 'captain' && (
          <div className="col-span-2 mt-2 space-y-6">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Team Join Code</p>
              <code className="bg-slate-950 px-3 py-1.5 rounded text-indigo-400 font-mono text-sm inline-block tracking-widest">{team.registration_token}</code>
              <p className="text-xs text-slate-500 mt-1">Share this code with your teammates to let them join.</p>
            </div>

            {/* Event Management Section */}
            {team.status === 'confirmed' && teamEvents.length > 0 && (
              <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/50">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-slate-300">Team Events</h4>
                  <button onClick={() => setShowEvents(!showEvents)} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    {showEvents ? 'Hide Events' : 'Manage Events'}
                  </button>
                </div>
                
                {showEvents && (
                  <div className="space-y-3 mt-3 pt-3 border-t border-slate-700/50">
                    {teamEvents.map((event: any) => {
                      const registration = teamRegistrations.find((er: any) => er.event_id === event.id);
                      return (
                        <div key={event.id} className="flex justify-between items-center bg-slate-800 p-3 rounded border border-slate-700">
                          <div>
                            <p className="text-sm font-medium">{event.name}</p>
                            <p className="text-xs text-slate-400">Max members: {event.max_participants_per_team || 'Unlimited'}</p>
                          </div>
                          {registration ? (
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-medium px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Registered</span>
                              <a href={`/dashboard/event-roster/${registration.id}`} className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                                Manage Roster &rarr;
                              </a>
                            </div>
                          ) : (
                            <Button variant="primary" onClick={() => onRegisterTeam(event.id, team.id)}>
                              Register
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Pending Members Section */}
            {teamPendingMembers.length > 0 && (
              <div className="border-t border-slate-700 pt-4">
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Pending Requests ({teamPendingMembers.length})</p>
                <div className="space-y-2">
                  {teamPendingMembers.map((member: any) => (
                    <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                      <div>
                        <p className="text-sm font-medium">{member.users?.full_name}</p>
                        <p className="text-xs text-slate-400">{member.users?.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(member.id)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors">
                          Approve
                        </button>
                        <button onClick={() => handleReject(member.id)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
