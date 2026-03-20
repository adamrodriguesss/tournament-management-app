import { useRevalidator } from 'react-router';
import { approveParticipant, rejectParticipant } from '../../services/participants';

export function TeamCard({ participation, team, tournament, pendingMembers, profile }: any) {
  const revalidator = useRevalidator();

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
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col h-full">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold truncate max-w-[200px] xl:max-w-[250px]" title={team.name}>{team.name}</h3>
          <p className="text-xs text-slate-400 truncate max-w-[200px] xl:max-w-[250px]" title={tournament.name}>{tournament.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${team.status === 'confirmed'
            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            : team.status === 'disqualified'
              ? 'bg-red-500/10 text-red-500 border-red-500/20'
              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            }`}>
            Team: {team.status}
          </span>
          <a
            href={`/dashboard/team/${team.id}`}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors border border-indigo-500/20 whitespace-nowrap"
          >
            View Team
          </a>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm mt-auto mb-4">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Your Role</p>
          <p className="capitalize truncate">{participation.role_in_team}</p>
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
      </div>

      {participation.role_in_team === 'captain' && (
        <div className="mt-2 space-y-4 pt-4 border-t border-slate-700/50">
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Team Join Code</p>
            <code className="bg-slate-950 px-3 py-1.5 rounded text-indigo-400 font-mono text-sm inline-block tracking-widest">{team.registration_token}</code>
          </div>

          {/* Pending Members Section */}
          {teamPendingMembers.length > 0 && (
            <div className="pt-2">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Pending Requests ({teamPendingMembers.length})</p>
              <div className="space-y-2">
                {teamPendingMembers.map((member: any) => (
                  <div key={member.id} className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium truncate" title={member.users?.full_name}>{member.users?.full_name}</p>
                      <p className="text-xs text-slate-400 truncate" title={member.users?.email}>{member.users?.email}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
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
  );
}

