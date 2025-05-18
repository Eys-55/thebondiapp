import React from 'react';

// Props:
// title: string (e.g., "Multiplayer Quiz Setup", "Truth or Dare Setup")
// children: ReactNode (the actual form content)

function SetupPageLayout({ title, children }) {
  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-lg shadow-xl text-textPrimary">
      <h2 className="text-3xl font-bold text-center text-primary-light mb-8">{title}</h2>
      
      {children} {/* Game-specific form sections will go here */}

    </div>
  );
}

export default SetupPageLayout;