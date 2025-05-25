import React from 'react';
import Leaderboard from '../../Utils/utils_gameplay/Leaderboard';

function CharadesGameOver({ players, playerScores, onPlayAgain, onGoHome, leaderboardFormatter }) {
  console.log("CharadesGameOver: Rendering. playerScores:", JSON.stringify(playerScores));
  return (
    <div className="text-center my-6 p-8 bg-gray-700 rounded-lg shadow-lg">
      <h3 className="text-4xl font-bold text-green-400 mb-6">Game Over!</h3>
      <Leaderboard
        title="Final Scores"
        players={players}
        playerScores={playerScores}
        primarySortField="totalScore"
        secondarySortField="roundsPlayed"
        secondarySortOrder="asc"
        displayFormatter={leaderboardFormatter}
      />
      <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
      <button
      onClick={onPlayAgain}
      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
      >
      Play Again
      </button>
      <button
      onClick={onGoHome}
      className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg text-lg"
      >
      Back to Home
      </button>
      </div>
      </div>
  );
}

export default CharadesGameOver;