import { redirect, useNavigate, useRevalidator } from 'react-router';
import { getSession, getRoleProfile } from '../../services/auth';
import { getTournamentById } from '../../services/tournaments';
import { getTeamsByTournament, updateTeamStatus } from '../../services/teams';
import { getParticipantsByTeamIds } from '../../services/participants';
import { Button } from '../../components/ui/Button';
import { AdminLayout } from '../../components/layout/AdminLayout';
import type { Route } from './+types/teams';

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const session = await getSession();
  if (!session) return redirect("/login");

  const { data: user } = await getRoleProfile(session.user.id);

  if (!user || user.role !== "admin") return redirect("/");

  const tournamentId = params.id;

  const { data: tournament } = await getTournamentById(tournamentId);

  if (!tournament) return redirect("/admin/tournaments");

  const { data: teams } = await getTeamsByTournament(tournamentId);

  // Fetch participants for all teams
  const teamIds = teams.map((t: any) => t.id);
  const participants = await getParticipantsByTeamIds(teamIds);

  return {
    user: { ...user, id: session.user.id },
    tournament,
    teams,
    participants,
  };
}

type Team = {
  id: string;
  name: string;
  department: string;
  registration_token: string;
  status: string;
  created_at: string;
};

type Participant = {
  id: string;
  user_id: string;
  team_id: string;
  role_in_team: string;
  status: string;
  users: { full_name: string; email: string; department: string } | null;
};

type LoaderData = {
  user: { role: string; full_name: string; email: string; id: string };
  tournament: { id: string; name: string; status: string };
  teams: Team[];
  participants: Participant[];
};

export default function AdminTeams({ loaderData }: { loaderData: LoaderData }) {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { user, tournament, teams, participants } = loaderData;

  const handleConfirmTeam = async (teamId: string) => {
    await updateTeamStatus(teamId, 'confirmed');
    revalidator.revalidate();
  };

  const handleDisqualifyTeam = async (teamId: string) => {
    await updateTeamStatus(teamId, 'disqualified');
    revalidator.revalidate();
  };

  const getTeamParticipants = (teamId: string) =>
    participants.filter((p) => p.team_id === teamId);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'rejected':
      case 'disqualified': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
  };

  return (
    <AdminLayout user={user} activeItem="Team Approvals">
      <div className="mb-2">
        <button onClick={() => navigate('/admin/tournaments')} className="text-slate-400 hover:text-slate-50 text-sm transition-colors mb-2 inline-block">← Back to Tournaments</button>
      </div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">{tournament.name}</h1>
        <p className="text-slate-400 mt-1">Team Management Queue</p>
      </div>

      {teams.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <span className="text-4xl mb-4 block">👥</span>
          <h3 className="text-lg font-semibold mb-1">No Teams Registered</h3>
          <p className="text-slate-400 text-sm">No teams have registered for this tournament yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {teams.map((team) => {
            const teamParts = getTeamParticipants(team.id);
            const pendingCount = teamParts.filter((p) => p.status === 'pending').length;

            return (
              <div key={team.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                {/* Team Header */}
                <div className="p-4 sm:p-5 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <h3 className="text-lg font-semibold">{team.name}</h3>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusBadge(team.status)}`}>
                        {team.status}
                      </span>
                      {pendingCount > 0 && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                          {pendingCount} pending
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{team.department} · Code: <code className="text-indigo-400 font-mono">{team.registration_token}</code></p>
                  </div>
                  <div className="flex gap-2">
                    {team.status === 'pending' && (
                      <Button variant="primary" onClick={() => handleConfirmTeam(team.id)}>
                        Confirm Team
                      </Button>
                    )}
                    {team.status !== 'disqualified' && (
                      <Button variant="secondary" onClick={() => handleDisqualifyTeam(team.id)}>
                        Disqualify
                      </Button>
                    )}
                  </div>
                </div>

                {/* Participants — Table on desktop, Cards on mobile */}
                {teamParts.length > 0 ? (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-500 text-xs uppercase tracking-wide border-b border-slate-700">
                            <th className="px-5 py-3">Name</th>
                            <th className="px-5 py-3">Email</th>
                            <th className="px-5 py-3">Role</th>
                            <th className="px-5 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamParts.map((p) => (
                            <tr key={p.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50">
                              <td className="px-5 py-3 font-medium">{p.users?.full_name || '—'}</td>
                              <td className="px-5 py-3 text-slate-400">{p.users?.email || '—'}</td>
                              <td className="px-5 py-3 capitalize">{p.role_in_team}</td>
                              <td className="px-5 py-3">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusBadge(p.status)}`}>
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="sm:hidden divide-y divide-slate-700">
                      {teamParts.map((p) => (
                        <div key={p.id} className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">{p.users?.full_name || '—'}</p>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusBadge(p.status)}`}>
                              {p.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{p.users?.email || '—'}</p>
                          <p className="text-xs text-slate-500 capitalize">Role: {p.role_in_team}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="p-5 text-center text-slate-400 text-sm">No participants have joined this team yet.</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
