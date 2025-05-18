import React from 'react';

function PlayerSetup({
  minPlayers,
  maxPlayers,
  numPlayersUI,
  onNumPlayersChange,
  playerNames,
  onPlayerNameChange,
  playerNameErrors,
  isLoading,
  playerInputPlaceholder = (index) => `Player ${index + 1} (max 20)`
}) {
  return (
    <div className="mb-4">
      {/* Number of Players Select */}
      <div className="mb-4 flex flex-col items-start">
        <label htmlFor="num-players-select" className="mb-1 text-sm font-medium text-textSecondary">
          Number of Players ({minPlayers}-{maxPlayers}):
        </label>
        <select
          id="num-players-select"
          value={numPlayersUI}
          onChange={onNumPlayersChange}
          disabled={isLoading}
          className="w-full px-3 py-2 bg-gray-600 border rounded-md text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 border-gray-500"
        >
          {Array.from({ length: maxPlayers - minPlayers + 1 }, (_, i) => minPlayers + i).map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      {/* Player Name Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        {Array.from({ length: numPlayersUI }).map((_, index) => (
          <div key={`player-input-${index}`} className="mb-3 flex flex-col items-start">
            <label htmlFor={`player-name-${index}`} className="mb-1 text-xs font-medium text-textSecondary">
              Player {index + 1} Name:
            </label>
            <input
              type="text"
              id={`player-name-${index}`}
              value={playerNames[index] || ''}
              onChange={(e) => onPlayerNameChange(index, e.target.value)}
              maxLength="20"
              placeholder={playerInputPlaceholder(index)}
              className={`w-full px-3 py-2 bg-gray-600 border rounded-md text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 ${playerNameErrors && playerNameErrors[index] ? 'border-danger' : 'border-gray-500'}`}
              disabled={isLoading}
              aria-invalid={!!(playerNameErrors && playerNameErrors[index])}
              aria-describedby={playerNameErrors && playerNameErrors[index] ? `player-name-error-${index}` : undefined}
            />
            {playerNameErrors && playerNameErrors[index] && (
              <p id={`player-name-error-${index}`} className="mt-1 text-xs text-danger-light">{playerNameErrors[index]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PlayerSetup;