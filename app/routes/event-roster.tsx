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
        <button className="text-slate-400 hover:text-slate-50 text-sm mb-6 transition-colors inline-block font-medium" onClick={() => navigate(`/dashboard/team/${registration.team_id}`)}>
          ←
        </button>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 md:p-8">
          <div className="mb-6 border-b border-slate-700 pb-6">
            <h1 className="text-2xl font-bold mb-2">Manage Event Roster</h1>
            <p className="text-slate-400 text-sm">Select the team members who will participate in this event.</p>
          </div>

          {error && <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-sm text-red-500 mb-6">{error}</div>}
          {success && <div className="p-3 bg-emerald-500/10 border border-emerald-500/50 rounded-lg text-sm text-emerald-500 mb-6">Roster updated successfully!</div>}

          <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-900/50 border border-slate-700 p-4 rounded-lg text-sm">
            <div>
              <p className="text-slate-500 uppercase text-xs tracking-wide">Event</p>
              <p className="font-semibold">{event.name}</p>
            </div>
            <div>
              <p className="text-slate-500 uppercase text-xs tracking-wide">Team</p>
              <p className="font-semibold">{team.name}</p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-500 uppercase text-xs tracking-wide mb-1">Participants Limit</p>
              <div className="flex items-center gap-3 w-full">
                <div className="flex-1 bg-slate-800 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      maxParticipants && selectedIds.size > maxParticipants ? 'bg-red-500' :
                      maxParticipants && selectedIds.size === maxParticipants ? 'bg-emerald-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: maxParticipants ? `${Math.min((selectedIds.size / maxParticipants) * 100, 100)}%` : '100%' }}
                  />
                </div>
                <span className={`text-xs font-mono font-medium ${maxParticipants && selectedIds.size > maxParticipants ? 'text-red-400' : 'text-slate-300'}`}>
                  {selectedIds.size} / {maxParticipants || '∞'}
                </span>
              </div>
            </div>
          </div>

          <h3 className="font-medium text-slate-300 mb-3">Confirmed Team Members</h3>
          <div className="space-y-2 mb-8">
            {approvedMembers.length === 0 ? (
              <p className="text-sm text-slate-500">No approved members found in this team.</p>
            ) : (
              approvedMembers.map((member: any) => {
                const isSelected = selectedIds.has(member.id);
                const isDisabled = !isSelected && maxParticipants && selectedIds.size >= maxParticipants;
                
                return (
                  <div 
                    key={member.id} 
                    onClick={() => { if (!isDisabled) handleToggle(member.id); }}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer select-none
                      ${isSelected ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors
                        ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500 bg-slate-800'}
                      `}>
                        {isSelected && <span className="text-white text-xs leading-none">✓</span>}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.users?.full_name}</p>
                        <p className="text-xs text-slate-400 capitalize">{member.role_in_team}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-700">
            <Button variant="secondary" onClick={() => navigate(`/dashboard/team/${registration.team_id}`)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Roster'}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
