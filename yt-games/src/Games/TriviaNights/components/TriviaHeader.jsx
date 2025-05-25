import React from 'react';
import GameProgressDisplay from '../../Utils/utils_gameplay/GameProgressDisplay';

function TriviaHeader({ timeLeft, gamePhase, currentQuestionIndex, totalQuestions }) {
  return (
    <div className="mb-1 px-2 pb-2 border-b border-gray-700 flex-shrink-0">
      <div className="flex justify-end items-center">
        <div className={`text-lg md:text-xl font-semibold ${gamePhase === 'answering' && timeLeft > 0 && typeof timeLeft === 'number' ? 'text-warning-light' : 'text-gray-500'}`}>
          {timeLeft > 0 && typeof timeLeft === 'number' ? `${timeLeft}s` : (gamePhase === 'answer_revealed' ? 'Revealed' : "Time's Up")}
        </div>
      </div>
      {totalQuestions > 0 && gamePhase !== 'loading' && gamePhase !== 'finished' && (
        <GameProgressDisplay
          currentTurn={currentQuestionIndex + 1}
          totalTurns={totalQuestions}
          turnLabel="Question"
          className="text-sm text-center text-gray-400 mt-1"
        />
      )}
    </div>
  );
}

export default TriviaHeader;