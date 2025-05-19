import React from 'react';

function TriviaLoading({ message = "Setting up your multiplayer game..." }) {
  return (
    <div className="flex items-center justify-center h-64 text-xl text-textSecondary">
      {message}
    </div>
  );
}

export default TriviaLoading;