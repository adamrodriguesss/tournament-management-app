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

      <div className="mb-6">
        <Button variant="secondary" onClick={() => navigate('/dashboard')}>
          BACK
        </Button>
      </div>

      <div className="mb-8 border-l-4 border-pixel-gold pl-4 py-1">
        <h2 className="font-[family-name:var(--font-pixel)] text-[26px] text-pixel-gold leading-relaxed tracking-wide">
          {team.name.toUpperCase()}
        </h2>
        <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate mt-1">
          Tournament: {team.tournaments?.name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">

          {/* Team Events */}
          {isCaptain && team.status === 'confirmed' && teamEvents.length > 0 && (
            <div
              className="bg-pixel-card border-[3px] border-pixel-border p-6 relative"
              style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-pixel-gold opacity-40" />
              <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-gold mb-4 tracking-wide leading-relaxed">
                TEAM EVENTS
              </h3>
              <div className="space-y-3">
                {teamEvents.map((event: any) => {
                  const registration = eventRegistrations.find((er: any) => er.event_id === event.id);
                  return (
                    <div
                      key={event.id}
                      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-pixel-dark border-2 border-pixel-border p-4"
                      style={{ boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.3)' }}
                    >
                      <div>
                        <p className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate-light leading-relaxed">
                          {event.name.toUpperCase()}
                        </p>
                        <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate mt-1">
                          {event.max_participants_per_team
                            ? `Max members: ${event.max_participants_per_team}`
                            : 'Unlimited members'}
                        </p>
                      </div>
                      {registration ? (
                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                          <span className="font-[family-name:var(--font-pixel)] text-[12px] px-2 py-1 bg-pixel-green/10 text-pixel-green-dim border border-pixel-green-dim tracking-wide">
                            ✓ REGISTERED
                          </span>
                          <button
                            onClick={() => navigate(`/dashboard/event-roster/${registration.id}`)}
                            className="font-[family-name:var(--font-pixel)] text-[12px] px-3 py-2 border-2 border-pixel-cyan-dim text-pixel-cyan bg-pixel-cyan/5 hover:bg-pixel-cyan/10 transition-colors tracking-wide
                              [box-shadow:2px_2px_0_var(--color-pixel-cyan-dim)] active:translate-x-[2px] active:translate-y-[2px] active:[box-shadow:none]"
                          >
                            MANAGE ROSTER →
                          </button>
                        </div>
                      ) : (
                        <div className="shrink-0">
                          <Button variant="primary" onClick={() => handleRegisterTeam(event.id)}>
                            REGISTER TEAM
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Individual Events */}
          {isCaptain && team.status === 'confirmed' && individualEvents.length > 0 && (
            <div
              className="bg-pixel-card border-[3px] border-pixel-border p-6 relative"
              style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-pixel-purple opacity-60" />
              <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-purple mb-4 tracking-wide leading-relaxed">
                INDIVIDUAL EVENTS
              </h3>
              <div className="space-y-3">
                {individualEvents.map((event: any) => {
                  const eventRegs = individualRegistrations.filter((er: any) => er.event_id === event.id);
                  return (
                    <div
                      key={event.id}
                      className="flex flex-col gap-3 bg-pixel-dark border-2 border-pixel-border p-4"
                      style={{ boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.3)' }}
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <div>
                          <p className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate-light leading-relaxed">
                            {event.name.toUpperCase()}
                          </p>
                          <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate mt-1">
                            Individual Activity
                          </p>
                        </div>

                        {eventRegs.length === 0 ? (
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <select
                              className="
                                bg-pixel-black border-2 border-pixel-border px-3 py-2
                                font-[family-name:var(--font-vt)] text-[26px] text-pixel-slate-light
                                outline-none focus:border-pixel-cyan-dim
                              "
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
                              REGISTER
                            </Button>
                          </div>
                        ) : (
                          <div className="w-full sm:w-auto shrink-0 space-y-2">
                            {eventRegs.map((reg: any) => {
                              const participant = participants.find((p: any) => p.id === reg.participant_id);
                              return (
                                <div
                                  key={reg.id}
                                  className="flex items-center justify-between gap-4 bg-pixel-green/10 border-2 border-pixel-green-dim px-4 py-2"
                                >
                                  <span className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-green-dim flex items-center gap-2 leading-relaxed">
                                    <span className="w-1.5 h-1.5 bg-pixel-green-dim inline-block animate-pulse" />
                                    {participant?.users?.full_name}
                                  </span>
                                  <button
                                    onClick={() => handleUnregisterIndividual(reg.id)}
                                    className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-red hover:text-red-400 transition-colors cursor-pointer"
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

          {/* Team Members */}
          <div
            className="bg-pixel-card border-[3px] border-pixel-border p-6 relative"
            style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-pixel-cyan-dim opacity-50" />
            <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-cyan-dim mb-4 tracking-wide leading-relaxed">
              TEAM MEMBERS ({confirmedMembers.length})
            </h3>
            <div className="space-y-2">
              {confirmedMembers.map((member: any) => (
                <div
                  key={member.id}
                  className="flex justify-between items-center bg-pixel-dark border-2 border-pixel-border p-4"
                  style={{ boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.3)' }}
                >
                  <div>
                    <p className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate-light leading-relaxed">
                      {member.users?.full_name}
                    </p>
                    <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate">
                      {member.users?.department || 'Member'}
                    </p>
                  </div>
                  <span className={`
                    font-[family-name:var(--font-pixel)] text-[12px] px-2 py-0.5 border tracking-wide capitalize
                    ${member.role_in_team === 'captain'
                      ? 'bg-pixel-gold/10 text-pixel-gold border-pixel-gold-dark'
                      : 'bg-pixel-slate/10 text-pixel-slate border-pixel-border'}
                  `}>
                    {member.role_in_team.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Requests */}
          {isCaptain && pendingMembers.length > 0 && (
            <div
              className="bg-pixel-card border-[3px] border-amber-500/50 p-6 relative"
              style={{ boxShadow: '3px 3px 0 rgba(245,158,11,0.3)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-500 opacity-60" />
              <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-amber-400 mb-4 tracking-wide leading-relaxed">
                PENDING REQUESTS ({pendingMembers.length})
              </h3>
              <div className="space-y-2">
                {pendingMembers.map((member: any) => (
                  <div
                    key={member.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-pixel-dark border-2 border-pixel-border p-4"
                  >
                    <div>
                      <p className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate-light leading-relaxed">
                        {member.users?.full_name}
                      </p>
                      <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate">
                        {member.users?.email}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(member.id)}
                        className="font-[family-name:var(--font-pixel)] text-[12px] px-3 py-1.5 border-2 border-pixel-green-dim text-pixel-green-dim bg-pixel-green/5 hover:bg-pixel-green/10 transition-colors tracking-wide
                          [box-shadow:2px_2px_0_var(--color-pixel-green-dim)] active:translate-x-[2px] active:translate-y-[2px] active:[box-shadow:none]"
                      >
                        APPROVE
                      </button>
                      <button
                        onClick={() => handleReject(member.id)}
                        className="font-[family-name:var(--font-pixel)] text-[12px] px-3 py-1.5 border-2 border-pixel-red text-pixel-red bg-pixel-red/5 hover:bg-pixel-red/10 transition-colors tracking-wide
                          [box-shadow:2px_2px_0_#a01e36] active:translate-x-[2px] active:translate-y-[2px] active:[box-shadow:none]"
                      >
                        REJECT
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejected Requests */}
          {isCaptain && rejectedMembers.length > 0 && (
            <div
              className="bg-pixel-card border-[3px] border-pixel-border p-6 relative opacity-60"
              style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
            >
              <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-red mb-4 tracking-wide leading-relaxed">
                REJECTED ({rejectedMembers.length})
              </h3>
              <div className="space-y-2">
                {rejectedMembers.map((member: any) => (
                  <div
                    key={member.id}
                    className="flex justify-between items-center bg-pixel-dark border-2 border-pixel-border p-4"
                  >
                    <p className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate leading-relaxed">
                      {member.users?.full_name}
                    </p>
                    <span className="font-[family-name:var(--font-pixel)] text-[12px] px-2 py-0.5 bg-pixel-red/10 text-pixel-red border border-pixel-red tracking-wide">
                      REJECTED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div
            className="bg-pixel-card border-[3px] border-pixel-border p-6 relative"
            style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
          >
            <div className="absolute top-0 left-0 right-0 h-[3px]"
              style={{ background: 'linear-gradient(90deg, var(--color-pixel-gold), var(--color-pixel-purple))' }}
            />
            <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate-light mb-5 tracking-wide leading-relaxed">
              TEAM INFO
            </h3>
            <div className="space-y-4">
              <div>
                <p className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate uppercase tracking-[2px] mb-1">Status</p>
                <span className={`
                  font-[family-name:var(--font-pixel)] text-[12px] px-2 py-1 border tracking-wide capitalize
                  ${team.status === 'confirmed'
                    ? 'bg-pixel-green/10 text-pixel-green-dim border-pixel-green-dim'
                    : team.status === 'disqualified'
                    ? 'bg-pixel-red/10 text-pixel-red border-pixel-red'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500'}
                `}>
                  {team.status.toUpperCase()}
                </span>
              </div>

              <div>
                <p className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate uppercase tracking-[2px] mb-1">Department</p>
                <p className="font-[family-name:var(--font-vt)] text-[22px] text-pixel-slate-light">{team.department}</p>
              </div>

              {isCaptain && (
                <div>
                  <p className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate uppercase tracking-[2px] mb-2">Join Code</p>
                  <code
                    className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-cyan bg-pixel-black border-2 border-pixel-border px-3 py-2 inline-block tracking-[6px]"
                    style={{ boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.5)' }}
                  >
                    {team.registration_token}
                  </code>
                  <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate mt-2">
                    Share this code with teammates.
                  </p>
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
