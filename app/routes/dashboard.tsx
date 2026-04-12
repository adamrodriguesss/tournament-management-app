import { useState } from 'react';
import { redirect, useNavigate, useRevalidator } from 'react-router';
import { getSession, getProfile } from '../services/auth';
import { getActiveTournaments } from '../services/tournaments';
import { createTeam, checkTeamExists } from '../services/teams';
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

// load all the things the dashboard needs before rendering 
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

    const { data: existingTeam } = await checkTeamExists(
  selectedTournament.id,
  profile.department
);

  if (existingTeam) {
    setError("Your department already has a team in this tournament.");
    setLoading(false);
    return;
  }



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
  if (teamError.code === '23505') {
    // Postgres unique violation
    setError("A team from your department is already registered in this tournament.");
  } else {
    setError(teamError.message);
  }
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
        {/* Welcome Header */}
        <div className="mb-8 border-l-4 border-pixel-gold pl-4 py-1">
          <h2 className="font-[family-name:var(--font-pixel)] text-[26px] text-pixel-gold leading-relaxed tracking-wide">
            WELCOME, <span className="text-pixel-cyan">{profile.full_name.toUpperCase()}</span>
          </h2>
        </div>

        {/* My Teams Section */}
        {participations.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-[2px] flex-1 bg-pixel-gold opacity-30" />
              <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-gold tracking-[3px]">MY TEAMS</h3>
              <div className="h-[2px] flex-1 bg-pixel-gold opacity-30" />
            </div>
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

        {/* My Events Section */}
        {(() => {
          const myTeamEvents = (eventRegistrations || []).filter((er: any) => {
            if (!er.events || er.events.type !== 'team') return false;
            return (teamEventParticipants || []).some(
              (tp: any) => tp.event_registration_id === er.id && userParticipantIds.includes(tp.participant_id)
            );
          }).map((er: any) => ({ event: { ...er.events, tournaments: { name: er.events?.tournaments?.name || participations.find((p: any) => p.team_id === er.team_id)?.tournaments?.name } }, registration: er, type: 'team' as const }));

          const myIndividualEvents = (individualRegistrations || []).filter((er: any) => er.events)
            .map((er: any) => ({ event: er.events, registration: er, type: 'individual' as const }));

          const allMyEvents = [...myTeamEvents, ...myIndividualEvents];
          if (allMyEvents.length === 0) return null;

          return (
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-[2px] flex-1 bg-pixel-purple opacity-30" />
                <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-purple tracking-[3px]">MY EVENTS</h3>
                <div className="h-[2px] flex-1 bg-pixel-purple opacity-30" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allMyEvents.map((item, idx) => (
                  <EventCard
                    key={`${item.type}-${item.registration.id}-${idx}`}
                    event={item.event}
                    registration={item.registration}
                    type={item.type}
                  />
                ))}
              </div>
            </div>
          );
        })()}

        {/* Available Tournaments Section */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-[2px] flex-1 bg-pixel-cyan-dim opacity-30" />
            <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-cyan-dim tracking-[3px]">AVAILABLE TOURNAMENTS</h3>
            <div className="h-[2px] flex-1 bg-pixel-cyan-dim opacity-30" />
          </div>

          {availableTournaments.length === 0 ? (
            <div className="border-2 border-pixel-border bg-pixel-dark p-6 text-center"
                 style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}>
              <p className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate tracking-wide leading-relaxed">
                NO TOURNAMENTS AVAILABLE RIGHT NOW
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableTournaments.map((t: any) => (
                <div
                  key={t.id}
                  className="bg-pixel-card border-[3px] border-pixel-border p-6 relative transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer"
                  style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
                >
                  {/* gold top accent bar */}
                  <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, var(--color-pixel-gold), var(--color-pixel-purple))' }} />
                  <h4 className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-gold mb-2 leading-relaxed tracking-wide">
                    {t.name.toUpperCase()}
                  </h4>
                  {t.description && (
                    <p className="font-[family-name:var(--font-vt)] text-[22px] text-pixel-slate mb-4 line-clamp-2">
                      {t.description}
                    </p>
                  )}
                  <Button
                    variant="primary"
                    onClick={() => { setSelectedTournament(t); setView('tournament_action'); }}
                  >
                    JOIN / CREATE TEAM
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}

    {/* Tournament Action View */}
    {view === 'tournament_action' && selectedTournament && (
      <div className="max-w-lg mx-auto w-full text-center py-8">
        <div className="mb-8">
          <Button variant="secondary" onClick={resetView}>
            BACK
          </Button>
        </div>
        <h2 className="font-[family-name:var(--font-pixel)] text-[24px] text-pixel-gold mb-3 leading-relaxed tracking-wide">
          {selectedTournament.name.toUpperCase()}
        </h2>
        <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate mb-8">
          Get started by creating or joining a team.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <button
            onClick={() => setView('create')}
            className="bg-pixel-card border-[3px] border-pixel-border p-6 text-left transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 group"
            style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
          >
            <span className="text-3xl mb-3 block">🏴</span>
            <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate-light group-hover:text-pixel-cyan mb-2 leading-relaxed transition-colors">
              CREATE TEAM
            </h3>
            <p className="font-[family-name:var(--font-vt)] text-[26px] text-pixel-slate">Start a new team and invite others.</p>
          </button>

          <button
            onClick={() => setView('join')}
            className="bg-pixel-card border-[3px] border-pixel-gold p-6 text-left transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 group"
            style={{ boxShadow: '3px 3px 0 var(--color-pixel-gold-dark)' }}
          >
            <span className="text-3xl mb-3 block">🤝</span>
            <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-gold group-hover:text-pixel-cyan mb-2 leading-relaxed transition-colors">
              JOIN TEAM
            </h3>
            <p className="font-[family-name:var(--font-vt)] text-[26px] text-pixel-slate">Use a join code from a captain.</p>
          </button>
        </div>
      </div>
    )}

    {/* Create / Join Form View */}
    {(view === 'create' || view === 'join') && (
      <div className="flex justify-center py-8">
        {success ? (
          <div
            className="bg-pixel-panel border-[3px] border-pixel-border p-6 sm:p-8 max-w-md w-full text-center"
            style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
          >
            <div className="border-2 border-pixel-green-dim bg-pixel-green/10 p-4 mb-6">
              <p className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-green-dim tracking-wide leading-relaxed">{success}</p>
            </div>
            <Button fullWidth onClick={resetView}>
              RETURN TO DASHBOARD
            </Button>
          </div>
        ) : (
          <div
            className="bg-pixel-panel border-[3px] border-pixel-border p-6 sm:p-8 max-w-md w-full"
            style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
          >
            <div className="mb-6">
              <Button variant="secondary" onClick={() => { setView('tournament_action'); setError(null); }}>
                BACK
              </Button>
            </div>

            <h2 className="font-[family-name:var(--font-pixel)] text-[11px] text-pixel-gold mb-2 leading-relaxed tracking-wide">
              {view === 'create' ? 'CREATE A TEAM' : 'JOIN A TEAM'}
            </h2>
            <p className="font-[family-name:var(--font-vt)] text-[22px] text-pixel-slate mb-6">
              For: {selectedTournament?.name}
            </p>

            {view === 'create' ? (
              <form onSubmit={handleCreateTeam} className="space-y-4">
                {error && (
                  <div className="border-2 border-pixel-red bg-pixel-red/10 p-3 font-[family-name:var(--font-pixel)] text-[12px] text-pixel-red tracking-wide leading-relaxed">
                    ⚠ {error}
                  </div>
                )}
                <Input label="Team Name" value={teamName} onChange={(e) => setTeamName(e.target.value)} required placeholder="e.g., CS Thunderbolts" />
                <Input label="Department" value={profile.department || ''} disabled />
                <Button fullWidth type="submit" disabled={loading}>
                  {loading ? 'CREATING...' : 'CREATE TEAM'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleJoinTeam} className="space-y-4">
                {error && (
                  <div className="border-2 border-pixel-red bg-pixel-red/10 p-3 font-[family-name:var(--font-pixel)] text-[12px] text-pixel-red tracking-wide leading-relaxed">
                    ⚠ {error}
                  </div>
                )}
                <Input
                  label="Join Code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  required
                  placeholder="A1B2C3D4"
                  maxLength={8}
                  className="uppercase tracking-[8px] text-center font-[family-name:var(--font-pixel)] text-pixel-cyan"
                />
                <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate">
                  Note: The join code will automatically link you to the correct tournament.
                </p>
                <Button fullWidth type="submit" disabled={loading}>
                  {loading ? 'JOINING...' : 'JOIN TEAM'}
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
