import React from 'react';

function GetToKnowGameOver({ gameConfig, gameQuestions, onPlayAgain, onGoHome }) {
  const categoryDisplay = gameConfig?.selectedCategoryNames?.join(', ') || 'the selected categories';
  
  return (
    <div className="text-center p-6 bg-gray-700 rounded-lg shadow-xl">
      <h2 className="text-3xl font-bold text-yellow-400 mb-6">Game Over!</h2>
      {gameQuestions.length === 0 && gameConfig && (
        <p className="text-red-400 mb-4">
          No questions were available to play for {categoryDisplay}.
        </p>
      )}
      <p className="text-gray-200 mb-6">Thanks for playing Get to Know!</p>
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <button
          onClick={onPlayAgain}
          className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg text-lg transition duration-200"
        >
          Play Again
        </button>
        <button
          onClick={onGoHome}
          className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg text-lg transition duration-200"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default GetToKnowGameOver;