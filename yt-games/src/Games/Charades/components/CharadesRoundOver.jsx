import React from 'react';
import Leaderboard from '../../Utils/utils_gameplay/Leaderboard';

function CharadesRoundOver({ actorName, totalTurnsCompleted, maxTurns, onNextRound, players, playerScores, leaderboardFormatter }) {
  console.log("CharadesRoundOver: Rendering for actor:", actorName, "TotalTurnsCompleted:", totalTurnsCompleted, "MaxTurns:", maxTurns);
  return (
    <div className="text-center my-6 p-8 bg-gray-700 rounded-lg shadow-lg">
      <p className="text-2xl text-gray-200 mb-4">
        Round over for <span className="font-bold text-blue-400">{actorName}</span>!
      </p>
      <button onClick={onNextRound} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-xl mb-4">
        {totalTurnsCompleted >= maxTurns ? 'Show Final Scores' : 'Next Round'}
      </button>
      {console.log("CharadesRoundOver: Rendering Leaderboard. playerScores:", JSON.stringify(playerScores))}
      <Leaderboard
        title="Current Scores"
        players={players}
        playerScores={playerScores}
        primarySortField="totalScore"
        secondarySortField="roundsPlayed"
        secondarySortOrder="asc"
        displayFormatter={leaderboardFormatter}
      />
    </div>
  );
}

export default CharadesRoundOver;