import React from 'react';

// Props:
// children: ReactNode (the actual form content)

function SetupPageLayout({ children }) {
  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-lg shadow-xl text-textPrimary">
      {/* The H2 title has been removed as it's redundant with the Navbar title */}
      
      {children} {/* Game-specific form sections will go here */}

    </div>
  );
}

export default SetupPageLayout;