import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SetupPageLayout from '../../Utils/utils_setup/SetupPageLayout'; // Import the layout
import Modal from '../../Utils/utils_components/Modal'; // Import the new Modal component
import PlayerSetup from '../../Utils/utils_setup/PlayerSetup';
import GameOptionSelector from '../../Utils/utils_setup/GameOptionSelector';
import GameStartTransition from '../../Utils/utils_components/GameStartTransition'; // Import transition component
import CategorySelectionModal from '../../Utils/utils_components/CategorySelectionModal';
import SelectedCategoriesDisplay from '../../Utils/utils_setup/SelectedCategoriesDisplay';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;
const CATEGORIES = [
    { id: "Family", name: "👨‍👩‍👧‍👦 Family" },
    { id: "Friends", name: "🧑‍🤝‍🧑 Friends" },
    { id: "Relationship", name: "❤️‍🔥 Relationship (18+)" }
];
const SESSION_STORAGE_KEY = 'truthOrDareSetup';
import StyledNumberInput from '../../Utils/utils_setup/StyledNumberInput';

const defaultState = {
  numPlayersUI: MIN_PLAYERS,
  playerNames: Array(MIN_PLAYERS).fill(''),
  selectedCategory: null,
  // turnProgression is now fixed to 'random' and not part of default state for user selection
  taskAssignmentMode: 'system_assigned', // formerly 'classic'
  rRatedModalConfirmed: false,
  numberOfTurns: 10, // 0 for unlimited
};

