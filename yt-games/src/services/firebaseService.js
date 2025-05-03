import { db } from '../firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  writeBatch // Import writeBatch for submitAnswer check
} from 'firebase/firestore';
import { getFactsQuiz } from '../data/facts';
import { getFlagQuiz } from '../data/flags';
import { getLanguageQuiz } from '../data/languages';

const GAMES_COLLECTION = 'games';

// Game Statuses: 'waiting', 'playing', 'showing_results', 'finished'

// Helper to shuffle array (Fisher-Yates)
const shuffleArray = (array) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
};

// Helper to generate questions based on config
const generateQuestions = (config) => {
    const { selectedCategories = [], numQuestions = 10 } = config;
    const QUIZ_FETCHERS = {
        flags: getFlagQuiz,
        languages: getLanguageQuiz,
        facts: getFactsQuiz,
    };

    let combinedQuizPool = [];
    selectedCategories.forEach(category => {
        const fetcher = QUIZ_FETCHERS[category];
        if (fetcher) {
            // Fetch a larger pool than needed to ensure variety
            combinedQuizPool = combinedQuizPool.concat(fetcher(50));
        }
    });

    const shuffledPool = shuffleArray(combinedQuizPool);
    // Ensure questions have unique IDs if possible, though shuffling helps
    const finalQuiz = shuffledPool.slice(0, numQuestions);

    // Add question numbers for easier reference if needed
    return finalQuiz.map((q, index) => ({ ...q, questionNumber: index + 1 }));
};


// --- Game Management ---

