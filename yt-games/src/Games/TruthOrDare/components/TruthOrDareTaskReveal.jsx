import React from 'react';

function TruthOrDareTaskReveal({ gameMode, doerName, commanderName, taskType, taskText, onResponse }) {
  return (
    <div className="text-center my-6 p-6 bg-gray-700 rounded-lg shadow-lg">
      <p className="text-2xl font-semibold text-blue-400 mb-1">
        {gameMode === 'pair' && commanderName
          ? `${commanderName}, your turn to assign!`
          : `${doerName}, your ${taskType} is:`}
      </p>
      
      <div className="bg-gray-600 p-4 rounded-md my-4 min-h-[100px] flex items-center justify-center">
        <p className="text-lg text-white text-center">
          {taskText}
        </p>
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={() => onResponse(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg text-lg"
        >
          Accept
        </button>
        <button
          onClick={() => onResponse(false)}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-lg text-lg"
        >
          Reject (Wuss Out)
        </button>
      </div>
    </div>
  );
}

export default TruthOrDareTaskReveal;