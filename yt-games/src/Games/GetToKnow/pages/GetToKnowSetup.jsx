import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SetupPageLayout from '../../Utils/utils_setup/SetupPageLayout';
import Modal from '../../Utils/utils_components/Modal';
import PlayerSetup from '../../Utils/utils_setup/PlayerSetup';
import GameOptionSelector from '../../Utils/utils_setup/GameOptionSelector';
import StyledNumberInput from '../../Utils/utils_setup/StyledNumberInput';
import GameStartTransition from '../../Utils/utils_components/GameStartTransition';
import CategorySelectionModal from '../../Utils/utils_components/CategorySelectionModal';
import SelectedCategoriesDisplay from '../../Utils/utils_setup/SelectedCategoriesDisplay';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;

const CATEGORIES = [
  { id: "ClosestFriendBond", name: "🫂 Questions for Your Best Friend to Deepen Your Bond", fileName: "closest_friend_bond_questions.json", isRRatedHint: false },
  { id: "SiblingSharedPast", name: "👨‍👩‍👧‍👦 Questions for Your Sibling About Your Shared History", fileName: "sibling_shared_past_questions.json", isRRatedHint: false },
  { id: "PersonalFailureReflection", name: "📉 Questions to Ask Yourself After a Setback", fileName: "personal_failure_reflection_questions.json", isRRatedHint: false },
  { id: "PartnerDeepestConnection", name: "❤️ Questions for Your Partner to Explore Your Connection", fileName: "partner_deepest_connection_questions.json", isRRatedHint: false },
  { id: "GrandparentLifeReflection", name: "👵 Questions to Ask Your Grandparent to Know Them Better", fileName: "grandparent_life_reflection_questions.json", isRRatedHint: false },
  { id: "FeelingLostDirectionless", name: "🧭 Questions to Ask Yourself When You're Feeling Lost", fileName: "feeling_lost_directionless_questions.json", isRRatedHint: false },
  { id: "OvercomingAdversity", name: "💪 Questions for Someone Who's Overcome Great Challenges", fileName: "overcoming_adversity_questions.json", isRRatedHint: false },
  { id: "GrownChildInnerWorld", name: "🧒 Questions for Your Grown Child About Their Life", fileName: "grown_child_inner_world_questions.json", isRRatedHint: false },
  { id: "LifeAlteringDecision", name: "🚧 Questions to Ask Yourself Before a Big Decision", fileName: "life_altering_decision_questions.json", isRRatedHint: false },
  { id: "OldLoveReflection", name: "🕊️ Questions to Reflect on a Past Relationship", fileName: "old_love_reflection_questions.json", isRRatedHint: false }
];

const SESSION_STORAGE_KEY = 'getToKnowSetup_v4'; // Incremented version for new category names

const MIN_QUESTIONS = 1;
const MAX_QUESTIONS_SETUP = 50;

const TURN_PROGRESSION_OPTIONS = [
  { id: "sequential", value: "sequential", name: "🔄 Sequential (Players take turns in order)" },
  { id: "random", value: "random", name: "🎲 Random (Player order is shuffled each round)" }
];

const defaultState = {
  numPlayersUI: MIN_PLAYERS,
  playerNames: Array(MIN_PLAYERS).fill(''),
  selectedCategories: [],
  rRatedModalConfirmed: false,
  turnProgression: 'sequential',
  numberOfQuestions: 20,
};

