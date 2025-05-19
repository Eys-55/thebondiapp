import React from 'react';

function TruthOrDareClassicChoice({ doerName, onChoice, truthDisabled, dareDisabled }) {
  return (
    <div className="text-center my-6 p-8 bg-gray-700 rounded-lg shadow-lg">
      <p className="text-3xl font-semibold text-blue-400 mb-6">{doerName}, it's your turn!</p>
      <p className="text-xl text-gray-200 mb-6">Choose your fate:</p>
      <div className="flex justify-center gap-4">
        <button
          onClick={() => onChoice('truth')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-xl disabled:opacity-50"
          disabled={truthDisabled}
        >
          Truth
        </button>
        <button
          onClick={() => onChoice('dare')}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-xl disabled:opacity-50"
          disabled={dareDisabled}
        >
          Dare
        </button>
      </div>
      {(truthDisabled && dareDisabled) && <p className="text-red-400 mt-4">No tasks available for the selected category.</p>}
      {truthDisabled && !dareDisabled && <p className="text-yellow-400 mt-4">No truths available for this category.</p>}
      {dareDisabled && !truthDisabled && <p className="text-yellow-400 mt-4">No dares available for this category.</p>}
    </div>
  );
}

export default TruthOrDareClassicChoice;