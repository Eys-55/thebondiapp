import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SetupPageLayout from '../../Utils/utils_setup/SetupPageLayout';
import Modal from '../../Utils/utils_components/Modal';
import PlayerSetup from '../../Utils/utils_setup/PlayerSetup';
import GameOptionSelector from '../../Utils/utils_setup/GameOptionSelector';
import StyledNumberInput from '../../Utils/utils_setup/StyledNumberInput';


const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;
const CATEGORIES = [
  { id: "Friends", name: "🫂 Friends" },
  { id: "Family", name: "👨‍👩‍👧‍👦 Family" },
  { id: "Couple", name: "❤️‍🔥 Couple (18+)" }
];
const SESSION_STORAGE_KEY = 'getToKnowSetup';

const MIN_QUESTIONS = 1;
const MAX_QUESTIONS_SETUP = 10; // Max selectable in setup

const PLAYER_SELECTION_ORDER_OPTIONS = [
  { id: "sequential", value: "sequential", name: "🔄 Sequential (Players take turns in order)" },
  { id: "random", value: "random", name: "🎲 Random (Player order is shuffled each round)" }
];

const defaultState = {
  numPlayersUI: MIN_PLAYERS,
  playerNames: Array(MIN_PLAYERS).fill(''),
  selectedCategory: null,
  rRatedModalConfirmed: false,
  playerSelectionOrder: 'sequential', // 'sequential' or 'random'
  numberOfQuestions: 5, // Default number of questions
};

