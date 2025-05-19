import React from 'react';
import PlayerRouletteDisplay from '../../Utils/utils_gameplay/PlayerRouletteDisplay';

function CharadesActorSelection({ displayText, isSpinning }) {
  console.log("CharadesActorSelection: Rendering. isSpinning:", isSpinning, "displayText:", displayText);
  return (
    <PlayerRouletteDisplay
      title="Selecting Actor..."
      displayText={displayText}
      isSpinning={isSpinning}
    />
  );
}

export default CharadesActorSelection;