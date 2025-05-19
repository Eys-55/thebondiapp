import React from 'react';

function GetToKnowQuestionDisplay({ player, currentQuestion, gameQuestions, onNextOrEndTurn }) {
  return (
    <div className="text-center p-6 bg-gray-700 rounded-lg shadow-xl">
      <p className="text-xl text-gray-300 mb-3">
        For <span className="font-semibold text-yellow-400">{player?.name || 'Player'}</span>:
      </p>
      <div className="text-2xl md:text-3xl text-white my-6 p-6 border-2 border-gray-600 rounded-lg bg-gray-800 min-h-[120px] flex items-center justify-center shadow-inner">
        {currentQuestion}
      </div>
      <button
        onClick={onNextOrEndTurn}
        className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg text-lg transition duration-200"
      >
        {gameQuestions.every(q => q.revealed) ? 'Show Results' : 'Done - Next Player'}
      </button>
    </div>
  );
}

export default GetToKnowQuestionDisplay;