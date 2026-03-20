import { useState } from 'react';
import { redirect, useNavigate, useRevalidator } from 'react-router';
import { getSession, getProfile } from '../services/auth';
import { getActiveTournaments } from '../services/tournaments';
import { createTeam } from '../services/teams';
import {
  getParticipationsByUser,
  getPendingMembersForCaptains,
  createCaptainParticipation,
  joinTeam,
} from '../services/participants';
import { getActiveEvents, getEventRegistrationsByTeams, registerTeamForEvent, getEventRegistrationsByParticipant, registerParticipantForEvent, getEventTeamParticipants } from '../services/events';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TeamCard } from '../components/dashboard/TeamCard';
import { AppLayout } from '../components/layout/AdminLayout';
import { EventCard } from '../components/dashboard/EventCard';

export async function clientLoader() {
  const session = await getSession();
  if (!session) {
    return redirect("/login");
  }

  const { data: profile } = await getProfile(session.user.id);

  if (!profile) {
    return redirect("/login");
  }

  if (profile.role === 'admin') return redirect("/admin/dashboard");
  if (profile.role === 'event_manager') return redirect("/event-manager");

  const { data: tournaments } = await getActiveTournaments();

  const { data: participations } = await getParticipationsByUser(session.user.id);

  const captainTeamIds = participations
    .filter((p: any) => p.role_in_team === 'captain')
    .map((p: any) => p.team_id);

  const pendingMembers = await getPendingMembersForCaptains(captainTeamIds);
  const { data: events } = await getActiveEvents();

  const teamIds = participations.map((p: any) => p.team_id);
  const { data: eventRegistrations } = await getEventRegistrationsByTeams(teamIds);

  // Fetch participant IDs for this user across all teams
  const userParticipantIds = participations.map((p: any) => p.id);

  // Fetch team event roster entries where this user is selected
  const teamRegIds = eventRegistrations.map((er: any) => er.id);
  const { data: teamEventParticipants } = await getEventTeamParticipants(teamRegIds);

  // Individual event registrations
  const { data: individualRegistrations } = await getEventRegistrationsByParticipant(profile.id);

  return {
    profile,
    tournaments,
    participations,
    pendingMembers,
    events,
    eventRegistrations,
    teamEventParticipants,
    individualRegistrations,
    userParticipantIds
  };
}

