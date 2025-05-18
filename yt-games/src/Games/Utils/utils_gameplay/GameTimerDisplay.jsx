import React from 'react';

// Props:
// formattedTime: string - The time string (e.g., "01:30")
// label?: string - Optional label for the timer (e.g., "Time Left:")
// className?: string - Additional Tailwind classes for styling the time text

function GameTimerDisplay({ formattedTime, label, className = "text-6xl font-mono text-green-400" }) {
  return (
    <div className="text-center">
      {label && <p className="text-lg text-gray-300 mb-1">{label}</p>}
      <p className={`${className} mb-4`}>{formattedTime}</p>
    </div>
  );
}

export default GameTimerDisplay;