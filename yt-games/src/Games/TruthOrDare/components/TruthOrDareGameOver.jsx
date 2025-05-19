import React from 'react';

function TruthOrDareGameOver({ numberOfTurns, onPlayAgain, onGoHome }) {
  return (
    <div className="max-w-xl mx-auto p-6 bg-gray-700 rounded-lg shadow-xl text-white text-center">
      <h2 className="text-3xl font-bold text-yellow-400 mb-6">Game Over!</h2>
      <p className="text-gray-200 mb-6">
        {numberOfTurns > 0 ? `All ${numberOfTurns} turns have been played.` : "Hope you had fun!"}
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <button
          onClick={onPlayAgain}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
        >
          Play Again
        </button>
        <button
          onClick={onGoHome}
          className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg text-lg"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default TruthOrDareGameOver;