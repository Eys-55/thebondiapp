import React from 'react';

function TriviaPlayerGrid({
  players,
  awardedPlayerIdsThisRound,
  pendingAwardedPlayerIds,
  onPlayerSelect,
  gamePhase,
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-4">
      {players.map(p => {
        const isConfirmedAward = awardedPlayerIdsThisRound.includes(p.id);
        const isPendingAward = pendingAwardedPlayerIds.includes(p.id) && !isConfirmedAward;

        let buttonClass = 'bg-gray-600 hover:bg-gray-500 border-gray-500 hover:border-gray-400 cursor-pointer'; // Default
        if (isConfirmedAward) {
          buttonClass = '!bg-success border-success-light ring-2 ring-white cursor-not-allowed';
        } else if (isPendingAward) {
          buttonClass = 'bg-yellow-600 hover:bg-yellow-500 border-yellow-400 ring-2 ring-yellow-200 cursor-pointer';
        }

        return (
          <button
            key={p.id}
            onClick={() => onPlayerSelect(p.id)}
            disabled={isConfirmedAward || (gamePhase !== 'answering' && gamePhase !== 'answer_revealed')}
            className={`p-3 rounded-lg text-center transition duration-200 ease-in-out border-2 ${buttonClass}`}
          >
            <p className="text-md font-semibold truncate text-white">{p.name}</p>
            <p className="text-xl font-bold text-success-light">{p.score}</p>
          </button>
        );
      })}
    </div>
  );
}

export default TriviaPlayerGrid;