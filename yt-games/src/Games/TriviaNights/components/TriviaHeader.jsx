import React from 'react';
import TimerIcon from '../../Utils/icons/TimerIcon';
import GameProgressDisplay from '../../Utils/utils_gameplay/GameProgressDisplay';

function TriviaHeader({ timeLeft, gamePhase, currentQuestionIndex, totalQuestions }) {
  return (
    <div className="mb-1 px-2 pb-2 border-b border-gray-700 flex-shrink-0">
      <div className="flex justify-between items-center">
        <h2 className="text-xl md:text-2xl font-bold text-primary-light">Trivia Quiz</h2>
        <div className={`text-lg md:text-xl font-semibold ${gamePhase === 'answering' && timeLeft > 0 ? 'text-warning-light' : 'text-gray-500'}`}>
          <TimerIcon className="inline-block mr-1" /> {timeLeft > 0 ? `${timeLeft}s` : (gamePhase === 'answer_revealed' ? 'Revealed' : "Time's Up")}
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