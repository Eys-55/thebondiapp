import { useState, useRef, useCallback, useEffect } from 'react';

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
    if (!isMountedRef.current || playersToSpin.length === 0) {
      if (playersToSpin.length === 0) console.warn("Player roulette initiated with no players.");
      return;
    }

    setIsRouletteSpinning(true);
    setSelectedPlayer(null); // Clear previous selection
    setRouletteDisplayText(playersToSpin[0].name);

    let currentIndex = 0;
    rouletteIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      currentIndex = (currentIndex + 1) % playersToSpin.length;
      setRouletteDisplayText(playersToSpin[currentIndex].name);
    }, ROULETTE_INTERVAL_MS);

    rouletteTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      clearInterval(rouletteIntervalRef.current);
      const finalSelectedPlayer = playersToSpin[Math.floor(Math.random() * playersToSpin.length)];
      
      setRouletteDisplayText(finalSelectedPlayer.name);
      setSelectedPlayer(finalSelectedPlayer);
      setIsRouletteSpinning(false);
      if (onPlayerSelected) {
        onPlayerSelected(finalSelectedPlayer);
      }
    }, durationMs);
  }, [initialPlayers]);

  return {
    rouletteDisplayText,
    isRouletteSpinning,
    spinPlayerRoulette,
    selectedPlayer, // Exposing selectedPlayer directly from the hook
    setRouletteDisplayText, // Allow manual setting for initial display or after selection
    setSelectedPlayer // Allow manual override if needed
  };
}

export default usePlayerRoulette;