import { useState, useEffect } from 'react';
import { redirect, useNavigate, useRevalidator } from 'react-router';
import { getSession, getProfile } from '../services/auth';
import { getEventRegistrationDetails, getEventTeamParticipants, updateTeamEventRoster } from '../services/events';
import { getParticipantsByTeamIds } from '../services/participants';
import { Button } from '../components/ui/Button';
import { AppLayout } from '../components/layout/AdminLayout';
import type { Route } from './+types/event-roster';

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const session = await getSession();
  if (!session) return redirect("/login");

  const { data: profile } = await getProfile(session.user.id);
  if (!profile) return redirect("/login");

  const registrationId = params.registrationId;

  const { data: registration } = await getEventRegistrationDetails(registrationId);
  if (!registration || !registration.events || !registration.teams) {
    return redirect("/dashboard");
  }

  const teamMembers = await getParticipantsByTeamIds([registration.team_id]);
  const approvedMembers = teamMembers.filter((m: any) => m.status === 'confirmed');

  // Verify the user is indeed the captain of this team
  const isCaptain = approvedMembers.some((m: any) => m.user_id === profile.id && m.role_in_team === 'captain');
  if (!isCaptain && profile.role !== 'admin') {
    return redirect("/dashboard");
  }

  const { data: currentRoster } = await getEventTeamParticipants([registrationId]);

  return {
    profile,
    registration,
    approvedMembers,
    currentRoster,
  };
}

export default function EventRoster({ loaderData }: { loaderData: any }) {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { profile, registration, approvedMembers, currentRoster } = loaderData;

  const event = registration.events;
  const team = registration.teams;

  // Initialize selected members from the DB roster
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Sync local state if currentRoster from DB changes (e.g. navigation)
  useEffect(() => {
    setSelectedIds(new Set<string>(currentRoster.map((r: any) => r.participant_id)));
  }, [currentRoster]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const maxParticipants = event.max_participants_per_team;

  const handleToggle = (participantId: string) => {
    const newKeys = new Set(selectedIds);
    if (newKeys.has(participantId)) {
      newKeys.delete(participantId);
    } else {
      if (maxParticipants && newKeys.size >= maxParticipants) {
        return; // Can't add more than maximum
      }
      newKeys.add(participantId);
    }
    setSelectedIds(newKeys);
    setSuccess(false); // hide success message if making new changes
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    const { error: saveError } = await updateTeamEventRoster(registration.id, Array.from(selectedIds));

    if (saveError) {
      setError(saveError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    revalidator.revalidate();
  };

  return (
    <AppLayout user={{ ...profile, role: 'participant' }} activeItem="Dashboard">
  <div className="max-w-2xl w-full">

    <div className="mb-6">
      <Button variant="secondary" onClick={() => navigate(`/dashboard/team/${registration.team_id}`)}>
        BACK
      </Button>
    </div>

    <div
      className="bg-pixel-panel border-[3px] border-pixel-border p-6 md:p-8"
      style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
    >
      {/* Header */}
      <div className="mb-6 border-b-2 border-pixel-border pb-6">
        <h1 className="font-[family-name:var(--font-pixel)] text-[11px] text-pixel-gold mb-3 leading-relaxed tracking-wide">
          MANAGE EVENT ROSTER
        </h1>
        <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate">
          Select the team members who will participate in this event.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="border-2 border-pixel-red bg-pixel-red/10 p-3 font-[family-name:var(--font-pixel)] text-[12px] text-pixel-red tracking-wide leading-relaxed mb-6">
          ⚠ {error}
        </div>
      )}
      {success && (
        <div className="border-2 border-pixel-green-dim bg-pixel-green/10 p-3 font-[family-name:var(--font-pixel)] text-[12px] text-pixel-green-dim tracking-wide leading-relaxed mb-6">
          ✓ ROSTER UPDATED SUCCESSFULLY!
        </div>
      )}

      {/* Event / Team Info Grid */}
      <div
        className="grid grid-cols-2 gap-4 mb-8 bg-pixel-dark border-2 border-pixel-border p-4"
        style={{ boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.5)' }}
      >
        <div>
          <p className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate uppercase tracking-[2px] mb-1">Event</p>
          <p className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate-light leading-relaxed">{event.name}</p>
        </div>
        <div>
          <p className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate uppercase tracking-[2px] mb-1">Team</p>
          <p className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate-light leading-relaxed">{team.name}</p>
        </div>

        {/* Progress Bar */}
        <div className="col-span-2">
          <p className="font-[family-name:var(--font-pixel)] text-[12px] text-pixel-slate uppercase tracking-[2px] mb-2">Participants Limit</p>
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-[10px] bg-[#0a0a0f] border-2 border-pixel-border">
              <div
                className={`h-full transition-all ${
                  maxParticipants && selectedIds.size > maxParticipants
                    ? 'bg-pixel-red'
                    : maxParticipants && selectedIds.size === maxParticipants
                    ? 'bg-pixel-green-dim'
                    : 'bg-pixel-cyan-dim'
                }`}
                style={{ width: maxParticipants ? `${Math.min((selectedIds.size / maxParticipants) * 100, 100)}%` : '100%' }}
              />
            </div>
            <span className={`font-[family-name:var(--font-pixel)] text-[10px] ${
              maxParticipants && selectedIds.size > maxParticipants ? 'text-red-400' : 'text-pixel-cyan'
            }`}>
              {selectedIds.size} / {maxParticipants || '∞'}
            </span>
          </div>
        </div>
      </div>

      {/* Member List */}
      <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate tracking-[2px] mb-3">
        CONFIRMED MEMBERS
      </h3>
      <div className="space-y-2 mb-8">
        {approvedMembers.length === 0 ? (
          <p className="font-[family-name:var(--font-vt)] text-[22px] text-pixel-slate">No approved members found in this team.</p>
        ) : (
          approvedMembers.map((member: any) => {
            const isSelected = selectedIds.has(member.id);
            const isDisabled = !isSelected && maxParticipants && selectedIds.size >= maxParticipants;

            return (
              <div
                key={member.id}
                onClick={() => { if (!isDisabled) handleToggle(member.id); }}
                className={`flex items-center justify-between p-3 border-2 transition-all cursor-pointer select-none
                  ${isSelected
                    ? 'bg-pixel-cyan/5 border-pixel-cyan-dim'
                    : 'bg-pixel-dark border-pixel-border hover:border-pixel-slate'}
                  ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}
                `}
                style={isSelected ? { boxShadow: '2px 2px 0 var(--color-pixel-cyan-dim)' } : {}}
              >
                <div className="flex items-center gap-3">
                  {/* Pixel checkbox */}
                  <div className={`w-[18px] h-[18px] border-2 flex items-center justify-center flex-shrink-0 transition-colors
                    ${isSelected ? 'bg-pixel-cyan-dim border-pixel-cyan' : 'bg-[#0a0a0f] border-pixel-slate'}
                  `}>
                    {isSelected && <span className="text-pixel-black text-[11px] font-bold leading-none">✓</span>}
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate-light leading-relaxed">
                      {member.users?.full_name}
                    </p>
                    <p className="font-[family-name:var(--font-vt)] text-[24px] text-pixel-slate capitalize">
                      {member.role_in_team}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t-2 border-pixel-border">
        <Button variant="secondary" onClick={() => navigate(`/dashboard/team/${registration.team_id}`)}>
          CANCEL
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={loading}>
          {loading ? 'SAVING...' : 'SAVE ROSTER'}
        </Button>
      </div>
    </div>

  </div>
</AppLayout>
  );
}
