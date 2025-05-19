import React from 'react';
import GameTimerDisplay from '../../Utils/utils_gameplay/GameTimerDisplay';
import { formatTime } from '../../Utils/utils_hooks/useGameTimer'; // Import formatTime directly

function CharadesActing({
  gameMode,
  isWordVisible,
  selectedItem,
  currentCategory,
  ownWordBaseScore,
  formattedTimerTime,
  actingTime,
  onWordGuessed,
}) {
  console.log("CharadesActing: Rendering. Timer:", formattedTimerTime);
  return (
    <div className="text-center my-6 p-6 bg-gray-700 rounded-lg shadow-lg">
      <p className="text-2xl text-yellow-400 mb-2 animate-pulse">ACTING!</p>
      {gameMode === 'system_word' && selectedItem?.rawItem && (
         <p className="text-sm text-gray-500 mb-1">(Word: {isWordVisible ? selectedItem.rawItem : "Hidden from guessers"})</p>
      )}
      {gameMode === 'system_word' && currentCategory && (
        <p className="text-sm text-gray-400 mb-2">Difficulty: {currentCategory.toUpperCase()} | Base Score: {selectedItem?.baseScore || 'N/A'} pts</p>
      )}
      {gameMode === 'own_word' && selectedItem?.isPlayerChoice && (
         <p className="text-sm text-gray-400 mb-2">Player's Choice | Base Score for timing: {selectedItem?.baseScore || ownWordBaseScore} pts</p>
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