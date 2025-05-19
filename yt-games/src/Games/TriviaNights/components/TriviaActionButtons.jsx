import React from 'react';

function TriviaActionButtons({
  gamePhase,
  pendingAwardedPlayerIdsCount,
  awardedPlayerIdsThisRoundCount,
  onShowAnswer,
  onConfirmAwards,
  onNextQuestion,
}) {
  return (
    <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3 mt-auto">
      {gamePhase === 'answering' && (
        <button
          onClick={onShowAnswer}
          className="flex-1 bg-info hover:bg-info-dark text-white font-bold py-3 px-6 rounded-lg text-lg"
        >
          Show Answer
        </button>
      )}
      {(gamePhase === 'answering' || gamePhase === 'answer_revealed') && pendingAwardedPlayerIdsCount > 0 && (
        <button
          onClick={onConfirmAwards}
          className="flex-1 bg-success hover:bg-success-dark text-white font-bold py-3 px-6 rounded-lg text-lg"
        >
          Confirm Awards ({pendingAwardedPlayerIdsCount})
        </button>
      )}
      <button
        onClick={onNextQuestion}
        className={`flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-lg text-lg ${
          (gamePhase === 'loading' || gamePhase === 'finished') ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        disabled={gamePhase === 'loading' || gamePhase === 'finished'}
      >
        {gamePhase === 'answering' && awardedPlayerIdsThisRoundCount === 0 && pendingAwardedPlayerIdsCount === 0
          ? 'Skip Question'
          : 'Next Question'}
      </button>
    </div>
  );
}

export default TriviaActionButtons;