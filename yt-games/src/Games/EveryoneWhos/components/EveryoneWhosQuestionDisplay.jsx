import React from 'react';

function EveryoneWhosQuestionDisplay({ questionText }) {
  return (
    <div className="text-center p-6 bg-gray-700 rounded-lg shadow-xl">
      <p className="text-xl text-gray-300 mb-3">
        The statement is:
      </p>
      <div className="text-2xl md:text-3xl text-white my-6 p-6 border-2 border-gray-600 rounded-lg bg-gray-800 min-h-[120px] flex items-center justify-center shadow-inner">
        {questionText || "Loading question..."}
      </div>
    </div>
  );
}

export default EveryoneWhosQuestionDisplay;