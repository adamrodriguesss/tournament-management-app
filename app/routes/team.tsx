import { useState } from 'react';
import { redirect, useNavigate, useParams, useRevalidator } from 'react-router';
import { getSession, getProfile } from '../services/auth';
import { getTeamById } from '../services/teams';
import { getParticipantsByTeamIds, approveParticipant, rejectParticipant } from '../services/participants';
import { getEventsByTournament, getEventRegistrationsByTeams, registerTeamForEvent, getEventRegistrationsByParticipants, registerParticipantForEvent, unregisterParticipantFromEvent } from '../services/events';
import { Button } from '../components/ui/Button';
import { AppLayout } from '../components/layout/AdminLayout';

export async function clientLoader({ params }: { params: any }) {
  const session = await getSession();
  if (!session) return redirect("/login");

  const { data: profile } = await getProfile(session.user.id);
  if (!profile) return redirect("/login");

  const teamId = params.teamId;
  const { data: team, error: teamError } = await getTeamById(teamId);
  if (teamError || !team) return redirect("/dashboard");

  const participants = await getParticipantsByTeamIds([teamId]);

  // Ensure current user is part of the team
  const userParticipant = participants.find((p: any) => p.user_id === profile.id);
  if (!userParticipant) return redirect("/dashboard");

  const { data: events } = await getEventsByTournament(team.tournament_id);
  const { data: eventRegistrations } = await getEventRegistrationsByTeams([teamId]);

  const participantIds = participants.map((p: any) => p.id);
  const { data: individualRegistrations } = await getEventRegistrationsByParticipants(participantIds);

  const teamEvents = events.filter((e: any) => e.type === 'team');
  const individualEvents = events.filter((e: any) => e.type === 'individual');

  return { profile, team, participants, userParticipant, teamEvents, eventRegistrations, individualEvents, individualRegistrations };
}

