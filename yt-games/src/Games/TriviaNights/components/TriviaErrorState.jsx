import React from 'react';

function TriviaErrorState({ onGoToSetup }) {
  return (
    <div className="max-w-lg mx-auto p-8 bg-gray-800 rounded-lg shadow-xl text-center border border-danger">
      <h2 className="text-2xl font-bold mb-4 text-danger-light">Game Setup Error</h2>
      <p className="text-lg mb-6 text-textPrimary">
        There was an issue setting up the game. Please return to the setup page and try again.
      </p>
      <button
        onClick={onGoToSetup}
        className="bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-6 rounded"
      >
        Back to Setup
      </button>
    </div>
  );
}

export default TriviaErrorState;