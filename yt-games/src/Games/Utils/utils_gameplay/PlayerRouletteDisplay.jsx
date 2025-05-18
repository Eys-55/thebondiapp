import React from 'react';

// Props:
// title: string - e.g., "Selecting Actor..."
// displayText: string - The name currently shown in the roulette
// isSpinning: boolean - If true, applies an animation (e.g., pulse)

function PlayerRouletteDisplay({ title, displayText, isSpinning }) {
  return (
    <div className="text-center my-6 p-8 bg-gray-800 rounded-lg shadow-lg">
      <p className="text-2xl text-gray-200 mb-2">{title}</p>
      <p className={`text-4xl font-bold text-blue-400 h-12 ${isSpinning ? 'animate-pulse' : ''}`}>
        {displayText || '---'}
      </p>
    </div>
  );
}

export default PlayerRouletteDisplay;