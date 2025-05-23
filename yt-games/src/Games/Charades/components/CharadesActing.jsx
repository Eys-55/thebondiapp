import React from 'react';
import GameTimerDisplay from '../../Utils/utils_gameplay/GameTimerDisplay';
import { formatTime } from '../../Utils/utils_hooks/useGameTimer';

function CharadesActing({
  taskAssignmentMode,
  isWordVisible,
  selectedItem,
  mainCategoryName, // e.g. "Animals"
  currentDifficulty, // e.g. "easy" (this is itemSelector.currentCategory)
  ownWordBaseScore,
  formattedTimerTime,
  actingTime,
  onWordGuessed,
}) {
  console.log("CharadesActing: Rendering. MainCat:", mainCategoryName, "Difficulty:", currentDifficulty, "Timer:", formattedTimerTime);
  return (
    <div className="text-center my-6 p-6 bg-gray-700 rounded-lg shadow-lg">
      <p className="text-2xl text-yellow-400 mb-2 animate-pulse">ACTING!</p>
      
      {taskAssignmentMode === 'system_assigned' && selectedItem?.rawItem && (
         <p className="text-sm text-gray-500 mb-1">
           (Word: {isWordVisible ? selectedItem.rawItem : "Hidden from guessers"})
         </p>
      )}

      {taskAssignmentMode === 'system_assigned' && currentDifficulty && mainCategoryName && (
        <p className="text-sm text-gray-400 mb-2">
          Category: {mainCategoryName} | Difficulty: {currentDifficulty.toUpperCase()} | Base Score: {selectedItem?.baseScore || 'N/A'} pts
        </p>
      )}

      {taskAssignmentMode === 'player_assigned' && selectedItem?.isPlayerChoice && (
         <p className="text-sm text-gray-400 mb-2">
           Player's Choice | Base Score for timing: {selectedItem?.baseScore || ownWordBaseScore} pts
         </p>
      )}

      <GameTimerDisplay formattedTime={formattedTimerTime} />
      <p className="text-sm text-gray-400 mb-6">Max Time: {formatTime(actingTime)}</p>
      
      <button onClick={onWordGuessed} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg">
        Word Guessed!
      </button>
    </div>
  );
}

export default CharadesActing;