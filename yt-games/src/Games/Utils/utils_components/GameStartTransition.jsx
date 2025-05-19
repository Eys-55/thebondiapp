import React, { useState, useEffect } from 'react';

function GameStartTransition({ gameName, onComplete, durationSeconds = 3 }) {
  const [countdown, setCountdown] = useState(durationSeconds);
  const [message, setMessage] = useState(""); // Initially empty, set in useEffect

  useEffect(() => {
    setMessage(`GET READY FOR ${gameName.toUpperCase()}!`);
  }, [gameName]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setMessage("GO!");
      const goTimer = setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 1000); // Show "GO!" for 1 second before calling onComplete
      return () => clearTimeout(goTimer);
    }
  }, [countdown, onComplete]);

  return (
    <div className="fixed inset-0 bg-gray-900 text-white flex flex-col items-center justify-center z-[1000] text-center p-4">
      <h1 className={`text-4xl md:text-6xl font-bold mb-8 ${countdown > 0 ? 'animate-pulse' : ''}`}>
        {message}
      </h1>
      {countdown > 0 && (
        <p className="text-8xl md:text-9xl font-mono font-extrabold">{countdown}</p>
      )}
      {countdown === 0 && message === "GO!" && (
         <p className="text-8xl md:text-9xl font-mono font-extrabold animate-ping">GO!</p>
      )}
    </div>
  );
}

export default GameStartTransition;