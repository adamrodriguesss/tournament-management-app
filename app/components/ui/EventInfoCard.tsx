import { Button } from './Button';

interface EventInfoCardProps {
  event: any;
  registrations: any[];
  bottomDescription?: string;
}

export function EventInfoCard({ event, registrations, bottomDescription }: EventInfoCardProps) {
  return (
    <div
      className="bg-pixel-card border-[3px] border-pixel-border p-6 relative h-fit"
      style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-pixel-cyan-dim" />
      <h3 className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate-light mb-5 tracking-wide leading-relaxed">
        EVENT INFO
      </h3>
      <div className="space-y-6">
        <div>
          <p className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate uppercase tracking-[1px] mb-2 opacity-60">Status</p>
          <span className={`font-[family-name:var(--font-pixel)] text-[10px] px-2 py-1 border tracking-wide capitalize
            ${event.status === 'completed' 
              ? 'bg-pixel-slate/10 border-pixel-border text-pixel-slate' 
              : 'bg-pixel-green/10 border-pixel-green-dim text-pixel-green-dim'}`}>
            {event.status.toUpperCase()}
          </span>
        </div>

        <div>
          <p className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate uppercase tracking-[1px] mb-1 opacity-60">Format & Type</p>
          <p className="font-[family-name:var(--font-vt)] text-[22px] text-pixel-slate-light capitalize">
            {event.format} · {event.type}
          </p>
        </div>

        <div>
          <p className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate uppercase tracking-[1px] mb-3 opacity-60">
            Confirmed Registrations ({registrations.length})
          </p>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {registrations.length > 0 ? (
              registrations.map((reg: any) => {
                const teamName = reg.team?.name || reg.participant?.team?.name;
                const participantName = reg.participant?.user?.full_name;
                const dept = reg.team?.department || reg.participant?.team?.department;

                return (
                  <div key={reg.id} className="border-l-2 border-pixel-border pl-3 py-1">
                    <p className="font-[family-name:var(--font-pixel)] text-[11px] text-pixel-gold truncate">
                      {event.type === 'individual' && participantName ? (
                        <>
                          {participantName.toUpperCase()}
                          <span className="block text-[9px] text-pixel-slate mt-0.5 opacity-70 truncate">
                            FROM {teamName?.toUpperCase()}
                          </span>
                        </>
                      ) : (
                        teamName?.toUpperCase()
                      )}
                    </p>
                    <p className="font-[family-name:var(--font-vt)] text-[16px] text-pixel-slate">
                      {dept}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="font-[family-name:var(--font-vt)] text-[18px] text-pixel-slate italic opacity-50">
                No registrations yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {bottomDescription && (
        <div className="mt-8 pt-5 border-t-2 border-pixel-border">
          <p className="font-[family-name:var(--font-vt)] text-[22px] text-pixel-slate leading-relaxed">
            {bottomDescription}
          </p>
        </div>
      )}
    </div>
  );
}
