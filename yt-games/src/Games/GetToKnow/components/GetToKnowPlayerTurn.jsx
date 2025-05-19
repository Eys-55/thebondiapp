import React from 'react';

function GetToKnowPlayerTurn({ player, gameQuestions, onCardClick, onFinishGame }) {
  if (!player) {
    return <p className="text-center text-xl">Setting up player turn...</p>;
  }

  const gridCols = gameQuestions.length <= 2 ? gameQuestions.length : (gameQuestions.length === 4 ? 2 : 3);
  const smGridCols = gameQuestions.length <= 3 ? gameQuestions.length : (gameQuestions.length <= 6 ? 3 : (gameQuestions.length <= 8 ? 4 : 5));

  // Dynamic classes for Tailwind JIT compiler
  const gridClasses = `grid-cols-${gridCols} sm:grid-cols-${smGridCols}`;
  // Ensure Tailwind can find these classes if they are fully dynamic by listing them if necessary,
  // or ensure the range of numbers is small and Tailwind's JIT picks them up.
  // e.g. /* grid-cols-1 grid-cols-2 grid-cols-3 sm:grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 sm:grid-cols-4 sm:grid-cols-5 */

  return (
    <div className="text-center p-4 md:p-6 bg-gray-700 rounded-lg shadow-xl">
      <p className="text-2xl text-gray-200 mb-2">
        <span className="font-bold text-yellow-400">{player.name}</span>, it's your turn!
      </p>
      <p className="text-lg text-gray-300 mb-6">Pick a question card:</p>
      <div className={`grid gap-3 sm:gap-4 ${gridClasses} max-w-xl mx-auto`}>
        {gameQuestions.map((q, index) => (
          <button
            key={q.id}
            onClick={() => onCardClick(q.id)}
            disabled={q.revealed}
            className={`p-4 aspect-[3/2] sm:aspect-square flex items-center justify-center rounded-lg text-white font-semibold text-lg sm:text-xl transition-all duration-200 ease-in-out transform focus:outline-none focus:ring-2 focus:ring-opacity-75
                        ${q.revealed
                          ? 'bg-gray-500 text-gray-400 cursor-not-allowed opacity-60'
                          : 'bg-indigo-500 hover:bg-indigo-600 hover:scale-105 focus:ring-indigo-400'}`}
          >
            {q.revealed ? 'Answered' : `Card ${index + 1}`}
          </button>
        ))}
      </div>
      {gameQuestions.length === 0 && <p className="text-gray-400 mt-4">No questions loaded.</p>}
      {(gameQuestions.length > 0 && gameQuestions.every(q => q.revealed)) && (
           <p className="mt-6 text-green-400 font-semibold">All questions answered! You can finish the game.</p>
      )}
      <button
        onClick={onFinishGame}
        className="mt-8 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg text-lg transition duration-200"
      >
        End Game
      </button>
    </div>
  );
}

export default GetToKnowPlayerTurn;