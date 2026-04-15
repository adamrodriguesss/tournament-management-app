import React from 'react';

export interface BracketProps {
  matches: any[];
  onMatchClick?: (match: any) => void;
  isReadOnly?: boolean;
}

export function Bracket({ matches, onMatchClick, isReadOnly = false }: BracketProps) {
  if (!matches || matches.length === 0) return null;

  // Find the final match (the one that no other match points to via next_match_id)
  // We can also find it by round_number. The highest round is the final.
  const maxRound = Math.max(...matches.map(m => m.round_number));
  const finalMatches = matches.filter(m => m.round_number === maxRound);

  // If there's multiple for some reason, we'll just render them side-by-side
  return (
    <div className="overflow-x-auto min-h-[500px] p-4 sm:p-8 flex items-center justify-start min-w-max cursor-pointer">
      {finalMatches.map(finalMatch => (
        <MatchNode
          key={finalMatch.id}
          match={finalMatch}
          allMatches={matches}
          onMatchClick={onMatchClick}
          isReadOnly={isReadOnly}
          isFinal={true}
        />
      ))}
    </div>
  );
}

interface MatchNodeProps {
  match: any;
  allMatches: any[];
  onMatchClick?: (match: any) => void;
  isReadOnly?: boolean;
  isFinal?: boolean;
}

const MatchNode: React.FC<MatchNodeProps> = ({ match, allMatches, onMatchClick, isReadOnly, isFinal }) => {
  // Find children (matches in previous rounds that feed into this match)
  const children = allMatches
    .filter(m => m.next_match_id === match.id)
    .sort((a, b) => {
      // Try to ensure consistent ordering based on match creation, or just rely on id
      // Since generateBracket creates them in order, a's id vs b's id is stable.
      return a.id.localeCompare(b.id);
    });

  // Calculate the bounds for the vertical line based on child count
  // If 2 children: top 25%, bottom 25% connects their centers perfectly when justify-around is used.
  // If 1 child: top 50%, bottom 50% (just a dot, no vertical span needed).
  const verticalLineClass = children.length === 2
    ? "before:top-[25%] before:bottom-[25%]"
    : "before:top-[50%] before:bottom-[50%]";

  return (
    <div className="flex items-stretch">
      {/* Children Column */}
      {children.length > 0 && (
        <div className={`
            flex flex-col justify-around relative
            before:content-[''] before:absolute before:right-0 before:border-r-[3px] before:border-pixel-border
            ${verticalLineClass}
          `}
        >
          {children.map((child: any) => (
            <div key={child.id} className="relative flex items-center pr-8 cursor-pointer
               after:content-[''] after:absolute after:top-1/2 after:right-0 after:w-8 after:border-t-[3px] after:border-pixel-border after:-translate-y-[1.5px]"
            >
              <MatchNode
                match={child}
                allMatches={allMatches}
                onMatchClick={onMatchClick}
                isReadOnly={isReadOnly}
                isFinal={false}
              />
            </div>
          ))}
        </div>
      )}

      {/* Horizontal line into parent */}
      {children.length > 0 && (
        <div className="flex items-center">
          <div className="w-8 border-t-[3px] border-pixel-border"></div>
        </div>
      )}

      {/* Parent Match Box */}
      <div className="flex flex-col justify-center py-4 w-[260px] shrink-0">
        <h4 className="font-[family-name:var(--font-pixel)] text-[9px] text-pixel-gold uppercase tracking-widest text-center leading-relaxed mb-2">
          {isFinal ? '★ FINAL ★' : `ROUND ${match.round_number}`}
        </h4>
        <div
          onClick={() => !isReadOnly && onMatchClick?.(match)}
          className={`
            bg-pixel-dark border-[3px] overflow-hidden flex flex-col transition-all
            ${match.status === 'completed'
              ? 'border-pixel-cyan-dim bg-pixel-cyan/5'
              : 'border-pixel-border bg-pixel-dark'}
            ${!isReadOnly && match.team_a_id && match.team_b_id && match.status !== 'completed'
              ? 'cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 border-pixel-cyan shadow-[0_0_8px_rgba(0,245,255,0.5)] animate-[pulse_2s_ease-in-out_infinite]'
              : ''}
          `}
          style={{ boxShadow: '2px 2px 0 var(--color-pixel-border)' }}
        >
          {/* Team A */}
          <div className={`p-3 flex justify-between items-center border-b-[3px] border-pixel-border
            ${match.winner_id && match.winner_id === match.team_a_id
              ? 'bg-pixel-gold/10 text-pixel-gold'
              : 'text-pixel-slate-light'}
          `}>
            <span className="font-[family-name:var(--font-vt)] text-[22px] truncate pr-2">
              {match.team_a?.name || <span className="text-pixel-border italic">TBD</span>}
            </span>
            <span className={`font-[family-name:var(--font-pixel)] text-[12px] 
              ${match.winner_id === match.team_a_id ? 'text-pixel-gold' : 'text-pixel-cyan'}`}>
              {match.score_a != null ? match.score_a : '-'}
            </span>
          </div>

          {/* Team B */}
          <div className={`p-3 flex justify-between items-center
            ${match.winner_id && match.winner_id === match.team_b_id
              ? 'bg-pixel-gold/10 text-pixel-gold'
              : 'text-pixel-slate-light'}
          `}>
            <span className="font-[family-name:var(--font-vt)] text-[22px] truncate pr-2">
              {match.team_b?.name || <span className="text-pixel-border italic">TBD</span>}
            </span>
            <span className={`font-[family-name:var(--font-pixel)] text-[12px]
              ${match.winner_id === match.team_b_id ? 'text-pixel-gold' : 'text-pixel-cyan'}`}>
              {match.score_b != null ? match.score_b : '-'}
            </span>
          </div>

          {/* Auto Bye Indicator */}
          {match.status === 'completed' && (!match.team_a_id || !match.team_b_id) && (
            <div className="p-1.5 text-center bg-pixel-black border-t-[3px] border-pixel-border">
              <span className="font-[family-name:var(--font-pixel)] text-[10px] text-pixel-slate tracking-[2px]">
                AUTO BYE
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
