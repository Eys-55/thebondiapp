import React from 'react';
import GameProgressDisplay from '../../Utils/utils_gameplay/GameProgressDisplay';

function EveryoneWhosHeader({ gameConfig, gamePhase, currentCardNumber, totalCards }) {
  if (!gameConfig) {
    return null;
  }

  const categoryDisplay = gameConfig.selectedCategoryNames?.join(', ') || 'N/A';
  const displayTotalCards = gameConfig.numberOfCards || 0;

  return (
    <div className="mb-6 p-3 bg-gray-800 rounded-lg shadow text-center">
      <h1 className="text-2xl font-bold text-primary-light">Everyone Who's...</h1>
      <p className="text-gray-300 text-sm">
        Categories: <span className="font-semibold">{categoryDisplay}</span> |
        Total Cards: {displayTotalCards}
      </p>
      {gamePhase !== 'loading' && gamePhase !== 'game_over' && totalCards > 0 && (
        <GameProgressDisplay
          currentTurn={currentCardNumber} // This should represent the count of revealed/active card
          totalTurns={totalCards}    // This is the actual number of cards loaded for the game
          turnLabel="Card"
          className="text-sm text-center text-gray-300 mt-2"
        />
      )}
    </div>
  );
}

export default EveryoneWhosHeader;