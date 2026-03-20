import { useState } from 'react';
import { redirect, useNavigate, useRevalidator } from 'react-router';
import { getSession, getProfile, logout } from '../services/auth';
import { getActiveTournaments } from '../services/tournaments';
import { createTeam } from '../services/teams';
import {
  getParticipationsByUser,
  getPendingMembersForCaptains,
  createCaptainParticipation,
  joinTeam,
  approveParticipant,
  rejectParticipant,
} from '../services/participants';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

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
  if (profile.role === 'referee') return redirect("/referee");

  const { data: tournaments } = await getActiveTournaments();

  const { data: participations } = await getParticipationsByUser(session.user.id);

  // Fetch pending participants for teams where the user is captain
  const captainTeamIds = participations
    .filter((p: any) => p.role_in_team === 'captain')
    .map((p: any) => p.team_id);

  const pendingMembers = await getPendingMembersForCaptains(captainTeamIds);

  return {
    profile,
    tournaments,
    participations,
    pendingMembers
  };
}

export default function Dashboard({ loaderData }: { loaderData: any }) {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { profile, tournaments, participations, pendingMembers } = loaderData;

  const handleApproveParticipant = async (participantId: string) => {
    await approveParticipant(participantId, profile.id);
    revalidator.revalidate();
  };

  const handleRejectParticipant = async (participantId: string) => {
    await rejectParticipant(participantId);
    revalidator.revalidate();
  };

  const [view, setView] = useState<'home' | 'tournament_action' | 'create' | 'join'>('home');
  const [selectedTournament, setSelectedTournament] = useState<any>(null);

  const [teamName, setTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

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

  const TeamCard = ({ participation, team, tournament }: any) => {
    const teamPendingMembers = pendingMembers.filter((m: any) => m.team_id === team.id);

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
            <div className="col-span-2 mt-2">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Team Join Code</p>
              <code className="bg-slate-950 px-3 py-1.5 rounded text-indigo-400 font-mono text-sm inline-block tracking-widest">{team.registration_token}</code>
              <p className="text-xs text-slate-500 mt-1">Share this code with your teammates to let them join.</p>

              {/* Pending Members */}
              {teamPendingMembers.length > 0 && (
                <div className="mt-4 border-t border-slate-700 pt-4">
                  <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Pending Requests ({teamPendingMembers.length})</p>
                  <div className="space-y-2">
                    {teamPendingMembers.map((member: any) => (
                      <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                        <div>
                          <p className="text-sm font-medium">{member.users?.full_name}</p>
                          <p className="text-xs text-slate-400">{member.users?.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveParticipant(member.id)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectParticipant(member.id)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                          >
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
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-slate-800 bg-slate-950">
        <h1 className="text-xl font-bold">FestFlow</h1>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-sm text-slate-400 hidden sm:inline">{profile.email}</span>
          <Button variant="secondary" onClick={handleLogout}>Sign Out</Button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full">
        {view === 'home' && (
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-8">Welcome, {profile.full_name}!</h2>

            {/* My Teams Section */}
            {participations.length > 0 && (
              <div className="mb-10">
                <h3 className="text-xl font-semibold mb-4 text-slate-300">My Teams</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {participations.map((p: any) => (
                    <TeamCard key={p.id} participation={p} team={p.teams} tournament={p.tournaments} />
                  ))}
                </div>
              </div>
            )}

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

        {view === 'tournament_action' && selectedTournament && (
          <div className="max-w-lg mx-auto w-full text-center py-8">
            <button onClick={resetView} className="text-slate-400 hover:text-slate-50 text-sm mb-6 transition-colors">← Back to Dashboard</button>
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
                  ← Back
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
      </main>
    </div>
  );
}
