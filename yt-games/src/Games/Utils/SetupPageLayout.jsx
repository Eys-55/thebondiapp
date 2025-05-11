import React from 'react';

// Props:
// title: string (e.g., "Multiplayer Quiz Setup", "Truth or Dare Setup")
// children: ReactNode (the actual form content)
// Optional: navbarInfoText: string (text for the bottom info box)

function SetupPageLayout({ title, children, navbarInfoText = "Configure your game above. Use the buttons in the navigation bar to start or reset." }) {
  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-lg shadow-xl text-textPrimary">
      <h2 className="text-3xl font-bold text-center text-primary-light mb-8">{title}</h2>
      
      {children} {/* Game-specific form sections will go here */}

      {/* Informational text about navbar buttons */}
      {navbarInfoText && (
        <div className="mt-8 p-4 bg-gray-700 rounded-md shadow text-center">
          <p className="text-sm text-gray-400">{navbarInfoText}</p>
        </div>
      )}
    </div>
  );
}

export default SetupPageLayout;