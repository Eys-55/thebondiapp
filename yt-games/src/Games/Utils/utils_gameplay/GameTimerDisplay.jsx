import React from 'react';

// Props:
// formattedTime: string - The time string (e.g., "01:30", "0:00")
// label?: string - Optional label for the timer (e.g., "Time Left:")
// className?: string - Optional. Explicitly sets the Tailwind classes for styling the time text.
//                     If not provided, defaults will apply based on formattedTime.

function GameTimerDisplay({ formattedTime, label, className: explicitClassName }) {
  let timeColorClass;
  const defaultSizeAndFont = "text-6xl font-mono"; // Consistent size and font

  if (formattedTime === "0:00" || formattedTime === "Revealed" || formattedTime === "Time's Up") { // Added more conditions for gray color
    timeColorClass = "text-gray-500"; // Grayed out for zero time or specific states
  } else {
    timeColorClass = "text-green-400"; // Green for active timer
  }

  // If an explicit className is passed, it overrides the default styling.
  // Otherwise, combine default size/font with the determined color.
  const displayClassName = explicitClassName ? explicitClassName : `${defaultSizeAndFont} ${timeColorClass}`;

  return (
    <div className="text-center">
      {label && <p className="text-lg text-gray-300 mb-1">{label}</p>}
      <p className={`${displayClassName} mb-4`}>{formattedTime}</p>
    </div>
  );
}

export default GameTimerDisplay;