import React from 'react';
import Leaderboard from '../../Utils/utils_gameplay/Leaderboard';

function EveryoneWhosGameOver({ gameConfig, players, playerScores, onPlayAgain, onGoHome }) {
  
  const displayFormatter = (player, scoreData, rank) => (
    <li className="flex justify-between items-center p-3 bg-gray-600 rounded-md shadow">
      <span className="text-lg text-gray-100">
        <span className="font-semibold text-yellow-400 mr-2">{rank}.</span>
        {player.name}
      </span>
      <span className="text-xl font-bold text-blue-300">
        {scoreData.score !== undefined ? scoreData.score : 0} <span className="text-sm">pts</span>
      </span>
    </li>
  );

  // Transform playerScores for Leaderboard if it's { playerId: scoreCount }
  // Leaderboard expects playerScores[playerId] = { score: count }
  const scoresForLeaderboard = players.reduce((acc, player) => {
    acc[player.id] = { score: playerScores[player.id] || 0 };
    return acc;
  }, {});

  return (
    <div className="text-center p-6 bg-gray-700 rounded-lg shadow-xl">
      <h2 className="text-3xl font-bold text-yellow-400 mb-6">Game Over!</h2>
      
      {players && playerScores && (
        <Leaderboard
          title="Final Scores (Most 'Drinks')" // Or "Points" if more generic
          players={players}
          playerScores={scoresForLeaderboard}
          primarySortField="score" // This must match the key in scoresForLeaderboard
          displayFormatter={displayFormatter}
          emptyMessage="No scores to display."
        />
      )}
      
      <p className="text-gray-200 mt-8 mb-6">Thanks for playing "Everyone Who's..."!</p>
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <button
          onClick={onPlayAgain}
          className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg text-lg transition duration-200"
        >
          Play Again
        </button>
        <button
          onClick={onGoHome}
          className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg text-lg transition duration-200"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default EveryoneWhosGameOver;