import React from 'react';

function TriviaAnswerReveal({ correctAnswer, awardedPlayers, allPlayers }) {
  if (!correctAnswer) return null;

  const awardedPlayerNames = allPlayers
    .filter(p => awardedPlayers.includes(p.id))
    .map(p => p.name)
    .join(', ');

  return (
    <div className="mb-4 p-3 rounded text-center bg-info-dark border border-info">
      <p className="font-semibold text-lg text-white">
        The correct answer is: <span className="font-bold">{correctAnswer}</span>
      </p>
      {awardedPlayers.length > 0 && (
        <p className="text-sm text-success-light mt-1">{awardedPlayerNames} scored this round!</p>
      )}
    </div>
  );
}

export default TriviaAnswerReveal;