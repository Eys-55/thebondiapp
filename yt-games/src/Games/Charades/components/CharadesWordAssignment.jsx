import React from 'react';

function CharadesWordAssignment({
  actorName,
  taskAssignmentMode,
  mainCategoryName, // e.g., "Animals"
  currentDifficulty, // e.g., "easy" (this is itemSelector.currentCategory)
  selectedItem,
  isWordVisible,
  onShowWord,
  onActorReadyWithOwnWord
}) {
  console.log(
    "CharadesWordAssignment: Actor:", actorName,
    "Mode:", taskAssignmentMode,
    "MainCat:", mainCategoryName,
    "Difficulty:", currentDifficulty,
    "Item:", JSON.stringify(selectedItem)
  );

  return (
    <div className="text-center my-6 p-6 bg-gray-700 rounded-lg shadow-lg">
      {taskAssignmentMode === 'system_assigned' && currentDifficulty && mainCategoryName && (
        <p className="text-xl text-gray-200 mb-4">
          {actorName}, get ready for a <span className="font-bold text-yellow-300">{currentDifficulty.toUpperCase()}</span> challenge
          from the <span className="font-bold text-yellow-300">{mainCategoryName}</span> category!
        </p>
      )}
      {taskAssignmentMode === 'player_assigned' && (
         <p className="text-xl text-gray-200 mb-4">{actorName}, time to think of a word/phrase!</p>
      )}

      {taskAssignmentMode === 'system_assigned' && selectedItem?.rawItem && !isWordVisible && (
        <>
          <p className="text-gray-300 mb-4">A word/phrase has been chosen for you.</p>
          <button onClick={onShowWord} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg">
            Show Word/Phrase (Actor Only!)
          </button>
        </>
      )}
      {taskAssignmentMode === 'system_assigned' && !selectedItem && currentDifficulty && mainCategoryName && (
         <p className="text-red-400 mb-4">
           Error: No words available for {mainCategoryName} - {currentDifficulty.toUpperCase()}.
           Please try another difficulty/category or check data.
         </p>
      )}
       {taskAssignmentMode === 'system_assigned' && !currentDifficulty && mainCategoryName && (
         <p className="text-yellow-400 mb-4">
           Awaiting word assignment for {mainCategoryName}... please select a difficulty.
         </p>
      )}
       {taskAssignmentMode === 'system_assigned' && !mainCategoryName && (
         <p className="text-yellow-400 mb-4">
           Awaiting main category assignment...
         </p>
      )}
      {taskAssignmentMode === 'player_assigned' && (
        <>
          <p className="text-gray-300 mb-4">Please think of a word or phrase to act out.</p>
          <button onClick={onActorReadyWithOwnWord} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg">
            I Have My Word/Phrase!
          </button>
        </>
      )}
    </div>
  );
}

export default CharadesWordAssignment;