import React from 'react';
import Leaderboard from '../../Utils/utils_gameplay/Leaderboard';

function TriviaGameOver({ players, onPlayAgain }) {
  const playerScoresForLeaderboard = players.reduce((acc, player) => {
    acc[player.id] = { score: player.score, name: player.name };
    return acc;
  }, {});

  const triviaLeaderboardFormatter = (player, scoreData, rank) => (
    <li
      key={player.id}
      className={`flex justify-between items-center px-4 py-2 rounded border ${
        rank === 1 ? 'bg-success-dark border-success-light ring-2 ring-success-light shadow-lg' : 'bg-gray-700 border-gray-600'
      }`}
    >
      <span className={`font-medium ${rank === 1 ? 'text-white' : 'text-textPrimary'}`}>
        {rank}. {player.name} {rank === 1 ? '🏆' : ''}
      </span>
      <span className={`${rank === 1 ? 'text-white' : 'text-textPrimary'} font-medium`}>
        Score: {scoreData.score}
      </span>
    </li>
  );

  return (
    <div className="max-w-lg mx-auto p-8 bg-gray-800 rounded-lg shadow-xl text-center">
      <h2 className="text-4xl font-bold mb-4 text-warning-light">🏁 Game Over! 🏁</h2>
      <Leaderboard
        title="Final Scores"
        players={players}
        playerScores={playerScoresForLeaderboard}
        primarySortField="score"
        displayFormatter={triviaLeaderboardFormatter}
      />
      <button
      onClick={onPlayAgain}
      className="mt-8 bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 shadow-lg w-full"
      >
      Play Again?
      </button>
      </div>
  );
}

export default TriviaGameOver;