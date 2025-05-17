import { useState, useRef, useCallback, useEffect } from 'react';

export const formatTime = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

/**
 * Custom hook to manage a game timer.
 * @param {Object} options - Configuration options.
 * @param {number} [options.maxSeconds] - Maximum time in seconds. Timer stops automatically.
 * @param {function} [options.onTimeout] - Callback when maxSeconds is reached.
 * @param {function} [options.onTick] - Callback on each tick (second). Receives current time.
 * @param {boolean} [options.countUp = true] - If true, timer counts up. If false, counts down from maxSeconds.
 * @returns {Object} - {
 *   currentTime: number,
 *   isTimerRunning: boolean,
 *   startTimer: function,
 *   stopTimer: function,
 *   resetTimer: function(startTime?: number) => void,
 *   formattedTime: string
 * }
 */
function useGameTimer({ maxSeconds, onTimeout, onTick, countUp = true } = {}) {
  const [currentTime, setCurrentTime] = useState(countUp ? 0 : (maxSeconds || 0));
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearInterval(timerIntervalRef.current);
    };
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(timerIntervalRef.current);
    setIsTimerRunning(false);
  }, []);

  const startTimer = useCallback(() => {
    if (isTimerRunning) return; // Prevent multiple intervals

    setIsTimerRunning(true);
    timerIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) {
        stopTimer();
        return;
      }
      
      setCurrentTime(prevTime => {
        let newTime;
        if (countUp) {
          newTime = prevTime + 1;
          if (maxSeconds !== undefined && newTime >= maxSeconds) {
            stopTimer();
            if (onTimeout) onTimeout();
            return maxSeconds; // Cap at maxSeconds
          }
        } else { // Count down
          newTime = prevTime - 1;
          if (newTime <= 0) {
            stopTimer();
            if (onTimeout) onTimeout();
            return 0; // Floor at 0
          }
        }
        
        if (onTick) onTick(newTime);
        return newTime;
      });
    }, 1000);
  }, [isTimerRunning, maxSeconds, onTimeout, onTick, countUp, stopTimer]);

  const resetTimer = useCallback((startTimeValue) => {
    stopTimer();
    const newStartTime = startTimeValue !== undefined
      ? startTimeValue
      : (countUp ? 0 : (maxSeconds || 0));
    setCurrentTime(newStartTime);
  }, [stopTimer, countUp, maxSeconds]);

  return {
    currentTime,
    isTimerRunning,
    startTimer,
    stopTimer,
    resetTimer,
    formattedTime: formatTime(currentTime),
  };
}

export default useGameTimer;