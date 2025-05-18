import React from 'react';

function GameProgressDisplay({
  currentTurn,
  totalTurns,
  currentRound,
  totalRounds,
  turnLabel = "Turn",
  roundLabel = "Round",
  className = "text-sm text-center text-gray-300 mb-3",
}) {
  const showCurrentTurn = typeof currentTurn === 'number';
  const showTotalTurns = typeof totalTurns === 'number' && totalTurns > 0;

  const showCurrentRound = typeof currentRound === 'number';
  const showTotalRounds = typeof totalRounds === 'number' && totalRounds > 0;

  const turnDisplay = showCurrentTurn ? `${turnLabel}: ${currentTurn}${showTotalTurns ? ` / ${totalTurns}` : ''}` : null;
  const roundDisplay = showCurrentRound ? `${roundLabel}: ${currentRound}${showTotalRounds ? ` / ${totalRounds}` : ''}` : null;

  if (!turnDisplay && !roundDisplay) {
    return null;
  }

  return (
    <div className={className}>
      {turnDisplay}
      {turnDisplay && roundDisplay && <span className="mx-2">|</span>}
      {roundDisplay}
    </div>
  );
}

export default GameProgressDisplay;