import React from 'react';

function TruthOrDarePairChoice({ doerName, commanderName, onChoice }) {
  return (
    <div className="text-center my-6 p-8 bg-gray-700 rounded-lg shadow-lg">
      <p className="text-2xl font-semibold text-gray-100 mb-4">
        {doerName}, what will it be? <span className="text-blue-400">{commanderName}</span> will give you a task.
      </p>
      <div className="flex justify-center gap-4">
        <button
          onClick={() => onChoice('truth')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-xl"
        >
          Truth
        </button>
        <button
          onClick={() => onChoice('dare')}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-xl"
        >
          Dare
        </button>
      </div>
    </div>
  );
}

export default TruthOrDarePairChoice;