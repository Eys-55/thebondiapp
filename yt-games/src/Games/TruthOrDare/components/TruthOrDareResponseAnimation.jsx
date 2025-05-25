import React from 'react';

function TruthOrDareResponseAnimation({ type, doerName, taskType }) {
  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center z-[1000] animate-fade-in text-white text-center px-4
                  ${type === 'accepted' ? 'bg-green-700' : 'bg-red-700'}`}
    >
      <h2 className="text-4xl font-extrabold mb-6">
        {type === 'accepted' ? 'Accepted!' : 'Wussed Out!'}
      </h2>
      <p className="text-2xl">
        {doerName}
        {type === 'accepted'
          ? ` is taking on the ${taskType}!`
          : ` chickened out of the ${taskType}!`}
      </p>
    </div>
  );
}

export default TruthOrDareResponseAnimation;