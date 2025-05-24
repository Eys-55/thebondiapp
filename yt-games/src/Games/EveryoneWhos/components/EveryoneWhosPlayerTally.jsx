import React, { useState, useEffect } from 'react';

function EveryoneWhosPlayerTally({ players, onSubmit }) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(new Set());

  // Reset selections when players list changes (e.g., new game or config change, though less likely mid-tally)
  useEffect(() => {
    setSelectedPlayerIds(new Set());
  }, [players]);

  const handlePlayerToggle = (playerId) => {
    setSelectedPlayerIds(prevSelectedIds => {
      const newSelectedIds = new Set(prevSelectedIds);
      if (newSelectedIds.has(playerId)) {
        newSelectedIds.delete(playerId);
      } else {
        newSelectedIds.add(playerId);
      }
      return newSelectedIds;
    });
  };

  const handleSubmitTally = () => {
    onSubmit(Array.from(selectedPlayerIds)); // Pass array of IDs
    setSelectedPlayerIds(new Set()); // Reset for next round/card
  };

  if (!players || players.length === 0) {
    return <p className="text-center text-gray-400">No players to tally.</p>;
  }

  return (
    <div className="text-center p-6 bg-gray-700 rounded-lg shadow-xl">
      <p className="text-lg text-gray-200 mb-6">
        Select everyone who fits the statement:
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
        {players.map(player => (
          <button
            key={player.id}
            onClick={() => handlePlayerToggle(player.id)}
            className={`p-3 rounded-lg font-medium transition-colors border-2
                        ${selectedPlayerIds.has(player.id)
                          ? 'bg-green-500 hover:bg-green-600 text-white border-green-300 ring-2 ring-green-300'
                          : 'bg-gray-600 hover:bg-gray-500 text-gray-200 border-gray-500'}`}
          >
            {player.name}
          </button>
        ))}
      </div>
      <button
        onClick={handleSubmitTally}
        className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg text-lg transition duration-200"
      >
        Submit Tally
      </button>
    </div>
  );
}

export default EveryoneWhosPlayerTally;