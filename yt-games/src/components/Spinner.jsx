import React from 'react';

// Simple CSS Spinner Component
function Spinner({ size = 'md', color = 'border-white' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className="inline-block">
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} border-t-2 border-b-2 ${color}`}
        style={{ borderTopColor: 'transparent' }} // Make top transparent for spinning effect
      ></div>
    </div>
  );
}

export default Spinner;