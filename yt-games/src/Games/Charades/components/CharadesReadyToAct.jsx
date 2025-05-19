import React from 'react';

function CharadesReadyToAct({ actorName, gameMode, isWordVisible, selectedItem, currentCategory, onStartActing }) {
  console.log("CharadesReadyToAct: Rendering for actor:", actorName, "Mode:", gameMode, "WordVisible:", isWordVisible, "Item:", JSON.stringify(selectedItem));
  return (
    <div className="text-center my-6 p-6 bg-gray-700 rounded-lg shadow-lg">
      {gameMode === 'system_word' && isWordVisible && selectedItem?.rawItem && currentCategory && (
        <div className="mb-6">
          <p className="text-gray-300 mb-1">Your word/phrase ({currentCategory.toUpperCase()}):</p>
          <p className="text-3xl font-bold text-yellow-400 bg-gray-700 p-3 rounded-md">{selectedItem.rawItem}</p>
        </div>
      )}
       {gameMode === 'own_word' && (
        <p className="text-xl text-gray-200 mb-6">{actorName}, get ready to act out your chosen word/phrase!</p>
       )}
      <button onClick={onStartActing} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg text-xl">
        Start Acting!
      </button>
    </div>
  );
}

export default CharadesReadyToAct;