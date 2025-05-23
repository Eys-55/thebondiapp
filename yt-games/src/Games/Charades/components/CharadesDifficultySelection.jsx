import React from 'react';

function CharadesDifficultySelection({ actorName, onDifficultySelect, mainCategoryData, mainCategoryName }) {
  console.log("CharadesDifficultySelection: Rendering for actor:", actorName, "Main Category:", mainCategoryName, "Data:", mainCategoryData);

  const availableDifficulties = mainCategoryData ? Object.keys(mainCategoryData) : [];

  if (!mainCategoryData || availableDifficulties.length === 0) {
    return (
      <div className="text-center my-6 p-6 bg-gray-700 rounded-lg shadow-lg">
        <p className="text-xl text-red-400 mb-4">
          Error: No difficulty levels found for the category "{mainCategoryName || 'Unknown'}".
        </p>
        <p className="text-sm text-gray-400">Please check the data files or category selection.</p>
      </div>
    );
  }
  
  // Standard difficulties, filter by what's available in mainCategoryData and ensure they have words
  const difficultiesToShow = ['easy', 'medium', 'hard'].filter(dKey =>
    availableDifficulties.includes(dKey) &&
    mainCategoryData[dKey]?.words &&
    mainCategoryData[dKey].words.length > 0
  );

  return (
    <div className="text-center my-6 p-6 bg-gray-700 rounded-lg shadow-lg">
      <p className="text-xl text-gray-200 mb-1">
        {actorName}, you're acting from the <span className="font-bold text-yellow-300">{mainCategoryName || 'Selected'}</span> category.
      </p>
      <p className="text-lg text-gray-300 mb-4">Choose your difficulty:</p>
      {difficultiesToShow.length > 0 ? (
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          {difficultiesToShow.map(diffKey => {
            const difficultyDetail = mainCategoryData[diffKey];
            const baseScore = difficultyDetail?.baseScore ?? 'N/A';

            return (
              <button
                key={diffKey}
                onClick={() => onDifficultySelect(diffKey)}
                className={`flex-1 font-bold py-3 px-5 rounded-lg text-lg transition-transform hover:scale-105
                            ${diffKey === 'easy' ? 'bg-green-600 hover:bg-green-700' : ''}
                            ${diffKey === 'medium' ? 'bg-yellow-500 hover:bg-yellow-600 text-gray-800' : ''}
                            ${diffKey === 'hard' ? 'bg-red-600 hover:bg-red-700' : ''}
                          `}
              >
                {diffKey.toUpperCase()} (Base: {baseScore} pts)
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-md text-yellow-400 mt-3">
          No words available for any difficulty in the "{mainCategoryName || 'Selected'}" category. Please check game data.
        </p>
      )}
    </div>
  );
}

export default CharadesDifficultySelection;