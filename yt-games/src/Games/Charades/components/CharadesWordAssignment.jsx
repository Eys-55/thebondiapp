import React from 'react';

function CharadesWordAssignment({ actorName, gameMode, currentCategory, selectedItem, isWordVisible, onShowWord, onActorReadyWithOwnWord }) {
  console.log("CharadesWordAssignment: Rendering for actor:", actorName, "Mode:", gameMode, "Selected Item:", JSON.stringify(selectedItem));
  return (
    <div className="text-center my-6 p-6 bg-gray-700 rounded-lg shadow-lg">
      {gameMode === 'system_word' && currentCategory && (
        <p className="text-xl text-gray-200 mb-4">{actorName}, get ready for a <span className="font-bold text-yellow-300">{currentCategory.toUpperCase()}</span> challenge!</p>
      )}
      {gameMode === 'own_word' && (
         <p className="text-xl text-gray-200 mb-4">{actorName}, time to think of a word/phrase!</p>
      )}

      {gameMode === 'system_word' && selectedItem?.rawItem && !isWordVisible && (
        <>
          <p className="text-gray-300 mb-4">A word/phrase has been chosen for you.</p>
          <button onClick={onShowWord} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg">
            Show Word/Phrase (Actor Only!)
          </button>
        </>
      )}
      {gameMode === 'system_word' && !selectedItem && currentCategory && (
         <p className="text-red-400 mb-4">Error: No words available for {currentCategory}. Please try another difficulty or check data.</p>
      )}
       {gameMode === 'system_word' && !currentCategory && (
         <p className="text-yellow-400 mb-4">Awaiting word assignment... this usually means itemSelector is still processing or category was not set properly.</p>
      )}
      {gameMode === 'own_word' && (
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