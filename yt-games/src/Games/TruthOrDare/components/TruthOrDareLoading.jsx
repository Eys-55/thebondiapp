import React from 'react';

function TruthOrDareLoading({ message = "Loading Game & Data..." }) {
  return (
    <div className="text-center py-10 text-xl text-blue-300">
      {message}
    </div>
  );
}

export default TruthOrDareLoading;