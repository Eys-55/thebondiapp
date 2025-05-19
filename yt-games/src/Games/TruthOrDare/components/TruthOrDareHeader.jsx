import React from 'react';
import GameProgressDisplay from '../../Utils/utils_gameplay/GameProgressDisplay';

function TruthOrDareHeader({ gameConfig, turnsPlayed }) {
  if (!gameConfig) return null;

  return (
    <div>
      <h2 className="text-3xl font-bold text-center text-blue-400 mb-2">Truth or Dare!</h2>
      <div className="text-xs text-center text-gray-400 mb-1">
        Mode: {gameConfig.gameMode} | Player Order: {gameConfig.turnProgression}
      </div>
      {gameConfig.gameMode === 'classic' && gameConfig.selectedCategory && (
        <div className="text-xs text-center text-gray-400">
          Category: {gameConfig.selectedCategory}
        </div>
      )}
      {gameConfig.numberOfTurns > 0 && (
        <GameProgressDisplay
          currentTurn={turnsPlayed + 1}
          totalTurns={gameConfig.numberOfTurns}
          turnLabel="Turn"
          className="text-sm text-center text-gray-300 mt-1 mb-3"
        />
      )}
    </div>
  );
}

export default TruthOrDareHeader;