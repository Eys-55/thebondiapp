import React from 'react';
import wordsData from '../data/words.json';

function CharadesDifficultySelection({ actorName, onDifficultySelect }) {
  console.log("CharadesDifficultySelection: Rendering for actor:", actorName);
  return (
    <div className="text-center my-6 p-6 bg-gray-700 rounded-lg shadow-lg">
      <p className="text-xl text-gray-200 mb-4">{actorName}, choose your difficulty:</p>
      <div className="flex flex-col sm:flex-row justify-center gap-3">
        {['easy', 'medium', 'hard'].map(diff => (
          <button
            key={diff}
            onClick={() => onDifficultySelect(diff)}
            className={`flex-1 font-bold py-3 px-5 rounded-lg text-lg transition-transform hover:scale-105
                        ${diff === 'easy' ? 'bg-green-600 hover:bg-green-700' : ''}
                        ${diff === 'medium' ? 'bg-yellow-500 hover:bg-yellow-600 text-gray-800' : ''}
                        ${diff === 'hard' ? 'bg-red-600 hover:bg-red-700' : ''}
                      `}
          >
            {diff.toUpperCase()} (Base: {wordsData[diff]?.baseScore || 'N/A'} pts)
          </button>
        ))}
      </div>
    </div>
  );
}

export default CharadesDifficultySelection;