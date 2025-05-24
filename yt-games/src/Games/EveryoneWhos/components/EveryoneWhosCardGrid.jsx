import React from 'react';

function EveryoneWhosCardGrid({ cards, onCardSelect, onRandomCardSelect }) {
  if (!cards) { // Handle case where cards might be null initially
    return <p className="text-center text-gray-400">Loading cards...</p>;
  }
  if (cards.length === 0) {
    return <p className="text-center text-gray-400">No cards to display for selection.</p>;
  }

  const numCards = cards.length;
  let gridColsClass = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';
  if (numCards <= 4) gridColsClass = `grid-cols-2 sm:grid-cols-${numCards > 2 ? numCards : 2}`;
  else if (numCards <= 6) gridColsClass = 'grid-cols-2 sm:grid-cols-3';
  else if (numCards <= 9) gridColsClass = 'grid-cols-3';
  else if (numCards <= 12) gridColsClass = 'grid-cols-3 sm:grid-cols-4';

  const unrevealedCards = cards.filter(card => !card.revealed);
  const canPickRandom = unrevealedCards.length > 0;

  return (
    <div className="text-center p-4 md:p-6 bg-gray-700 rounded-lg shadow-xl">
      <p className="text-xl text-gray-200 mb-6">Select a card or let fate decide:</p>
      
      <button
        onClick={onRandomCardSelect}
        disabled={!canPickRandom}
        className={`mb-6 px-6 py-3 text-white font-semibold rounded-lg text-lg transition duration-200
                    ${canPickRandom
                      ? 'bg-teal-500 hover:bg-teal-600'
                      : 'bg-gray-500 cursor-not-allowed opacity-70'}`}
      >
        🎲 Pick a Random Card for Me
      </button>

      <div className={`grid ${gridColsClass} gap-3 sm:gap-4 max-w-2xl mx-auto`}>
        {cards.map((card, index) => (
          <button
            key={card.id}
            onClick={() => onCardSelect(card.id)}
            disabled={card.revealed}
            className={`p-4 aspect-[4/3] flex items-center justify-center rounded-lg text-white font-semibold text-md sm:text-lg transition-all duration-200 ease-in-out transform focus:outline-none focus:ring-2 focus:ring-opacity-75
                        ${card.revealed
                          ? 'bg-gray-500 text-gray-400 cursor-not-allowed opacity-60' // More faded for played cards
                          : 'bg-indigo-500 hover:bg-indigo-600 hover:scale-105 focus:ring-indigo-400'}`}
          >
            {card.revealed ? 'Played' : `Card ${index + 1}`}
          </button>
        ))}
      </div>
      {!canPickRandom && cards.length > 0 && (
        <p className="mt-6 text-green-400 font-semibold">All cards have been played!</p>
      )}
    </div>
  );
}

export default EveryoneWhosCardGrid;