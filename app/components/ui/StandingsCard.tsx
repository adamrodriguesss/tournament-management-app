export type Standing = {
  id: string;
  name: string;
  department: string;
  totalPoints: number;
  golds: number;
  silvers: number;
  bronzes: number;
};

type StandingsCardProps = {
  standings: Standing[];
  title?: string;
};

export function StandingsCard({ standings, title = "🏆 STANDINGS" }: StandingsCardProps) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-[2px] w-4 bg-pixel-gold opacity-60" />
        <h3 className="font-[family-name:var(--font-pixel)] text-[13px] text-pixel-gold tracking-wider">
          {title}
        </h3>
      </div>

      {standings.length === 0 ? (
        <div
          className="bg-pixel-card border-[3px] border-pixel-border p-6 text-center"
          style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
        >
          <p className="text-xl font-[family-name:var(--font-vt)] text-pixel-slate">
            No results recorded yet.
          </p>
        </div>
      ) : (
        <div
          className="bg-pixel-card border-[3px] border-pixel-border overflow-hidden"
          style={{ boxShadow: '3px 3px 0 var(--color-pixel-border)' }}
        >
          {standings.map((team: Standing, idx: number) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`;
            const isTop3 = idx < 3;
            
            return (
              <div
                key={team.id}
                className={`flex items-center gap-3 px-4 py-3 border-b-2 border-pixel-border last:border-0
                  ${isTop3 ? 'bg-pixel-dark' : ''}`}
              >
                <span className={`text-xl w-8 text-center shrink-0 ${!isTop3 ? 'font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate' : ''}`}>
                  {medal}
                </span>
                
                <div className="flex-1 min-w-0">
                  <p className={`font-[family-name:var(--font-pixel)] text-[10px] truncate leading-relaxed
                    ${isTop3 ? 'text-pixel-slate-light' : 'text-pixel-slate'}`}>
                    {team.name}
                  </p>
                  <p className="text-lg font-[family-name:var(--font-vt)] text-pixel-slate truncate">
                    {team.department}
                  </p>
                </div>
                
                <div className="text-right shrink-0">
                  <p className={`font-[family-name:var(--font-pixel)] text-[11px] leading-relaxed
                    ${isTop3 ? 'text-pixel-gold' : 'text-pixel-slate'}`}>
                    {team.totalPoints} PTS
                  </p>
                  <div className="flex items-center justify-end gap-1.5 text-base font-[family-name:var(--font-vt)] text-pixel-slate">
                    {team.golds > 0 && <span>🥇{team.golds}</span>}
                    {team.silvers > 0 && <span>🥈{team.silvers}</span>}
                    {team.bronzes > 0 && <span>🥉{team.bronzes}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
