import React from 'react';

function TruthOrDareTurnEnd({ doerName, onNextTurn }) {
  return (
    <div className="text-center my-6 p-8 bg-gray-700 rounded-lg shadow-lg">
      <p className="text-2xl text-gray-200 mb-4">
        Turn for <span className="font-bold text-blue-400">{doerName}</span> is over.
      </p>
      <button
        onClick={onNextTurn}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-xl"
      >
        Next Turn
      </button>
    </div>
  );
}

export default TruthOrDareTurnEnd;