import React from 'react';

function TriviaQuestionArea({ questionText }) {
  return (
    <div className="flex-grow flex flex-col justify-center items-center text-center bg-gray-700 p-6 rounded my-4 shadow">
      <p className="text-xl md:text-2xl font-medium text-textPrimary">{questionText}</p>
    </div>
  );
}

export default TriviaQuestionArea;