function TruthOrDareSetup({ registerNavbarActions, unregisterNavbarActions }) {
  const navigate = useNavigate();
  const [numPlayersUI, setNumPlayersUI] = useState(defaultState.numPlayersUI);
  const [playerNames, setPlayerNames] = useState(defaultState.playerNames);
  
  const [selectedCategory, setSelectedCategory] = useState(defaultState.selectedCategory);
  // turnProgression is now fixed to 'random' and not a state variable for user selection.
  const turnProgression = 'random'; // Always random
  const [taskAssignmentMode, setTaskAssignmentMode] = useState(defaultState.taskAssignmentMode);
  const [numberOfTurns, setNumberOfTurns] = useState(defaultState.numberOfTurns);
  
  const [showRRatedModal, setShowRRatedModal] = useState(false);
  const [rRatedModalConfirmed, setRRatedModalConfirmed] = useState(defaultState.rRatedModalConfirmed);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false); // New state for transition
  const [transitionGameConfig, setTransitionGameConfig] = useState(null); // Store config for transition
  const gameRoutePath = '/truth-or-dare/play'; // Define game route path

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
        // turnProgression is fixed, no need to load/set from storage for this
        setTaskAssignmentMode(parsedSettings.taskAssignmentMode || defaultState.taskAssignmentMode);
        setRRatedModalConfirmed(parsedSettings.rRatedModalConfirmed || defaultState.rRatedModalConfirmed);
        setNumberOfTurns(parsedSettings.numberOfTurns === undefined ? defaultState.numberOfTurns : parsedSettings.numberOfTurns);
        // turnProgression is a const, no need to load from session storage
        }
        } catch (error) {
      console.error("Failed to load Truth or Dare settings from session storage:", error);
      toast.error("Could not load saved settings.");
    }
  }, []);

  useEffect(() => {
    const settingsToSave = {
      numPlayersUI,
      playerNames,
      selectedCategory,
      // turnProgression is fixed, but can be saved for consistency if needed elsewhere, though not user-configurable
      turnProgression: 'random',
      taskAssignmentMode,
      rRatedModalConfirmed,
      numberOfTurns,
    };
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(settingsToSave));
    } catch (error) {
      console.error("Failed to save Truth or Dare settings to session storage:", error);
    }
  }, [numPlayersUI, playerNames, selectedCategory, taskAssignmentMode, rRatedModalConfirmed, numberOfTurns]);

  useEffect(() => {
    if (taskAssignmentMode === 'player_assigned') {
      setSelectedCategory(null);
      setRRatedModalConfirmed(false);
      setShowRRatedModal(false); // Fixed typo: setShowRRedirectModal -> setShowRRatedModal
      if (errors.category) setErrors(prev => ({ ...prev, category: null }));
    }
  }, [taskAssignmentMode, errors.category]);

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

    if (taskAssignmentMode === 'system_assigned' && !selectedCategory) {
      newErrors.category = 'Please select a category for System Assigned mode.';
    }
    
    if (taskAssignmentMode === 'system_assigned' && selectedCategory === 'Relationship' && !rRatedModalConfirmed) {
        newErrors.category = 'Please confirm age restriction for Relationship category.';
        if (updateState && !showRRatedModal) setShowRRatedModal(true);
    }

    if (numberOfTurns < 0 || numberOfTurns > 50) {
      newErrors.numberOfTurns = 'Number of turns must be between 0 (unlimited) and 50.';
    } else if (!Number.isInteger(numberOfTurns)) {
      newErrors.numberOfTurns = 'Number of turns must be a whole number.';
    }

    if (updateState) {
      setErrors(newErrors);
    }
    return newErrors;
  }, [playerNames, numPlayersUI, taskAssignmentMode, selectedCategory, rRatedModalConfirmed, showRRatedModal, numberOfTurns]);

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

  // const handleCategoryChange = (categoryValue) => { // Old handler
  //   setSelectedCategory(categoryValue);
  //   setRRatedModalConfirmed(false);
  //   if (errors.category) setErrors(prev => ({ ...prev, category: null }));

  //   if (categoryValue === 'Relationship') {
  //     setShowRRatedModal(true);
  //   } else {
  //     setShowRRatedModal(false);
  //   }
  // };
  
  const handleOpenCategoryModal = () => setIsCategoryModalOpen(true);
  const handleCloseCategoryModal = () => setIsCategoryModalOpen(false);

  const handleConfirmCategorySelection = (newlySelectedId) => { // For single select
    setSelectedCategory(newlySelectedId);
    setIsCategoryModalOpen(false);
    if (errors.category) setErrors(prev => ({ ...prev, category: null }));

    if (newlySelectedId === 'Relationship' && !rRatedModalConfirmed) {
      setShowRRatedModal(true);
    } else {
      setShowRRatedModal(false);
    }
  };

  const handleTaskAssignmentModeChange = (mode) => {
    setTaskAssignmentMode(mode);
    setSelectedCategory(null); // Reset category when mode changes
    setShowRRatedModal(false);
    setRRatedModalConfirmed(false);
    if (errors.category) setErrors(prev => ({ ...prev, category: null }));
  };

  const handleRRatedModalConfirm = () => {
    setRRatedModalConfirmed(true);
    setShowRRatedModal(false);
    if (errors.category) setErrors(prev => ({ ...prev, category: null }));
  };

  const handleRRatedModalCancel = () => {
    setSelectedCategory(null); // Deselect Relationship category
    setRRatedModalConfirmed(false);
    setShowRRatedModal(false);
    toast.info("Relationship category deselected. Please choose a category or confirm age if you reselect Relationship.");
  };

  const handleStartGame = useCallback(() => {
    const formErrors = validateForm(true);
    if (Object.keys(formErrors).length > 0) {
      toast.warn("Please fix the errors in the form.");
      return;
    }
    if (taskAssignmentMode === 'system_assigned' && selectedCategory === 'Relationship' && !rRatedModalConfirmed) {
        if (!showRRatedModal) setShowRRatedModal(true);
        toast.warn("Please confirm age restriction for Relationship category.");
        return;
    }

    setIsLoading(true);
    const activePlayers = playerNames.slice(0, numPlayersUI).map(name => ({
      id: crypto.randomUUID(),
      name: name.trim(),
    }));
    const gameConfig = {
      players: activePlayers,
      turnProgression: 'random', // Explicitly set
      taskAssignmentMode: taskAssignmentMode,
      selectedCategory: taskAssignmentMode === 'system_assigned' ? selectedCategory : null,
      numberOfTurns,
    };
    // Instead of navigating directly, set up for transition
    setTransitionGameConfig(gameConfig);
    setIsTransitioning(true);
    // setIsLoading(true); // Keep form disabled
  }, [validateForm, taskAssignmentMode, selectedCategory, rRatedModalConfirmed, showRRatedModal, playerNames, numPlayersUI, turnProgression, numberOfTurns]);

  const handleResetSettings = useCallback(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setNumPlayersUI(defaultState.numPlayersUI);
    setPlayerNames(defaultState.playerNames);
    setSelectedCategory(defaultState.selectedCategory);
    // turnProgression is a const, no need to reset
    setTaskAssignmentMode(defaultState.taskAssignmentMode);
    setRRatedModalConfirmed(defaultState.rRatedModalConfirmed);
    setNumberOfTurns(defaultState.numberOfTurns);
    setShowRRatedModal(false);
    setErrors({});
    toast.info("Settings have been reset to default.");
  }, []);

  const checkValidity = useCallback(() => {
    const currentErrors = validateForm(false);
    const allPlayerNamesFilled = playerNames.slice(0, numPlayersUI).every(name => name.trim() !== '');
    let rRatedCheckPassed = true;
    if (taskAssignmentMode === 'system_assigned' && selectedCategory === 'Relationship' && !rRatedModalConfirmed) {
      rRatedCheckPassed = false;
    }
    const numberOfTurnsValid = numberOfTurns >= 0 && numberOfTurns <= 50 && Number.isInteger(numberOfTurns);
    return Object.keys(currentErrors).length === 0 && allPlayerNamesFilled && rRatedCheckPassed && numberOfTurnsValid;
  }, [validateForm, playerNames, numPlayersUI, taskAssignmentMode, selectedCategory, rRatedModalConfirmed, numberOfTurns]);


  // Memoize isValidToStartValue
  const isValidToStartValue = useMemo(() => checkValidity(), [checkValidity]);

  // Memoize navbarConfig
  const navbarConfig = useMemo(() => ({
    startHandler: handleStartGame,
    resetHandler: handleResetSettings,
    isLoading: isLoading || isTransitioning, // Navbar loading during transition
    isValidToStart: isTransitioning ? false : isValidToStartValue, // Not valid to start again during transition
  }), [handleStartGame, handleResetSettings, isLoading, isTransitioning, isValidToStartValue]);
  
  // Ref pattern for prop callbacks
  const registerNavbarActionsRef = useRef(registerNavbarActions);
  const unregisterNavbarActionsRef = useRef(unregisterNavbarActions);

  useEffect(() => {
    // Keep refs updated with the latest props
    registerNavbarActionsRef.current = registerNavbarActions;
    unregisterNavbarActionsRef.current = unregisterNavbarActions;
  }, [registerNavbarActions, unregisterNavbarActions]);

  // Main useEffect for registering actions, now depends on the memoized navbarConfig
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

  const handleTransitionComplete = useCallback(() => {
    if (transitionGameConfig && gameRoutePath) {
      navigate(gameRoutePath, { state: { gameConfig: transitionGameConfig } });
    } else {
      console.error("TruthOrDareSetup: Transition complete but game config or path missing.");
      toast.error("Failed to start game. Please try again.");
      setIsTransitioning(false); // Revert to setup form
      setIsLoading(false);
    }
  }, [navigate, transitionGameConfig, gameRoutePath]);

  if (isTransitioning) {
    return (
      <GameStartTransition
        gameName="Truth or Dare"
        onComplete={handleTransitionComplete}
      />
    );
  }

  return (
    <SetupPageLayout>
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

      {/* Game Settings */}
      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">2. Game Rules</h3>
        <GameOptionSelector
          label="Task Assignment:"
          options={[
            { id: 'system_assigned', value: 'system_assigned', name: 'System Assigned (System assigns Truths & Dares)' },
            { id: 'player_assigned', value: 'player_assigned', name: 'Player Assigned (Players pick tasks for each other)' },
          ]}
          selectedOption={taskAssignmentMode}
          onOptionChange={(value) => handleTaskAssignmentModeChange(value)}
          type="radio"
          groupName="truthOrDareTaskAssignmentMode"
          isLoading={isLoading}
        />
      </div>

      {/* Category Selection (Conditional) */}
      {taskAssignmentMode === 'system_assigned' && (
        <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
          <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">3. Category (System Assigned Mode)</h3>
          <SelectedCategoriesDisplay
            selectedCategories={selectedCategory ? [selectedCategory] : []}
            allCategoriesData={CATEGORIES}
            onManageCategoriesClick={handleOpenCategoryModal}
            placeholderText="No category selected. Click to choose."
            buttonText="Select Category"
            error={errors.category}
            disabled={isLoading}
            isLoading={isLoading}
            containerClass="bg-gray-700 p-0 border-none"
            labelClass="hidden"
            tagsContainerClass="flex flex-wrap gap-2 mb-3 min-h-[2.5rem] items-center"
            tagClass="px-3 py-1.5 bg-primary text-white text-sm rounded-md"
            placeholderClass="text-gray-400 italic mb-3 px-1"
            buttonClass="w-full px-4 py-2 bg-primary-dark hover:bg-primary text-white font-semibold rounded-md transition-colors disabled:opacity-50"
          />
        </div>
      )}
      {taskAssignmentMode === 'system_assigned' && (
        <CategorySelectionModal
          isOpen={isCategoryModalOpen}
          onClose={handleCloseCategoryModal}
          onConfirm={handleConfirmCategorySelection}
          title="Select Task Category"
          allCategories={CATEGORIES}
          initiallySelectedCategories={selectedCategory ? [selectedCategory] : []}
          allowMultiple={false}
        />
      )}

      <Modal
        isOpen={showRRatedModal && selectedCategory === 'Relationship'}
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
          The "Relationship" category may contain content intended for players aged 18 and above.
          Please ensure all players meet this age requirement before proceeding.
        </p>
      </Modal>

      {/* Game Length Setup */}
      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">4. Game Length</h3>
        <StyledNumberInput
          id="number-of-turns"
          label="Number of Turns (1-50, 0 for unlimited):"
          value={numberOfTurns}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (isNaN(val)) {
                setNumberOfTurns(0); // Default to unlimited if input is not a number
            } else {
                setNumberOfTurns(Math.max(0, Math.min(50, val))); // Clamp between 0 and 50
            }
            if (errors.numberOfTurns) setErrors(prev => ({ ...prev, numberOfTurns: null }));
          }}
          min={0}
          max={50}
          step="1"
          disabled={isLoading}
          error={errors.numberOfTurns}
          containerClassName="flex flex-col items-start w-full sm:w-1/2"
          labelClassName="mb-2 text-sm font-medium text-gray-200"
          inputClassName="text-center"
        />
      </div>

    </SetupPageLayout>
  );
}

export default TruthOrDareSetup;