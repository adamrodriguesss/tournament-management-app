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
// teamcard
  return (
  <div className="bg-pixel-card border-[3px] border-pixel-border p-5 flex flex-col h-full relative"
    style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
  >
    {/* top accent */}
    <div className="absolute top-0 left-0 right-0 h-[3px]"
      style={{ background: 'linear-gradient(90deg, var(--color-pixel-gold), var(--color-pixel-purple))' }}
    />

    {/* Header */}
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div className="flex-1 min-w-0">
        <h3 className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate-light truncate leading-relaxed"
          title={team.name}>
          {team.name.toUpperCase()}
        </h3>
        <p className="font-[family-name:var(--font-vt)] text-[26px] text-pixel-slate truncate mt-1"
          title={tournament.name}>
          {tournament.name}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Team status badge */}
        <span className={`
          font-[family-name:var(--font-pixel)] text-[12px] px-2 py-1 border-[2px] tracking-wide
          ${team.status === 'confirmed'
            ? 'bg-pixel-green/10 text-pixel-green-dim border-pixel-green-dim'
            : team.status === 'disqualified'
            ? 'bg-pixel-red/10 text-pixel-red border-pixel-red'
            : 'bg-amber-500/10 text-amber-400 border-amber-500'}
        `}>
          {team.status === 'confirmed' ? '● ' : team.status === 'disqualified' ? '✕ ' : '⧖ '}
          {team.status.toUpperCase()}
        </span>

        <a
          href={`/dashboard/team/${team.id}`}
          className="font-[family-name:var(--font-pixel)] text-[12px] px-3 py-1.5 border-2 border-pixel-cyan-dim text-pixel-cyan bg-transparent hover:bg-pixel-cyan/5 transition-colors tracking-wide whitespace-nowrap
            [box-shadow:2px_2px_0_var(--color-pixel-cyan-dim)] active:translate-x-[2px] active:translate-y-[2px] active:[box-shadow:none]"
        >
          VIEW TEAM
        </a>
      </div>
    </div>

    {/* Role / Status Grid */}
    <div className="grid grid-cols-2 gap-4 mt-auto mb-4 bg-pixel-dark border-2 border-pixel-border p-3"
      style={{ boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.4)' }}
    >
      <div>
        <p className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate uppercase tracking-[2px] mb-1">Your Role</p>
        <p className="font-[family-name:var(--font-vt)] text-[22px] text-pixel-slate-light capitalize">
          {participation.role_in_team}
        </p>
      </div>
      <div>
        <p className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate uppercase tracking-[2px] mb-1">Your Status</p>
        <span className={`
          font-[family-name:var(--font-pixel)] text-[12px] px-2 py-0.5 border
          ${participation.status === 'confirmed'
            ? 'bg-pixel-green/10 text-pixel-green-dim border-pixel-green-dim'
            : participation.status === 'rejected'
            ? 'bg-pixel-red/10 text-pixel-red border-pixel-red'
            : 'bg-amber-500/10 text-amber-400 border-amber-500'}
        `}>
          {participation.status.toUpperCase()}
        </span>
      </div>
    </div>

    {/* Captain Section */}
    {participation.role_in_team === 'captain' && (
      <div className="mt-2 space-y-4 pt-4 border-t-2 border-pixel-border">
        {/* Join Code */}
        <div>
          <p className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate uppercase tracking-[2px] mb-2">
            Team Join Code
          </p>
          <code className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-cyan bg-pixel-black border-2 border-pixel-border px-3 py-2 inline-block tracking-[6px]"
            style={{ boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.5)' }}
          >
            {team.registration_token}
          </code>
        </div>

        {/* Pending Members */}
        {teamPendingMembers.length > 0 && (
          <div className="pt-2">
            <p className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate uppercase tracking-[2px] mb-3">
              Pending Requests ({teamPendingMembers.length})
            </p>
            <div className="space-y-2">
              {teamPendingMembers.map((member: any) => (
                <div key={member.id}
                  className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3 bg-pixel-black border-2 border-pixel-border p-3"
                  style={{ boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.4)' }}
                >
                  <div className="overflow-hidden">
                    <p className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate-light truncate leading-relaxed"
                      title={member.users?.full_name}>
                      {member.users?.full_name}
                    </p>
                    <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate truncate"
                      title={member.users?.email}>
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
      </div>
    )}
  </div>
);
}