function GetToKnowSetup({ registerNavbarActions, unregisterNavbarActions }) {
  const navigate = useNavigate();
  const [numPlayersUI, setNumPlayersUI] = useState(defaultState.numPlayersUI);
  const [playerNames, setPlayerNames] = useState(defaultState.playerNames);
  const [selectedCategory, setSelectedCategory] = useState(defaultState.selectedCategory);
  const [showRRatedModal, setShowRRatedModal] = useState(false);
  const [rRatedModalConfirmed, setRRatedModalConfirmed] = useState(defaultState.rRatedModalConfirmed);
  const [playerSelectionOrder, setPlayerSelectionOrder] = useState(defaultState.playerSelectionOrder);
  const [numberOfQuestions, setNumberOfQuestions] = useState(defaultState.numberOfQuestions);

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      const savedSettings = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setNumPlayersUI(parsedSettings.numPlayersUI || defaultState.numPlayersUI);
        const loadedPlayerNames = parsedSettings.playerNames || [];
        const numPlayers = parsedSettings.numPlayersUI || defaultState.numPlayersUI;
        setPlayerNames(Array(numPlayers).fill('').map((_, i) => loadedPlayerNames[i] || ''));
        setSelectedCategory(parsedSettings.selectedCategory || defaultState.selectedCategory);
        setRRatedModalConfirmed(parsedSettings.rRatedModalConfirmed || defaultState.rRatedModalConfirmed);
        setPlayerSelectionOrder(parsedSettings.playerSelectionOrder || defaultState.playerSelectionOrder);
        setNumberOfQuestions(parsedSettings.numberOfQuestions || defaultState.numberOfQuestions);
      }
    } catch (error) {
      console.error("Failed to load Get To Know settings from session storage:", error);
      toast.error("Could not load saved settings.");
    }
  }, []);

  useEffect(() => {
    const settingsToSave = {
      numPlayersUI,
      playerNames,
      selectedCategory,
      rRatedModalConfirmed,
      playerSelectionOrder,
      numberOfQuestions,
    };
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(settingsToSave));
    } catch (error) {
      console.error("Failed to save Get To Know settings to session storage:", error);
    }
  }, [numPlayersUI, playerNames, selectedCategory, rRatedModalConfirmed, playerSelectionOrder, numberOfQuestions]);

  useEffect(() => {
    // If category changes away from "Couple", reset confirmation and hide modal
    if (selectedCategory !== 'Couple') {
      setRRatedModalConfirmed(false);
      setShowRRatedModal(false);
    }
    // If "Couple" is selected and not yet confirmed, show modal (handled in handleCategoryChange too for immediate effect)
    else if (selectedCategory === 'Couple' && !rRatedModalConfirmed) {
        // setShowRRatedModal(true); // This can cause loops if not careful, handleCategoryChange is better place
    }
  }, [selectedCategory, rRatedModalConfirmed]);


  const validateForm = useCallback((updateState = true) => {
    const newErrors = {};
    const currentPlayersToValidate = playerNames.slice(0, numPlayersUI);
    currentPlayersToValidate.forEach((name, index) => {
      if (!name.trim()) {
        if (!newErrors.playerNames) newErrors.playerNames = Array(numPlayersUI).fill(null);
        newErrors.playerNames[index] = `Player ${index + 1} name is required.`;
      } else if (name.trim().length > 20) {
        if (!newErrors.playerNames) newErrors.playerNames = Array(numPlayersUI).fill(null);
        newErrors.playerNames[index] = `Player ${index + 1} name max 20 chars.`;
      }
    });
    if (newErrors.playerNames && !newErrors.playerNames.some(e => e)) {
      delete newErrors.playerNames;
    }

    if (!selectedCategory) {
      newErrors.category = 'Please select a question category.';
    }

    if (selectedCategory === 'Couple' && !rRatedModalConfirmed) {
        newErrors.category = 'Please confirm age restriction for Couple category.';
        if (updateState && !showRRatedModal) setShowRRatedModal(true);
    }

    if (!playerSelectionOrder) {
      newErrors.playerSelectionOrder = 'Please select a player turn order.';
    }

    if (!numberOfQuestions || numberOfQuestions < MIN_QUESTIONS || numberOfQuestions > MAX_QUESTIONS_SETUP) {
      newErrors.numberOfQuestions = `Number of questions must be between ${MIN_QUESTIONS} and ${MAX_QUESTIONS_SETUP}.`;
    } else if (!Number.isInteger(numberOfQuestions)) {
      newErrors.numberOfQuestions = 'Number of questions must be a whole number.';
    }


    if (updateState) {
      setErrors(newErrors);
    }
    return newErrors;


  }, [playerNames, numPlayersUI, selectedCategory, rRatedModalConfirmed, showRRatedModal, playerSelectionOrder, numberOfQuestions]);

  const handlePlayerNameChange = (index, value) => {
    const newPlayerNames = [...playerNames];
    newPlayerNames[index] = value;
    setPlayerNames(newPlayerNames);
    if (errors.playerNames && errors.playerNames[index]) {
      const updatedPlayerErrors = [...(errors.playerNames || [])];
      updatedPlayerErrors[index] = null;
      setErrors(prev => ({ ...prev, playerNames: updatedPlayerErrors.some(e => e) ? updatedPlayerErrors : null }));
    }
  };

  const handleNumPlayersChange = (e) => {
    const count = parseInt(e.target.value, 10);
    setNumPlayersUI(count);
    const newPlayerNames = Array(count).fill('').map((_, i) => playerNames[i] || '');
    setPlayerNames(newPlayerNames);
    if (errors.playerNames) setErrors(prev => ({ ...prev, playerNames: null }));
  };

  const handleCategoryChange = (categoryValue) => {
    setSelectedCategory(categoryValue);
    setRRatedModalConfirmed(false); // Reset confirmation when category changes
    if (errors.category) setErrors(prev => ({ ...prev, category: null }));

    if (categoryValue === 'Couple') {
      setShowRRatedModal(true);
    } else {
      setShowRRatedModal(false);
    }
  };

  const handleRRatedModalConfirm = () => {
    setRRatedModalConfirmed(true);
    setShowRRatedModal(false);
    if (errors.category) setErrors(prev => ({ ...prev, category: null })); // Clear error after confirmation
  };

  const handleRRatedModalCancel = () => {
    setSelectedCategory(null); // Deselect Couple category
    setRRatedModalConfirmed(false);
    setShowRRatedModal(false);
    toast.info("Couple category deselected. Please choose a category or confirm age if you reselect Couple.");
  };

  const handleStartGame = useCallback(() => {
    const formErrors = validateForm(true);
    if (Object.keys(formErrors).length > 0) {
      toast.warn("Please fix the errors in the form.");
      return;
    }
    if (selectedCategory === 'Couple' && !rRatedModalConfirmed) {
        if (!showRRatedModal) setShowRRatedModal(true); // Ensure modal is shown if somehow bypassed
        toast.warn("Please confirm age restriction for Couple category.");
        return;
    }

    setIsLoading(true);
    const activePlayers = playerNames.slice(0, numPlayersUI).map(name => ({
      id: crypto.randomUUID(),
      name: name.trim(),
    }));
    const gameConfig = {
      players: activePlayers,
      selectedCategory,
      playerSelectionOrder,
      numberOfQuestions,
    };
    navigate('/get-to-know/play', { state: { gameConfig } });

  }, [validateForm, selectedCategory, rRatedModalConfirmed, showRRatedModal, playerNames, numPlayersUI, playerSelectionOrder, numberOfQuestions, navigate]);

  const handleResetSettings = useCallback(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setNumPlayersUI(defaultState.numPlayersUI);
    setPlayerNames(defaultState.playerNames);
    setSelectedCategory(defaultState.selectedCategory);
    setRRatedModalConfirmed(defaultState.rRatedModalConfirmed);
    setPlayerSelectionOrder(defaultState.playerSelectionOrder);
    setNumberOfQuestions(defaultState.numberOfQuestions);
    setShowRRatedModal(false);
    setErrors({});
    toast.info("Settings have been reset to default.");
  }, []);

  const checkValidity = useCallback(() => {
    const currentErrors = validateForm(false); // Don't set state
    const allPlayerNamesFilled = playerNames.slice(0, numPlayersUI).every(name => name.trim() !== '');
    let rRatedCheckPassed = true;
    if (selectedCategory === 'Couple' && !rRatedModalConfirmed) {
      rRatedCheckPassed = false;
    }
    const playerOrderValid = !!playerSelectionOrder;
    const numQuestionsValid = numberOfQuestions >= MIN_QUESTIONS && numberOfQuestions <= MAX_QUESTIONS_SETUP && Number.isInteger(numberOfQuestions);

    return Object.keys(currentErrors).length === 0 && allPlayerNamesFilled && rRatedCheckPassed && playerOrderValid && numQuestionsValid;
  }, [validateForm, playerNames, numPlayersUI, selectedCategory, rRatedModalConfirmed, playerSelectionOrder, numberOfQuestions]);

  const isValidToStartValue = useMemo(() => checkValidity(), [checkValidity]);

  const navbarConfig = useMemo(() => ({
    startHandler: handleStartGame,
    resetHandler: handleResetSettings,
    isLoading: isLoading,
    isValidToStart: isValidToStartValue,
  }), [handleStartGame, handleResetSettings, isLoading, isValidToStartValue]);

  const registerNavbarActionsRef = useRef(registerNavbarActions);
  const unregisterNavbarActionsRef = useRef(unregisterNavbarActions);

  useEffect(() => {
    registerNavbarActionsRef.current = registerNavbarActions;
    unregisterNavbarActionsRef.current = unregisterNavbarActions;
  }, [registerNavbarActions, unregisterNavbarActions]);

  useEffect(() => {
    const currentRegister = registerNavbarActionsRef.current;
    if (currentRegister) {
      currentRegister(navbarConfig);
    }
    return () => {
      const currentUnregister = unregisterNavbarActionsRef.current;
      if (currentUnregister) {
        currentUnregister();
      }
    };
  }, [navbarConfig]);

  return (
    <SetupPageLayout title="Get to Know Setup">
      {/* Player Setup */}
      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">1. Players</h3>
        <PlayerSetup
          minPlayers={MIN_PLAYERS}
          maxPlayers={MAX_PLAYERS}
          numPlayersUI={numPlayersUI}
          onNumPlayersChange={handleNumPlayersChange}
          playerNames={playerNames}
          onPlayerNameChange={handlePlayerNameChange}
          playerNameErrors={errors.playerNames}
          isLoading={isLoading}
        />
      </div>

      {/* Category Selection */}
      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">2. Question Category</h3>
        <GameOptionSelector
          options={CATEGORIES.map(cat => ({ id: cat.id, value: cat.id, name: cat.name }))}
          selectedOption={selectedCategory}
          onOptionChange={(value) => handleCategoryChange(value)}
          type="radio"
          groupName="getToKnowCategory"
          isLoading={isLoading}
          error={errors.category}
          layoutClass="flex flex-wrap gap-3 justify-center p-2 rounded"
          containerClass="bg-transparent border-none p-0"
        />
      </div>

      {/* Player Selection Order */}
      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">3. Player Turn Order</h3>
        <GameOptionSelector
          options={PLAYER_SELECTION_ORDER_OPTIONS}
          selectedOption={playerSelectionOrder}
          onOptionChange={(value) => {
            setPlayerSelectionOrder(value);
            if (errors.playerSelectionOrder) setErrors(prev => ({ ...prev, playerSelectionOrder: null }));
          }}
          type="radio"
          groupName="getToKnowPlayerOrder"
          isLoading={isLoading}
          error={errors.playerSelectionOrder}
          layoutClass="flex flex-col space-y-2"
          itemLayoutClass = "flex items-center space-x-3 px-4 py-2.5 rounded-lg cursor-pointer transition duration-200 border" // Adjusted for better spacing
          baseItemClass = "bg-gray-600 hover:bg-gray-550 text-textPrimary border-gray-500 hover:border-gray-400"
          selectedItemClass = "bg-primary-dark text-white border-primary-light ring-2 ring-primary-light"
          containerClass="bg-transparent border-none p-0" // To match other selectors
        />
      </div>

      {/* Number of Questions */}
      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">4. Number of Questions</h3>
        <StyledNumberInput
          id="number-of-questions"
          label={`Select how many questions for the game (Min: ${MIN_QUESTIONS}, Max: ${MAX_QUESTIONS_SETUP}):`}
          value={numberOfQuestions}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (isNaN(val)) {
               setNumberOfQuestions(MIN_QUESTIONS); // Or keep current value, or set to empty string if input allows
            } else if (val < MIN_QUESTIONS) {
               setNumberOfQuestions(MIN_QUESTIONS);
            } else if (val > MAX_QUESTIONS_SETUP) {
               setNumberOfQuestions(MAX_QUESTIONS_SETUP);
            } else {
               setNumberOfQuestions(val);
            }
            if (errors.numberOfQuestions) setErrors(prev => ({ ...prev, numberOfQuestions: null }));
          }}
          min={MIN_QUESTIONS}
          max={MAX_QUESTIONS_SETUP}
          step="1"
          disabled={isLoading}
          error={errors.numberOfQuestions}
          containerClassName="flex flex-col items-start w-full sm:w-1/2" // Example to control width
          labelClassName="mb-2 text-sm font-medium text-gray-200"
          inputClassName="text-center"
        />
      </div>

      <Modal
        isOpen={showRRatedModal && selectedCategory === 'Couple'}
        onClose={handleRRatedModalCancel}
        title="Age Restriction Warning!"
        titleColor="text-yellow-400"
        footerContent={
          <>
            <button onClick={handleRRatedModalCancel} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors">
              Go Back / Choose Another
            </button>
            <button onClick={handleRRatedModalConfirm} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-md transition-colors">
              Confirm (All Players 18+)
            </button>
          </>
        }
      >
        <p>
          The "Couple" category may contain content intended for players aged 18 and above.
          Please ensure all players meet this age requirement before proceeding.
        </p>
      </Modal>
    </SetupPageLayout>
  );
}

export default GetToKnowSetup;