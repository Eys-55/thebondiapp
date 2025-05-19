import React from 'react';
import CheckIcon from '../../Utils/icons/CheckIcon';

function TriviaOptions({ options, correctAnswer, gamePhase }) {
  if (!options || options.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
      {options.map((option, index) => (
        <div
          key={index}
          className={`p-3 rounded-lg text-left text-md border-2 ${
            gamePhase === 'answer_revealed'
              ? option === correctAnswer
                ? 'bg-success-dark border-success text-white'
                : 'bg-gray-600 border-gray-500 text-gray-300'
              : 'bg-gray-600 border-gray-500 text-textPrimary'
          }`}
        >
          {option}
          {gamePhase === 'answer_revealed' && option === correctAnswer && (
            <CheckIcon className="h-5 w-5 float-right text-white" />
          )}
        </div>
      ))}
    </div>
  );
}

export default TriviaOptions;