export const createGame = async (hostName, config) => {
  try {
    // Generate a unique player ID for the host (replace with Auth UID later)
    const hostId = `host_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const questions = generateQuestions(config);

    const gameData = {
      hostId: hostId,
      config: { // Ensure all config values are present
          selectedCategories: config.selectedCategories || [],
          numQuestions: config.numQuestions || 10,
          timePerQuestion: config.timePerQuestion || 10,
          numLives: config.numLives || 3,
          cooldownSeconds: config.cooldownSeconds || 3, // Added cooldown
          gameMode: config.gameMode || 'safe_if_correct',
      },
      status: 'waiting', // Initial status
      players: {
        [hostId]: {
          id: hostId,
          name: hostName || `Host ${Math.random().toString(36).substring(2, 5)}`,
          isHost: true,
          lives: config.numLives || 3,
          score: 0,
          joinedAt: serverTimestamp(),
          // Fields for gameplay state
          currentAnswer: null, // Player's submitted answer for the current question
          answeredCorrectlyFirst: null, // Boolean flag set by host after evaluation
          answerTimestamp: null, // Firestore server timestamp when answer was submitted
        }
      },
      questions: questions,
      currentQuestionIndex: -1, // Start at -1, move to 0 when game starts
      currentQuestionStartTime: null,
      lastQuestionResults: null, // To store results during cooldown
      // evaluatedQuestionIndex: -1, // Flag to prevent double evaluation (alternative to checking status)
      createdAt: serverTimestamp(),
    };

    const gameRef = await addDoc(collection(db, GAMES_COLLECTION), gameData);
    console.log("Game created with ID:", gameRef.id);
    return { gameId: gameRef.id, hostId: hostId };
  } catch (error) {
    console.error("Error creating game:", error);
    throw error; // Re-throw to handle in UI
  }
};

export const getGame = async (gameId) => {
  try {
    const gameRef = doc(db, GAMES_COLLECTION, gameId);
    const gameSnap = await getDoc(gameRef);

    if (gameSnap.exists()) {
      return { id: gameSnap.id, ...gameSnap.data() };
    } else {
      console.log("No such game document!");
      return null;
    }
  } catch (error) {
    console.error("Error getting game:", error);
    throw error;
  }
};

// Listen for real-time updates to a game
export const listenToGame = (gameId, callback) => {
  const gameRef = doc(db, GAMES_COLLECTION, gameId);
  // Returns the unsubscribe function
  return onSnapshot(gameRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null); // Indicate game not found or deleted
    }
  }, (error) => {
    console.error("Error listening to game:", error);
    // Handle error appropriately in the UI if needed
  });
};

// --- Player Management ---

export const addPlayerToGame = async (gameId, playerName) => {
    try {
        const gameRef = doc(db, GAMES_COLLECTION, gameId);
        const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const gameData = await getGame(gameId); // Fetch current config for lives

        if (!gameData) throw new Error("Game not found");
        if (gameData.status !== 'waiting') throw new Error("Game has already started or finished.");

        const newPlayer = {
            id: playerId,
            name: playerName || `Player ${Math.random().toString(36).substring(2, 5)}`,
            isHost: false,
            lives: gameData.config?.numLives || 3,
            score: 0,
            joinedAt: serverTimestamp(),
            currentAnswer: null,
            answeredCorrectlyFirst: null,
            answerTimestamp: null,
        };

        // Use dot notation to add a player to the map
        await updateDoc(gameRef, {
            [`players.${playerId}`]: newPlayer
        });

        console.log(`Player ${playerName} (${playerId}) added to game ${gameId}`);
        return { playerId: playerId };
    } catch (error) {
        console.error("Error adding player:", error);
        throw error;
    }
};

// TODO: Implement removePlayerFromGame

// --- Game State Updates ---

export const startGame = async (gameId, hostId) => {
    try {
        const gameRef = doc(db, GAMES_COLLECTION, gameId);
        const gameData = await getGame(gameId);

        if (!gameData) throw new Error("Game not found");
        if (gameData.hostId !== hostId) throw new Error("Only the host can start the game.");
        if (gameData.status !== 'waiting') throw new Error("Game is not in a waiting state.");
        if (!gameData.questions || gameData.questions.length === 0) throw new Error("No questions generated for this game.");
        if (Object.keys(gameData.players || {}).length < 1) throw new Error("Cannot start game with no players.");

        // Reset player states for the start of the game
        const initialPlayerUpdates = {};
        Object.keys(gameData.players).forEach(pId => {
            initialPlayerUpdates[`players.${pId}.score`] = 0;
            initialPlayerUpdates[`players.${pId}.lives`] = gameData.config?.numLives || 3;
            initialPlayerUpdates[`players.${pId}.currentAnswer`] = null;
            initialPlayerUpdates[`players.${pId}.answeredCorrectlyFirst`] = null;
            initialPlayerUpdates[`players.${pId}.answerTimestamp`] = null;
        });

        // Set status to playing and advance to the first question
        await updateDoc(gameRef, {
            ...initialPlayerUpdates, // Apply player resets
            status: 'playing', // Start in 'playing' state
            currentQuestionIndex: 0,
            currentQuestionStartTime: serverTimestamp(), // Mark start time for the first question
            lastQuestionResults: null, // Clear any previous results
        });
        console.log(`Game ${gameId} started by host ${hostId}`);
    } catch (error) {
        console.error("Error starting game:", error);
        throw error;
    }
};

// Function for player to submit an answer
export const submitAnswer = async (gameId, playerId, questionIndex, answer) => {
    const gameRef = doc(db, GAMES_COLLECTION, gameId);
    let allAnswered = false;

    try {
        // Use a batch to update the answer and then potentially trigger advance
        const batch = writeBatch(db);

        // 1. Update the player's answer
        batch.update(gameRef, {
            [`players.${playerId}.currentAnswer`]: answer,
            [`players.${playerId}.answerTimestamp`]: serverTimestamp(),
            [`players.${playerId}.answeredCorrectlyFirst`]: null, // Reset this flag
        });

        await batch.commit(); // Commit the answer submission first
        console.log(`Player ${playerId} submitted answer "${answer}" for question ${questionIndex} in game ${gameId}`);

        // 2. Check if all active players have answered *after* submission
        const updatedGameData = await getGame(gameId); // Re-fetch latest data
        if (!updatedGameData) throw new Error("Game data disappeared after submission.");

        // Check only if the game is still in the 'playing' state for the correct question
        if (updatedGameData.status === 'playing' && updatedGameData.currentQuestionIndex === questionIndex) {
            const players = updatedGameData.players;
            const activePlayerIds = Object.keys(players).filter(pId => (players[pId].lives || 0) > 0);
            const answeredCount = activePlayerIds.filter(pId => players[pId].currentAnswer !== null).length;

            if (activePlayerIds.length > 0 && answeredCount >= activePlayerIds.length) {
                allAnswered = true;
                console.log(`All ${activePlayerIds.length} active players have answered question ${questionIndex}. Triggering advance.`);
                // Call advanceToResultsState - no need to await here, let it run
                advanceToResultsState(gameId, playerId).catch(err => {
                    console.error(`Error auto-advancing game ${gameId} after full submission:`, err);
                    // Handle potential error, maybe log it or notify host?
                });
            }
        }

    } catch (error) {
        console.error("Error submitting answer or checking for advance:", error);
        throw error; // Re-throw to be caught in the UI
    }
};


// Renamed from advanceQuestionAndUpdateState
// This function evaluates answers and moves the game to 'showing_results'
export const advanceToResultsState = async (gameId, triggererId /* Can be host or player */) => {
    const gameRef = doc(db, GAMES_COLLECTION, gameId);

    try {
        await runTransaction(db, async (transaction) => {
            const gameSnap = await transaction.get(gameRef);
            if (!gameSnap.exists()) throw new Error("Game not found");

            const gameData = gameSnap.data();
            const gameMode = gameData.config?.gameMode || 'safe_if_correct';

            // --- Pre-checks ---
            // Only advance if currently playing this question
            if (gameData.status !== 'playing') {
                 console.warn(`Advance called for game ${gameId} but status is ${gameData.status}. Aborting.`);
                 return; // Already advanced or finished
            }
            if (gameData.currentQuestionIndex < 0 || gameData.currentQuestionIndex >= gameData.questions.length) {
                throw new Error("Invalid question index state for evaluation.");
            }

            const currentQuestion = gameData.questions[gameData.currentQuestionIndex];
            if (!currentQuestion) throw new Error(`Question data missing for index ${gameData.currentQuestionIndex}`);

            console.log(`Advancing game ${gameId} to results state for question ${gameData.currentQuestionIndex} (triggered by ${triggererId})`);

            const players = gameData.players;
            const updates = {}; // Object to hold updates for the transaction
            const playerResults = {}; // To store individual results for display

            // --- Evaluate answers for the *current* question ---
            let firstCorrectTimestamp = null;
            let firstCorrectPlayerId = null;

            // Find the first correct answer timestamp (only relevant for 'first_correct_wins' mode)
            if (gameMode === 'first_correct_wins') {
                Object.entries(players).forEach(([pId, pData]) => {
                    if ((pData.lives || 0) > 0 && pData.currentAnswer === currentQuestion.correctAnswer && pData.answerTimestamp) {
                        const currentTs = pData.answerTimestamp?.toMillis();
                        const firstTs = firstCorrectTimestamp?.toMillis();
                        if (currentTs && (!firstTs || currentTs < firstTs)) {
                            firstCorrectTimestamp = pData.answerTimestamp;
                            firstCorrectPlayerId = pId;
                        }
                    }
                });
            }

            // --- Update scores, lives, and record results for each player ---
            Object.entries(players).forEach(([pId, pData]) => {
                // Store current state before potential updates
                 playerResults[pId] = {
                    submittedAnswer: pData.currentAnswer,
                    wasCorrect: false, // Default
                    scoreChange: 0,
                    lifeChange: 0,
                    isFirstCorrect: false,
                 };

                // Ignore players already out of lives for scoring/life loss
                if ((pData.lives || 0) <= 0) {
                    return; // Skip scoring/life logic
                }

                const isCorrect = pData.currentAnswer === currentQuestion.correctAnswer;
                let loseLife = false;
                let scoreIncrease = 0;

                // Apply scoring logic based on game mode
                if (gameMode === 'first_correct_wins') {
                    const isFirst = (pId === firstCorrectPlayerId);
                    playerResults[pId].isFirstCorrect = isFirst;
                    if (!isFirst) {
                        loseLife = true; // Everyone but the first correct player loses a life
                    }
                    if (isCorrect) {
                         scoreIncrease = 1; // Score awarded if correct, regardless of being first
                    }
                } else { // Default to 'safe_if_correct' logic
                    if (!isCorrect && pData.currentAnswer !== null) { // Lose life only if answered incorrectly (not if timed out without answer)
                        loseLife = true;
                    } else if (isCorrect) {
                        scoreIncrease = 1; // Increment score if correct
                    }
                }

                // Apply updates if changed
                if (scoreIncrease > 0) {
                    updates[`players.${pId}.score`] = (pData.score || 0) + scoreIncrease;
                    playerResults[pId].scoreChange = scoreIncrease;
                }
                if (loseLife) {
                    const newLives = Math.max(0, (pData.lives || 0) - 1);
                    updates[`players.${pId}.lives`] = newLives;
                    playerResults[pId].lifeChange = -1;
                }
                if (isCorrect) {
                    playerResults[pId].wasCorrect = true;
                }
                 // Mark who was first (even in safe_if_correct mode, might be useful info)
                 if (gameMode === 'first_correct_wins') {
                    updates[`players.${pId}.answeredCorrectlyFirst`] = (pId === firstCorrectPlayerId);
                 } else {
                     updates[`players.${pId}.answeredCorrectlyFirst`] = null; // Not strictly relevant but clear it
                 }

            });

            // --- Set state to showing_results ---
            updates['status'] = 'showing_results';
            updates['currentQuestionStartTime'] = null; // Timer stops during results
            updates['lastQuestionResults'] = {
                questionIndex: gameData.currentQuestionIndex,
                correctAnswer: currentQuestion.correctAnswer,
                playerResults: playerResults, // Store detailed results
            };
            // updates['evaluatedQuestionIndex'] = gameData.currentQuestionIndex; // Mark as evaluated

            // Apply all updates in the transaction
            transaction.update(gameRef, updates);
            console.log(`Game ${gameId} state updated to showing_results for question ${gameData.currentQuestionIndex}`);
        });

    } catch (error) {
        console.error(`Error advancing game ${gameId} to results state:`, error);
        throw error;
    }
};


// This function moves from 'showing_results' to the next question or 'finished'
// Should only be called by the host after the cooldown period
export const moveToNextQuestion = async (gameId, hostId) => {
    const gameRef = doc(db, GAMES_COLLECTION, gameId);

    try {
        await runTransaction(db, async (transaction) => {
            const gameSnap = await transaction.get(gameRef);
            if (!gameSnap.exists()) throw new Error("Game not found");

            const gameData = gameSnap.data();

            // --- Pre-checks ---
            if (gameData.hostId !== hostId) throw new Error("Only host can move to the next question.");
            if (gameData.status !== 'showing_results') {
                 console.warn(`MoveToNextQuestion called for game ${gameId} but status is ${gameData.status}. Aborting.`);
                 return; // Not in the correct state
            }

            const updates = {};
            const nextQuestionIndex = gameData.currentQuestionIndex + 1;

            // --- Reset player answer states for the new round ---
             Object.keys(gameData.players).forEach(pId => {
                updates[`players.${pId}.currentAnswer`] = null;
                updates[`players.${pId}.answerTimestamp`] = null;
                updates[`players.${pId}.answeredCorrectlyFirst`] = null;
            });

            // --- Determine next state (check for game over) ---
            const playersAfterUpdate = gameData.players; // Use current lives state
            const activePlayers = Object.values(playersAfterUpdate).filter(p => (p.lives || 0) > 0);

            if (nextQuestionIndex >= gameData.questions.length || activePlayers.length <= 1) {
                // Game Over
                updates['status'] = 'finished';
                updates['currentQuestionIndex'] = -1; // Indicate no active question
                updates['currentQuestionStartTime'] = null;
                // Keep lastQuestionResults for final display? Or clear? Let's clear.
                updates['lastQuestionResults'] = null;
                console.log(`Game ${gameId} finished. Reason: ${nextQuestionIndex >= gameData.questions.length ? 'Out of questions' : 'One or less players left'}.`);
            } else {
                // Advance to the next question
                updates['status'] = 'playing';
                updates['currentQuestionIndex'] = nextQuestionIndex;
                updates['currentQuestionStartTime'] = serverTimestamp(); // Start timer for next question
                updates['lastQuestionResults'] = null; // Clear results
                console.log(`Game ${gameId} moving to question ${nextQuestionIndex}`);
            }

            // Apply all updates in the transaction
            transaction.update(gameRef, updates);
        });
    } catch (error) {
        console.error(`Error moving game ${gameId} to next question:`, error);
        throw error;
    }
};