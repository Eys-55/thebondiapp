import React from 'react';

function CharadesReadyToAct({
  actorName,
  taskAssignmentMode,
  isWordVisible,
  selectedItem,
  mainCategoryName, // e.g., "Animals"
  currentDifficulty, // e.g., "easy" (this is itemSelector.currentCategory)
  onStartActing
}) {
  console.log(
    "CharadesReadyToAct: Actor:", actorName,
    "Mode:", taskAssignmentMode,
    "MainCat:", mainCategoryName,
    "Difficulty:", currentDifficulty,
    "Item:", JSON.stringify(selectedItem),
    "WordVisible:", isWordVisible
  );

  return (
    <div className="text-center my-6 p-6 bg-gray-700 rounded-lg shadow-lg">
      {taskAssignmentMode === 'system_assigned' && isWordVisible && selectedItem?.rawItem && currentDifficulty && mainCategoryName && (
        <div className="mb-6">
          <p className="text-gray-300 mb-1">
            Your word/phrase from <span className="font-semibold">{mainCategoryName}</span> ({currentDifficulty.toUpperCase()}):
          </p>
          <p className="text-3xl font-bold text-yellow-400 bg-gray-700 p-3 rounded-md">{selectedItem.rawItem}</p>
        </div>
      )}
       {taskAssignmentMode === 'player_assigned' && (
        <p className="text-xl text-gray-200 mb-6">{actorName}, get ready to act out your chosen word/phrase!</p>
       )}
      <button onClick={onStartActing} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg text-xl">
        Start Acting!
      </button>
    </div>
  );
}

export default CharadesReadyToAct;