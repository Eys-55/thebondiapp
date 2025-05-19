import React from 'react';

function TruthOrDareTaskSelection({ title, currentSelectionText }) {
  return (
    <div className="text-center my-6 p-8 bg-gray-700 rounded-lg shadow-lg">
      <p className="text-2xl text-gray-200 mb-2">{title}</p>
      <p className="text-4xl font-bold text-blue-400 h-12 animate-pulse">
        {currentSelectionText || '...'}
      </p>
    </div>
  );
}

export default TruthOrDareTaskSelection;