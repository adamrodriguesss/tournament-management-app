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

  // const statusBadge = (status: string) => {
  //   switch (status) {
  //     case 'confirmed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
  //     case 'rejected':
  //     case 'disqualified': return 'bg-red-500/10 text-red-500 border-red-500/20';
  //     default: return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  //   }
  // };

  //teams.tsx
  const statusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':    return 'bg-pixel-green/10 text-pixel-green-dim border-pixel-green-dim';
      case 'rejected':
      case 'disqualified': return 'bg-pixel-red/10 text-pixel-red border-pixel-red';
      default:             return 'bg-amber-500/10 text-amber-400 border-amber-500';
    }
  };

  return (
    <AdminLayout user={user} activeItem="Team Approvals" tournamentName={tournament.name}>
      <div className="mb-2">
        <button
          onClick={() => navigate('/admin/tournaments')}
          className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate hover:text-pixel-gold transition-colors tracking-wide"
        >
          ← BACK
        </button>
      </div>

      <div className="mb-8 border-l-4 border-pixel-gold pl-4 py-1">
        <h1 className="font-[family-name:var(--font-pixel)] text-[11px] text-pixel-gold leading-relaxed tracking-wide">
          {tournament.name.toUpperCase()}
        </h1>
        <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate mt-1">
          Team Management Queue
        </p>
      </div>

      {teams.length === 0 ? (
        <div
          className="bg-pixel-card border-[3px] border-pixel-border p-12 text-center"
          style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
        >
          <span className="text-5xl mb-4 block opacity-40">👥</span>
          <h3 className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate-light mb-2 leading-relaxed">
            NO TEAMS REGISTERED
          </h3>
          <p className="font-[family-name:var(--font-vt)] text-[22px] text-pixel-slate">
            No teams have registered for this tournament yet.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {teams.map((team) => {
            const teamParts = getTeamParticipants(team.id);
            const pendingCount = teamParts.filter((p) => p.status === 'pending').length;

            return (
              <div
                key={team.id}
                className="bg-pixel-card border-[3px] border-pixel-border overflow-hidden relative"
                style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
              >
                {/* gradient top accent */}
                <div
                  className="absolute top-0 left-0 right-0 h-[3px]"
                  style={{ background: 'linear-gradient(90deg, var(--color-pixel-gold), var(--color-pixel-purple))' }}
                />

                {/* Team Header */}
                <div className="p-4 sm:p-5 border-b-[3px] border-pixel-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                      <h3 className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate-light leading-relaxed">
                        {team.name.toUpperCase()}
                      </h3>
                      <span className={`font-[family-name:var(--font-pixel)] text-[12px] px-2 py-0.5 border-2 tracking-wide ${statusBadge(team.status)}`}>
                        {team.status.toUpperCase()}
                      </span>
                      {pendingCount > 0 && (
                        <span className="font-[family-name:var(--font-pixel)] text-[12px] px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/40 tracking-wide">
                          {pendingCount} PENDING
                        </span>
                      )}
                    </div>
                    <p className="font-[family-name:var(--font-vt)] text-[26px] text-pixel-slate">
                      {team.department} · Code:{' '}
                      <code className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-cyan tracking-[3px]">
                        {team.registration_token}
                      </code>
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {team.status === 'pending' && (
                      <Button variant="primary" onClick={() => handleConfirmTeam(team.id)}>
                        CONFIRM TEAM
                      </Button>
                    )}
                    {team.status !== 'disqualified' && (
                      <Button variant="danger" onClick={() => handleDisqualifyTeam(team.id)}>
                        DISQUALIFY
                      </Button>
                    )}
                  </div>
                </div>

                {teamParts.length > 0 ? (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-pixel-border bg-pixel-dark">
                            {['Name', 'Email', 'Role', 'Status'].map((h) => (
                              <th
                                key={h}
                                className="px-5 py-3 text-left font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate uppercase tracking-[2px]"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {teamParts.map((p) => (
                            <tr
                              key={p.id}
                              className="border-b border-pixel-border last:border-0 hover:bg-pixel-dark/50 transition-colors"
                            >
                              <td className="px-5 py-3 font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate-light leading-relaxed">
                                {p.users?.full_name || '—'}
                              </td>
                              <td className="px-5 py-3 font-[family-name:var(--font-vt)] text-[26px] text-pixel-slate">
                                {p.users?.email || '—'}
                              </td>
                              <td className="px-5 py-3 font-[family-name:var(--font-vt)] text-[26px] text-pixel-slate capitalize">
                                {p.role_in_team}
                              </td>
                              <td className="px-5 py-3">
                                <span className={`font-[family-name:var(--font-pixel)] text-[12px] px-2 py-0.5 border tracking-wide ${statusBadge(p.status)}`}>
                                  {p.status.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="sm:hidden divide-y-2 divide-pixel-border">
                      {teamParts.map((p) => (
                        <div key={p.id} className="p-4 space-y-2 bg-pixel-dark/30">
                          <div className="flex items-center justify-between">
                            <p className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate-light leading-relaxed">
                              {p.users?.full_name || '—'}
                            </p>
                            <span className={`font-[family-name:var(--font-pixel)] text-[12px] px-2 py-0.5 border tracking-wide ${statusBadge(p.status)}`}>
                              {p.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate">
                            {p.users?.email || '—'}
                          </p>
                          <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate capitalize">
                            Role: {p.role_in_team}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="p-6 text-center">
                    <p className="font-[family-name:var(--font-vt)] text-[22px] text-pixel-slate">
                      No participants have joined this team yet.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}