function GetToKnowSetup({ registerNavbarActions, unregisterNavbarActions }) {
  const navigate = useNavigate();
  const [numPlayersUI, setNumPlayersUI] = useState(defaultState.numPlayersUI);
  const [playerNames, setPlayerNames] = useState(defaultState.playerNames);
  const [selectedCategories, setSelectedCategories] = useState(defaultState.selectedCategories);
  const [showRRatedModal, setShowRRatedModal] = useState(false);
  const [rRatedModalConfirmed, setRRatedModalConfirmed] = useState(defaultState.rRatedModalConfirmed);
  const [turnProgression, setTurnProgression] = useState(defaultState.turnProgression);
  const [numberOfQuestions, setNumberOfQuestions] = useState(defaultState.numberOfQuestions);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionGameConfig, setTransitionGameConfig] = useState(null);
  const gameRoutePath = '/get-to-know/play';

  useEffect(() => {
    try {
      const savedSettings = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setNumPlayersUI(parsedSettings.numPlayersUI || defaultState.numPlayersUI);
        const loadedPlayerNames = parsedSettings.playerNames || [];
        const numPlayers = parsedSettings.numPlayersUI || defaultState.numPlayersUI;
        setPlayerNames(Array(numPlayers).fill('').map((_, i) => loadedPlayerNames[i] || ''));
        
        const validSavedCategories = (parsedSettings.selectedCategories || []).filter(catId =>
          CATEGORIES.some(c => c.id === catId)
        );
        setSelectedCategories(validSavedCategories.length > 0 ? validSavedCategories : defaultState.selectedCategories);

        setRRatedModalConfirmed(parsedSettings.rRatedModalConfirmed || defaultState.rRatedModalConfirmed);
        setTurnProgression(parsedSettings.turnProgression || defaultState.turnProgression);
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
      selectedCategories,
      rRatedModalConfirmed,
      turnProgression,
      numberOfQuestions,
    };
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(settingsToSave));
    } catch (error) {
      console.error("Failed to save Get To Know settings to session storage:", error);
    }
  }, [numPlayersUI, playerNames, selectedCategories, rRatedModalConfirmed, turnProgression, numberOfQuestions]);

  const hasSelectedRRatedCategory = useMemo(() => {
    return selectedCategories.some(catId => {
      const category = CATEGORIES.find(c => c.id === catId);
      return category && category.isRRatedHint;
    });
  }, [selectedCategories]);

  useEffect(() => {
    if (!hasSelectedRRatedCategory && rRatedModalConfirmed) {
      setRRatedModalConfirmed(false);
    }
    if (!hasSelectedRRatedCategory && showRRatedModal) {
        setShowRRatedModal(false);
    }
  }, [hasSelectedRRatedCategory, rRatedModalConfirmed, showRRatedModal]);


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

    if (!selectedCategories || selectedCategories.length === 0) {
      newErrors.category = 'Please select at least one question category.';
    }

    if (hasSelectedRRatedCategory && !rRatedModalConfirmed) {
        newErrors.category = `Please confirm age restriction for selected R-rated categories.`;
        if (updateState && !showRRatedModal) setShowRRatedModal(true);
    }

    if (!turnProgression) {
      newErrors.turnProgression = 'Please select a player turn order.';
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
  }, [playerNames, numPlayersUI, selectedCategories, rRatedModalConfirmed, showRRatedModal, turnProgression, numberOfQuestions, hasSelectedRRatedCategory]);

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

  const handleOpenCategoryModal = () => setIsCategoryModalOpen(true);
  const handleCloseCategoryModal = () => setIsCategoryModalOpen(false);

  const handleConfirmCategorySelection = (newlySelectedIds) => {
    setSelectedCategories(newlySelectedIds);
    setIsCategoryModalOpen(false);
    if (errors.category) setErrors(prev => ({ ...prev, category: null }));

    const newlySelectedRRated = newlySelectedIds.some(catId => {
        const category = CATEGORIES.find(c => c.id === catId);
        return category && category.isRRatedHint;
    });

    if (newlySelectedRRated && !rRatedModalConfirmed) {
      setShowRRatedModal(true);
    } else if (!newlySelectedRRated && showRRatedModal) {
      setShowRRatedModal(false);
    }
  };

  const handleRRatedModalConfirm = () => {
    setRRatedModalConfirmed(true);
    setShowRRatedModal(false);
    if (errors.category) setErrors(prev => ({ ...prev, category: null }));
  };

  const handleRRatedModalCancel = () => {
    const rRatedCategoryIds = CATEGORIES.filter(c => c.isRRatedHint).map(c => c.id);
    setSelectedCategories(prev => prev.filter(id => !rRatedCategoryIds.includes(id)));
    setRRatedModalConfirmed(false);
    setShowRRatedModal(false);
    toast.info("R-Rated categories deselected due to age confirmation cancellation.");
  };

  const handleStartGame = useCallback(() => {
    const formErrors = validateForm(true);
    if (Object.keys(formErrors).length > 0) {
      toast.warn("Please fix the errors in the form.");
      return;
    }
    
    if (hasSelectedRRatedCategory && !rRatedModalConfirmed) {
        if (!showRRatedModal) setShowRRatedModal(true);
        toast.warn(`Please confirm age restriction for selected R-rated categories.`);
        return;
    }

    setIsLoading(true);
    const activePlayers = playerNames.slice(0, numPlayersUI).map(name => ({
      id: crypto.randomUUID(),
      name: name.trim(),
    }));

    const selectedCategoryObjects = CATEGORIES.filter(cat => selectedCategories.includes(cat.id));

    const gameConfig = {
      players: activePlayers,
      selectedCategories: selectedCategoryObjects.map(cat => cat.id),
      selectedCategoryNames: selectedCategoryObjects.map(cat => cat.name), // This will now use the new names
      turnProgression,
      numberOfQuestions,
    };

    setTransitionGameConfig(gameConfig);
    setIsTransitioning(true);
  }, [validateForm, selectedCategories, rRatedModalConfirmed, showRRatedModal, playerNames, numPlayersUI, turnProgression, numberOfQuestions, hasSelectedRRatedCategory]);

  const handleResetSettings = useCallback(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setNumPlayersUI(defaultState.numPlayersUI);
    setPlayerNames(defaultState.playerNames);
    setSelectedCategories(defaultState.selectedCategories);
    setRRatedModalConfirmed(defaultState.rRatedModalConfirmed);
    setTurnProgression(defaultState.turnProgression);
    setNumberOfQuestions(defaultState.numberOfQuestions);
    setShowRRatedModal(false);
    setErrors({});
    toast.info("Settings have been reset to default.");
  }, []);

  const checkValidity = useCallback(() => {
    const currentErrors = validateForm(false);
    const allPlayerNamesFilled = playerNames.slice(0, numPlayersUI).every(name => name.trim() !== '');
    
    let rRatedCheckPassed = true;
    if (hasSelectedRRatedCategory && !rRatedModalConfirmed) {
      rRatedCheckPassed = false;
    }
    const categoriesSelected = selectedCategories.length > 0;
    const turnProgressionValid = !!turnProgression;
    const numQuestionsValid = numberOfQuestions >= MIN_QUESTIONS && numberOfQuestions <= MAX_QUESTIONS_SETUP && Number.isInteger(numberOfQuestions);

    return Object.keys(currentErrors).length === 0 && allPlayerNamesFilled && categoriesSelected && rRatedCheckPassed && turnProgressionValid && numQuestionsValid;
  }, [validateForm, playerNames, numPlayersUI, selectedCategories, rRatedModalConfirmed, turnProgression, numberOfQuestions, hasSelectedRRatedCategory]);

  const isValidToStartValue = useMemo(() => checkValidity(), [checkValidity]);

  const navbarConfig = useMemo(() => ({
    startHandler: handleStartGame,
    resetHandler: handleResetSettings,
    isLoading: isLoading || isTransitioning,
    isValidToStart: isTransitioning ? false : isValidToStartValue,
  }), [handleStartGame, handleResetSettings, isLoading, isTransitioning, isValidToStartValue]);
  
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

  const handleTransitionComplete = useCallback(() => {
    if (transitionGameConfig && gameRoutePath) {
      navigate(gameRoutePath, { state: { gameConfig: transitionGameConfig } });
    } else {
      console.error("GetToKnowSetup: Transition complete but game config or path missing.");
      toast.error("Failed to start game. Please try again.");
      setIsTransitioning(false);
      setIsLoading(false);
    }
  }, [navigate, transitionGameConfig, gameRoutePath]);

  if (isTransitioning) {
    return (
      <GameStartTransition
        gameName="Get To Know"
        onComplete={handleTransitionComplete}
      />
    );
  }

  return (
    <SetupPageLayout>
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

      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">2. Question Categories</h3>
        <SelectedCategoriesDisplay
          selectedCategories={selectedCategories}
          allCategoriesData={CATEGORIES}
          onManageCategoriesClick={handleOpenCategoryModal}
          placeholderText="No categories selected. Click to choose."
          buttonText="Select Categories"
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
      <CategorySelectionModal
        isOpen={isCategoryModalOpen}
        onClose={handleCloseCategoryModal}
        onConfirm={handleConfirmCategorySelection}
        title="Select Question Categories"
        allCategories={CATEGORIES}
        initiallySelectedCategories={selectedCategories}
        allowMultiple={true}
      />

      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">3. Player Turn Order</h3>
        <GameOptionSelector
          options={TURN_PROGRESSION_OPTIONS}
          selectedOption={turnProgression}
          onOptionChange={(value) => {
            setTurnProgression(value);
            if (errors.turnProgression) setErrors(prev => ({ ...prev, turnProgression: null }));
          }}
          type="radio"
          groupName="getToKnowTurnProgression"
          isLoading={isLoading}
          error={errors.turnProgression}
          layoutClass="flex flex-col space-y-2"
          itemLayoutClass = "flex items-center space-x-3 px-4 py-2.5 rounded-lg cursor-pointer transition duration-200 border"
          baseItemClass = "bg-gray-600 hover:bg-gray-550 text-textPrimary border-gray-500 hover:border-gray-400"
          selectedItemClass = "bg-primary-dark text-white border-primary-light ring-2 ring-primary-light"
          containerClass="bg-transparent border-none p-0"
        />
      </div>

      <div className="mb-6 p-4 bg-gray-700 rounded-md shadow">
        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-600 pb-2">4. Number of Questions</h3>
        <StyledNumberInput
          id="number-of-questions"
          label={`Select how many questions for the game (Min: ${MIN_QUESTIONS}, Max: ${MAX_QUESTIONS_SETUP}):`}
          value={numberOfQuestions}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (isNaN(val)) {
               setNumberOfQuestions(MIN_QUESTIONS);
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
          containerClassName="flex flex-col items-start w-full sm:w-1/2"
          labelClassName="mb-2 text-sm font-medium text-gray-200"
          inputClassName="text-center"
        />
      </div>

      <Modal
        isOpen={showRRatedModal && hasSelectedRRatedCategory && !rRatedModalConfirmed}
        onClose={handleRRatedModalCancel}
        title="Age Restriction Warning!"
        titleColor="text-yellow-400"
        footerContent={
          <>
            <button onClick={handleRRatedModalCancel} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors">
              Cancel & Deselect R-Rated
            </button>
            <button onClick={handleRRatedModalConfirm} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-md transition-colors">
              Confirm (All Players 18+)
            </button>
          </>
        }
      >
        <p>
          One or more selected categories may contain content intended for players aged 18 and above.
          Please ensure all players meet this age requirement before proceeding.
        </p>
      </Modal>
    </SetupPageLayout>
  );
}

export default GetToKnowSetup;