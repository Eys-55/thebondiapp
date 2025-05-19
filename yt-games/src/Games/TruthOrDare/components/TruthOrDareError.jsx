import React from 'react';

function TruthOrDareError({ message, category, onGoToSetup }) {
  return (
    <div className="max-w-xl mx-auto p-6 bg-gray-800 rounded-lg shadow-xl text-white text-center">
      <h2 className="text-2xl font-bold text-red-400 mb-4">Error!</h2>
      <p className="text-gray-200 mb-1">{message}</p>
      {category && <p className="text-gray-200 mb-6">Selected category: "{category}"</p>}
      <button
        onClick={onGoToSetup}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg"
      >
        Back to Setup
      </button>
    </div>
  );
}

export default TruthOrDareError;