export default function TeamView({ loaderData }: { loaderData: any }) {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { profile, team, participants, userParticipant, teamEvents, eventRegistrations, individualEvents, individualRegistrations } = loaderData;

  const [selectedMembers, setSelectedMembers] = useState<Record<string, string>>({});

  const isCaptain = userParticipant.role_in_team === 'captain';

  const confirmedMembers = participants.filter((p: any) => p.status === 'confirmed');
  const pendingMembers = participants.filter((p: any) => p.status === 'pending');
  const rejectedMembers = participants.filter((p: any) => p.status === 'rejected');

  const handleApprove = async (id: string) => {
    await approveParticipant(id, profile.id);
    revalidator.revalidate();
  };

  const handleReject = async (id: string) => {
    await rejectParticipant(id);
    revalidator.revalidate();
  };

  const handleRegisterTeam = async (eventId: string) => {
    await registerTeamForEvent(eventId, team.id);
    revalidator.revalidate();
  };

  const handleRegisterIndividual = async (eventId: string, participantId: string) => {
    if (!participantId) return;
    await registerParticipantForEvent(eventId, participantId);
    revalidator.revalidate();
  };

  const handleUnregisterIndividual = async (registrationId: string) => {
    await unregisterParticipantFromEvent(registrationId);
    revalidator.revalidate();
  };

  return (
    <AppLayout user={{ ...profile, role: 'participant' }} activeItem="Dashboard" contextTitle={team.tournaments?.name}>
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-slate-50 text-sm mb-6 transition-colors inline-block font-medium">
          ←
        </button>
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">{team.name}</h2>
          <p className="text-slate-400">Tournament: {team.tournaments?.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">

            {/* Event Management Section */}
            {isCaptain && team.status === 'confirmed' && teamEvents.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4 text-slate-300">Team Events</h3>
                <div className="space-y-4">
                  {teamEvents.map((event: any) => {
                    const registration = eventRegistrations.find((er: any) => er.event_id === event.id);
                    return (
                      <div key={event.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <div>
                          <p className="font-medium">{event.name}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {event.max_participants_per_team ? `Max members: ${event.max_participants_per_team}` : 'Unlimited members'}
                          </p>
                        </div>
                        {registration ? (
                          <div className="flex flex-wrap items-center gap-3 shrink-0">
                            <span className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Registered</span>
                            <button onClick={() => navigate(`/dashboard/event-roster/${registration.id}`)} className="text-sm font-medium px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors border border-indigo-500/20">
                              Manage Roster &rarr;
                            </button>
                          </div>
                        ) : (
                          <div className="shrink-0">
                            <Button variant="primary" onClick={() => handleRegisterTeam(event.id)}>
                              Register Team
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Individual Event Management Section */}
            {isCaptain && team.status === 'confirmed' && individualEvents.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4 text-slate-300">Individual Events</h3>
                <div className="space-y-4">
                  {individualEvents.map((event: any) => {
                    const eventRegs = individualRegistrations.filter((er: any) => er.event_id === event.id);

                    return (
                      <div key={event.id} className="flex flex-col gap-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                          <div>
                            <p className="font-medium text-slate-200">{event.name}</p>
                            <p className="text-xs text-slate-400 mt-1">Individual Activity</p>
                          </div>

                          {eventRegs.length === 0 ? (
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <select
                                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50 transition-colors"
                                value={selectedMembers[event.id] || ''}
                                onChange={(e) => setSelectedMembers({ ...selectedMembers, [event.id]: e.target.value })}
                              >
                                <option value="">Select member...</option>
                                {confirmedMembers.map((m: any) => (
                                  <option key={m.id} value={m.id}>{m.users?.full_name}</option>
                                ))}
                              </select>
                              <Button
                                variant="primary"
                                onClick={() => handleRegisterIndividual(event.id, selectedMembers[event.id])}
                                disabled={!selectedMembers[event.id]}
                              >
                                Register
                              </Button>
                            </div>
                          ) : (
                            <div className="w-full sm:w-auto shrink-0">
                              {eventRegs.map((reg: any) => {
                                const participant = participants.find((p: any) => p.id === reg.participant_id);
                                return (
                                  <div key={reg.id} className="flex items-center justify-between gap-4 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-lg">
                                    <span className="text-sm font-medium text-emerald-500 flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                      {participant?.users?.full_name}
                                    </span>
                                    <button
                                      onClick={() => handleUnregisterIndividual(reg.id)}
                                      className="text-lg cursor-pointer font-semibold text-red-500 hover:text-red-400 transition-colors p-1"
                                      title="Remove from event"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4 text-slate-300">Team Members ({confirmedMembers.length})</h3>
              <div className="space-y-3">
                {confirmedMembers.map((member: any) => (
                  <div key={member.id} className="flex justify-between items-center bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                    <div>
                      <p className="font-medium">{member.users?.full_name}</p>
                      <p className="text-xs text-slate-400">{member.users?.department || 'Member'}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${member.role_in_team === 'captain' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'} capitalize`}>
                      {member.role_in_team}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {isCaptain && pendingMembers.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4 text-slate-300">Pending Requests ({pendingMembers.length})</h3>
                <div className="space-y-3">
                  {pendingMembers.map((member: any) => (
                    <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                      <div>
                        <p className="font-medium">{member.users?.full_name}</p>
                        <p className="text-xs text-slate-400">{member.users?.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(member.id)} className="text-sm font-medium px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors">
                          Approve
                        </button>
                        <button onClick={() => handleReject(member.id)} className="text-sm font-medium px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isCaptain && rejectedMembers.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 opacity-75">
                <h3 className="text-xl font-semibold mb-4 text-slate-300">Rejected Requests ({rejectedMembers.length})</h3>
                <div className="space-y-3">
                  {rejectedMembers.map((member: any) => (
                    <div key={member.id} className="flex justify-between items-center bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                      <div>
                        <p className="font-medium text-slate-400">{member.users?.full_name}</p>
                      </div>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                        Rejected
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-slate-300">Team Info</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Status</p>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border w-fit capitalize ${team.status === 'confirmed'
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : team.status === 'disqualified'
                      ? 'bg-red-500/10 text-red-500 border-red-500/20'
                      : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                    {team.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Department</p>
                  <p className="text-sm text-slate-300">{team.department}</p>
                </div>
                {isCaptain && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Join Code</p>
                    <code className="bg-slate-950 px-3 py-1.5 rounded text-indigo-400 font-mono text-sm inline-block tracking-widest">{team.registration_token}</code>
                    <p className="text-xs text-slate-500 mt-2">Share this code with teammates.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