export default function Dashboard({ loaderData }: { loaderData: any }) {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { profile, tournaments, participations, pendingMembers, events, eventRegistrations, teamEventParticipants, individualRegistrations, userParticipantIds } = loaderData;

  const [view, setView] = useState<'home' | 'tournament_action' | 'create' | 'join'>('home');
  const [selectedTournament, setSelectedTournament] = useState<any>(null);

  const [teamName, setTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const joinedTournamentIds = new Set(participations.map((p: any) => p.tournament_id));
  const availableTournaments = tournaments.filter((t: any) => !joinedTournamentIds.has(t.id));

  const resetView = () => {
    setView('home');
    setSelectedTournament(null);
    setError(null);
    setSuccess(null);
    setTeamName('');
    setJoinCode('');
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament) return;
    setLoading(true);
    setError(null);

    const token = Math.random().toString(36).substring(2, 10).toUpperCase();

    const { data: newTeam, error: teamError } = await createTeam({
      tournament_id: selectedTournament.id,
      name: teamName,
      department: profile.department,
      registration_token: token,
      status: 'pending',
      created_by: profile.id,
    });

    if (teamError) {
      setError(teamError.message);
      setLoading(false);
      return;
    }

    const { error: partError } = await createCaptainParticipation({
      user_id: profile.id,
      team_id: newTeam.id,
      tournament_id: selectedTournament.id,
    });

    if (partError) {
      setError(partError.message);
      setLoading(false);
      return;
    }

    setSuccess(`Team "${teamName}" created! Join code: ${token}`);
    setLoading(false);
    revalidator.revalidate();
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await joinTeam(joinCode, profile.id, profile.full_name);

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    if (data && data.error) {
      setError(data.error);
      setLoading(false);
      return;
    }

    setSuccess(`You've joined ${data?.team_name || 'the team'}! Awaiting captain approval.`);
    setLoading(false);
    revalidator.revalidate();
  };

  const handleRegisterTeam = async (eventId: string, teamId: string) => {
    await registerTeamForEvent(eventId, teamId);
    revalidator.revalidate();
  };

  const handleRegisterIndividual = async (eventId: string, participantId: string) => {
    await registerParticipantForEvent(eventId, participantId);
    revalidator.revalidate();
  };

  // Group participations by tournament for Individual Events section
  const confirmedParticipations = participations.filter((p: any) => p.status === 'confirmed');

  return (
    <AppLayout user={{ ...profile, role: 'participant' }} activeItem="Dashboard">
      <div className="max-w-4xl mx-auto">
        {view === 'home' && (
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-8">Welcome, {profile.full_name}!</h2>

            {/* My Teams Section */}
            {participations.length > 0 && (
              <div className="mb-10">
                <h3 className="text-xl font-semibold mb-4 text-slate-300">My Teams</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {participations.map((p: any) => (
                    <TeamCard 
                      key={p.id} 
                      participation={p} 
                      team={p.teams} 
                      tournament={p.tournaments} 
                      pendingMembers={pendingMembers}
                      profile={profile}
                      events={events}
                      eventRegistrations={eventRegistrations}
                      onRegisterTeam={handleRegisterTeam}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* My Events Section - Unified view of team + individual events */}
            {(() => {
              // Team events where participant is on the roster
              const myTeamEvents = (eventRegistrations || []).filter((er: any) => {
                if (!er.events || er.events.type !== 'team') return false;
                // Check if this user is in the roster for this registration
                return (teamEventParticipants || []).some(
                  (tp: any) => tp.event_registration_id === er.id && userParticipantIds.includes(tp.participant_id)
                );
              }).map((er: any) => ({ event: { ...er.events, tournaments: { name: er.events?.tournaments?.name || participations.find((p: any) => p.team_id === er.team_id)?.tournaments?.name } }, registration: er, type: 'team' as const }));

              // Individual events the participant registered for
              const myIndividualEvents = (individualRegistrations || []).filter((er: any) => er.events).map((er: any) => ({ event: er.events, registration: er, type: 'individual' as const }));

              const allMyEvents = [...myTeamEvents, ...myIndividualEvents];

              if (allMyEvents.length === 0) return null;

              return (
                <div className="mb-10">
                  <h3 className="text-xl font-semibold mb-4 text-slate-300">My Events</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allMyEvents.map((item, idx) => (
                      <EventCard key={`${item.type}-${item.registration.id}-${idx}`} event={item.event} registration={item.registration} type={item.type} />
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Available Tournaments Section */}
            <div>
              <h3 className="text-xl font-semibold mb-4 text-slate-300">Available Tournaments</h3>
              {availableTournaments.length === 0 ? (
                <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-6 text-center">
                  <p className="text-slate-400">No open tournaments available to join right now.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableTournaments.map((t: any) => (
                    <div key={t.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-indigo-500/50 transition-colors">
                      <h4 className="text-lg font-bold mb-1">{t.name}</h4>
                      {t.description && <p className="text-sm text-slate-400 mb-4 line-clamp-2">{t.description}</p>}
                      <Button
                        variant="primary"
                        onClick={() => {
                          setSelectedTournament(t);
                          setView('tournament_action');
                        }}
                      >
                        Join / Create Team
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create/Join Team Views (Omitted unchanged code below) */}
        {view === 'tournament_action' && selectedTournament && (
          <div className="max-w-lg mx-auto w-full text-center py-8">
            <button onClick={resetView} className="text-slate-400 hover:text-slate-50 text-sm mb-6 transition-colors">←</button>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">{selectedTournament.name}</h2>
            <p className="text-slate-400 mb-8">Get started by creating or joining a team.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <button
                onClick={() => setView('create')}
                className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all duration-200 group relative overflow-hidden"
              >
                <span className="text-3xl mb-3 block">🏴</span>
                <h3 className="text-lg font-semibold mb-1 group-hover:text-indigo-400 transition-colors">Create Team</h3>
                <p className="text-slate-400 text-sm">Start a new team and invite others.</p>
              </button>
              <button
                onClick={() => setView('join')}
                className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all duration-200 group"
              >
                <span className="text-3xl mb-3 block">🤝</span>
                <h3 className="text-lg font-semibold mb-1 group-hover:text-indigo-400 transition-colors">Join Team</h3>
                <p className="text-slate-400 text-sm">Use a join code from a captain.</p>
              </button>
            </div>
          </div>
        )}

        {(view === 'create' || view === 'join') && (
          <div className="flex justify-center py-8">
            {success ? (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 sm:p-8 max-w-md w-full text-center">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg mb-6">
                  <p className="text-emerald-500 font-medium">{success}</p>
                </div>
                <Button fullWidth onClick={resetView}>
                  Return to Dashboard
                </Button>
              </div>
            ) : (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 sm:p-8 max-w-md w-full shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                <button
                  onClick={() => { setView('tournament_action'); setError(null); }}
                  className="text-slate-400 hover:text-slate-50 text-sm mb-4 transition-colors"
                >
                  ←
                </button>
                <h2 className="text-2xl font-bold mb-1">
                  {view === 'create' ? 'Create a Team' : 'Join a Team'}
                </h2>
                <p className="text-slate-400 text-sm mb-6">
                  For: {selectedTournament?.name}
                </p>

                {view === 'create' ? (
                  <form onSubmit={handleCreateTeam} className="space-y-4">
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-sm text-red-500">{error}</div>}
                    <Input label="Team Name" value={teamName} onChange={(e) => setTeamName(e.target.value)} required placeholder="e.g., CS Thunderbolts" />
                    <Input label="Department" value={profile.department || ''} disabled />
                    <Button fullWidth type="submit" disabled={loading}>
                      {loading ? 'Creating...' : 'Create Team'}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleJoinTeam} className="space-y-4">
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-sm text-red-500">{error}</div>}
                    <Input label="Join Code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} required placeholder="e.g., A1B2C3D4" maxLength={8} className="uppercase tracking-widest text-center font-mono" />
                    <p className="text-xs text-slate-500">Note: The join code will automatically link you to the correct tournament.</p>
                    <Button fullWidth type="submit" disabled={loading}>
                      {loading ? 'Joining...' : 'Join Team'}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
