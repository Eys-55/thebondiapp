import React from 'react';

// Props:
// title?: string - Optional title for the leaderboard section.
// players: Array<Object> - Array of player objects, each expected to have an 'id' and 'name'.
// playerScores: Object - An object mapping player IDs to their score data.
//                        Example: { playerId1: { totalScore: 100, roundsPlayed: 5 }, playerId2: { score: 200 } }
// primarySortField: string - The field in `playerScores[playerId]` to sort by primarily (descending).
// secondarySortField?: string - Optional field in `playerScores[playerId]` for secondary sorting (ascending, e.g., rounds played).
// secondarySortOrder?: 'asc' | 'desc' - Order for secondary sort, defaults to 'asc'.
// displayFormatter: function(player, scoreData, rank) => ReactNode - Function to render each player's line.
//                                                                   Receives player object, their scoreData, and their rank.
// emptyMessage?: string - Message to display if players array is empty.

function Leaderboard({
  title = "Leaderboard",
  players = [],
  playerScores = {},
  primarySortField,
  secondarySortField,
  secondarySortOrder = 'asc',
  displayFormatter,
  emptyMessage = "No players to display."
}) {

  if (!players || players.length === 0) {
    return (
      <div className="mt-6 bg-gray-700 p-4 rounded-lg shadow">
        <h3 className="text-xl font-semibold text-center text-yellow-400 mb-3">{title}</h3>
        <p className="text-center text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  const sortedPlayers = [...players].sort((a, b) => {
    const scoreAData = playerScores[a.id] || {};
    const scoreBData = playerScores[b.id] || {};

    const primaryA = scoreAData[primarySortField] || 0;
    const primaryB = scoreBData[primarySortField] || 0;

    if (primaryB !== primaryA) {
      return primaryB - primaryA; // Primary sort: Descending
    }

    if (secondarySortField) {
      const secondaryA = scoreAData[secondarySortField] || 0;
      const secondaryB = scoreBData[secondarySortField] || 0;
      if (secondarySortOrder === 'asc') {
        return secondaryA - secondaryB;
      }
      return secondaryB - secondaryA;
    }
    return 0;
  });

  return (
    <div className="mt-6 bg-gray-700 p-4 rounded-lg shadow">
      <h3 className="text-xl font-semibold text-center text-yellow-400 mb-3">{title}</h3>
      {sortedPlayers.length > 0 ? (
        <ul className="space-y-2">
          {sortedPlayers.map((player, index) => {
            const scoreData = playerScores[player.id] || {};
            const rank = index + 1;
            return (
              <React.Fragment key={player.id}>
                {displayFormatter ? displayFormatter(player, scoreData, rank) : (
                  // Default formatter
                  <li className="flex justify-between items-center p-2 bg-gray-600 rounded">
                    <span className="text-gray-100">{rank}. {player.name}</span>
                    <span className="text-sm text-blue-300">
                      Score: {scoreData[primarySortField] !== undefined ? scoreData[primarySortField] : 'N/A'}
                      {secondarySortField && scoreData[secondarySortField] !== undefined && ` (${secondarySortField}: ${scoreData[secondarySortField]})`}
                    </span>
                  </li>
                )}
              </React.Fragment>
            );
          })}
        </ul>
      ) : (
        <p className="text-center text-gray-400">{emptyMessage}</p>
      )}
    </div>
  );
}

export default Leaderboard;