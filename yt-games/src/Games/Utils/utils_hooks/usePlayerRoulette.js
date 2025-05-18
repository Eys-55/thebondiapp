import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

const ROULETTE_INTERVAL_MS = 100;

/**
 * Custom hook to manage player selection roulette animation.
 * @param {Array<Object>} players - Array of player objects. Each object must have a 'name' property.
 * @returns {Object} - {
 *   rouletteDisplayText: string,
 *   isRouletteSpinning: boolean,
 *   spinPlayerRoulette: function(durationMs: number, onPlayerSelected: function(player: Object) => void, playersToSpin?: Array<Object>) => void,
 *   selectedPlayer: Object | null
 * }
 */
function usePlayerRoulette(initialPlayers = []) {
  const [rouletteDisplayText, setRouletteDisplayText] = useState('');
  const [isRouletteSpinning, setIsRouletteSpinning] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  
  const rouletteIntervalRef = useRef(null);
  const rouletteTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearInterval(rouletteIntervalRef.current);
      clearTimeout(rouletteTimeoutRef.current);
    };
  }, []);

  const spinPlayerRoulette = useCallback((durationMs, onPlayerSelected, playersToSpin = initialPlayers) => {
    if (!isMountedRef.current || !Array.isArray(playersToSpin)) { // Ensure playersToSpin is an array
         if (!Array.isArray(playersToSpin)) console.warn("Player roulette spin called with non-array playersToSpin");
         return;
    }
    if (playersToSpin.length === 0) {
      console.warn("Player roulette initiated with no players to spin.");
      // Optionally, handle this by calling onPlayerSelected(null) or similar
      setRouletteDisplayText('---');
      setIsRouletteSpinning(false); // Ensure spinning stops
      if (onPlayerSelected) onPlayerSelected(null);
      return;
    }

    setIsRouletteSpinning(true);
    setSelectedPlayer(null); // Clear previous selection
    setRouletteDisplayText(playersToSpin[0].name);

    let currentIndex = 0;
    rouletteIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      // Ensure playersToSpin is still valid, though less likely to change mid-interval without unmount
      if (playersToSpin.length === 0) {
         clearInterval(rouletteIntervalRef.current);
         setIsRouletteSpinning(false);
         setRouletteDisplayText('---');
         return;
      }
      currentIndex = (currentIndex + 1) % playersToSpin.length;
      setRouletteDisplayText(playersToSpin[currentIndex].name);
    }, ROULETTE_INTERVAL_MS);

    rouletteTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      clearInterval(rouletteIntervalRef.current);
      // Re-check playersToSpin length before random selection
      if (playersToSpin.length === 0) {
         setRouletteDisplayText('---');
         setSelectedPlayer(null);
         setIsRouletteSpinning(false);
         if (onPlayerSelected) onPlayerSelected(null);
         return;
      }
      const finalSelectedPlayer = playersToSpin[Math.floor(Math.random() * playersToSpin.length)];
      
      setRouletteDisplayText(finalSelectedPlayer.name);
      setSelectedPlayer(finalSelectedPlayer);
      setIsRouletteSpinning(false);
      if (onPlayerSelected) {
        onPlayerSelected(finalSelectedPlayer);
      }
    }, durationMs);
  }, [initialPlayers]); // spinPlayerRoulette depends on initialPlayers

  // Memoize the returned object
  return useMemo(() => ({
    rouletteDisplayText,
    isRouletteSpinning,
    spinPlayerRoulette,
    selectedPlayer,
    setRouletteDisplayText, // Stable setState function
    setSelectedPlayer     // Stable setState function
  }), [rouletteDisplayText, isRouletteSpinning, spinPlayerRoulette, selectedPlayer]);
}

export default usePlayerRoulette;