import React from 'react';
import GameProgressDisplay from '../../Utils/utils_gameplay/GameProgressDisplay';

function GetToKnowHeader({ gameConfig, gamePhase, gameQuestions, currentProgTurn, totalProgTurns }) {
  if (!gameConfig) {
    return null;
  }

  return (
    <div className="mb-6 p-3 bg-gray-800 rounded-lg shadow text-center">
      <h1 className="text-2xl font-bold text-primary-light">Get to Know</h1>
      <p className="text-gray-300">
        Category: <span className="font-semibold">{gameConfig.selectedCategory}</span> |
        Questions: {gameConfig.numberOfQuestions} |
        Order: {gameConfig.playerSelectionOrder}
      </p>
      {gamePhase !== 'loading' && gamePhase !== 'game_ended' && gameQuestions && gameQuestions.length > 0 && totalProgTurns > 0 && (
        <GameProgressDisplay
          currentTurn={currentProgTurn}
          totalTurns={totalProgTurns}
          turnLabel="Card"
          className="text-sm text-center text-gray-300 mt-2"
        />
      )}
    </div>
  );
}

export default GetToKnowHeader;