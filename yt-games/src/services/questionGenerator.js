import { concepts } from '../data/concepts'; // Assuming concepts are needed directly or passed

/**
 * Shuffles array in place.
 * @param {Array} array items An array containing the items.
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Generates a specified number of unique quiz questions based on game configuration.
 *
 * @param {object} gameConfig - Configuration for the game.
 * @param {string[]} gameConfig.selectedCategories - Array of category IDs.
 * @param {number} gameConfig.numQuestions - Total number of questions to generate.
 * @param {string[]} gameConfig.allowedQuestionTypes - Array of allowed question type IDs (e.g., ['mc', 'tf', 'id', 'flag_mc', 'language_mc']).
 * @param {object[]} allConcepts - The full list of concept objects from concepts.js.
 * @returns {object[]} An array of generated question objects.
 */
export const generateQuestions = (gameConfig, allConcepts = concepts) => {
  const { selectedCategories, numQuestions, allowedQuestionTypes } = gameConfig;
  const questions = [];
  let availableConcepts = [...allConcepts];

  // Filter concepts by selected categories
  if (selectedCategories && selectedCategories.length > 0) {
    availableConcepts = availableConcepts.filter(concept =>
      selectedCategories.includes(concept.category)
    );
  }

  // Shuffle available concepts to get variety
  shuffleArray(availableConcepts);

  for (let i = 0; i < Math.min(numQuestions, availableConcepts.length); i++) {
    const concept = availableConcepts[i];
    let questionTypePool = [...allowedQuestionTypes];

    // Determine possible question types for this concept
    let possibleTypesForConcept = [];
    if (questionTypePool.includes('mc')) { // Standard MC
        if (concept.attribute && concept.correctValue) possibleTypesForConcept.push('text_mc');
    }
    if (questionTypePool.includes('tf') && concept.trueFalseStatement) { // True/False
        possibleTypesForConcept.push('true_false');
    }
    if (questionTypePool.includes('id') && concept.correctValue) { // Identification
        // For ID, question is usually the subject or a description of it.
        // We'll use the true statement's structure but ask for the correctValue.
        possibleTypesForConcept.push('identification');
    }
    if (questionTypePool.includes('flag_mc') && concept.category === 'flags') {
        possibleTypesForConcept.push('flag_mc');
    }
    if (questionTypePool.includes('language_mc') && concept.category === 'languages') {
        possibleTypesForConcept.push('language_mc');
    }

    // Filter by allowed types again, in case some concept-specific types are not in global allowedQuestionTypes
    possibleTypesForConcept = possibleTypesForConcept.filter(type => allowedQuestionTypes.includes(type));


    if (possibleTypesForConcept.length === 0) {
        console.warn(`No suitable question type for concept ${concept.id} with allowed types: ${allowedQuestionTypes.join(', ')}. Skipping.`);
        continue; // Skip this concept if no question can be formed
    }

    shuffleArray(possibleTypesForConcept);
    const selectedQuestionType = possibleTypesForConcept[0];

    let questionObj = {
      id: `${concept.id}-${selectedQuestionType}`,
      conceptId: concept.id,
      category: concept.category,
      type: selectedQuestionType,
      question: '',
      options: [],
      correctAnswer: concept.correctValue,
    };

    // Generate distractors (for MC types)
    const getDistractors = (currentConcept, count = 3) => {
      const distractors = [];
      const potentialDistractors = allConcepts.filter(c =>
        c.id !== currentConcept.id &&
        c.category === currentConcept.category && // Same category
        (currentConcept.attribute ? c.attribute === currentConcept.attribute : true) && // Same attribute if specified
        c.correctValue !== currentConcept.correctValue
      );
      shuffleArray(potentialDistractors);
      for (let k = 0; k < Math.min(count, potentialDistractors.length); k++) {
        distractors.push(potentialDistractors[k].correctValue);
      }
      // Ensure enough distractors, even if from different attributes/categories as a fallback
      if (distractors.length < count) {
        const fallbackDistractors = allConcepts.filter(c =>
            c.id !== currentConcept.id &&
            c.correctValue !== currentConcept.correctValue &&
            !distractors.includes(c.correctValue)
        );
        shuffleArray(fallbackDistractors);
        for (let k = 0; k < Math.min(count - distractors.length, fallbackDistractors.length); k++) {
            distractors.push(fallbackDistractors[k].correctValue);
        }
      }
      return distractors;
    };

    switch (selectedQuestionType) {
      case 'text_mc':
        questionObj.question = `What is the ${concept.attribute.toLowerCase()} of ${concept.subject}?`;
        questionObj.options = [concept.correctValue, ...getDistractors(concept, 3)];
        shuffleArray(questionObj.options);
        break;
      case 'flag_mc':
        questionObj.question = concept.subject; // The flag emoji
        questionObj.options = [concept.correctValue, ...getDistractors(concept, 3)];
        shuffleArray(questionObj.options);
        break;
      case 'language_mc':
        questionObj.question = `"${concept.subject}" means "Hello World" in which language?`;
        questionObj.options = [concept.correctValue, ...getDistractors(concept, 3)];
        shuffleArray(questionObj.options);
        break;
      case 'true_false':
        // Decide randomly whether to present the true or false statement
        if (Math.random() > 0.5) {
          questionObj.question = concept.trueFalseStatement.true;
          questionObj.correctAnswer = 'True'; // Correct answer is "True"
        } else {
          // Find a distractor for the false statement
          const distractorPool = allConcepts.filter(c =>
            c.id !== concept.id &&
            c.category === concept.category &&
            (concept.attribute ? c.attribute === concept.attribute : true) &&
            c.correctValue !== concept.correctValue
          );
          shuffleArray(distractorPool);
          const distractor = distractorPool.length > 0 ? distractorPool[0].correctValue : "a different value"; // Fallback distractor
          questionObj.question = concept.trueFalseStatement.falseTemplate.replace('{distractor}', distractor);
          questionObj.correctAnswer = 'False'; // Correct answer is "False"
        }
        questionObj.options = ['True', 'False'];
        break;
      case 'identification':
        // For identification, the question is often descriptive, and the answer is the specific term.
        // We can use the 'true' statement and blank out the subject or correct value.
        // Example: "Paris is the capital of _____." Answer: France
        // Or: "What is the capital of France?" Answer: Paris
        // Let's use the latter form for simplicity, asking for the correctValue.
        if (concept.attribute) {
            questionObj.question = `What is the ${concept.attribute.toLowerCase()} of ${concept.subject}?`;
        } else {
            // If no attribute, the subject itself might be the question.
            // e.g. subject: "Largest Ocean on Earth", correctAnswer: "Pacific Ocean"
            // Question: "What is the Largest Ocean on Earth?"
            questionObj.question = `What is the ${concept.subject}?`;
        }
        // No options for identification, correctAnswer is already set.
        questionObj.options = []; // Explicitly empty
        break;
      default:
        console.warn(`Unhandled question type: ${selectedQuestionType} for concept ${concept.id}`);
        continue; // Skip if type is unknown
    }
    questions.push(questionObj);
  }

  // Ensure we have the exact number of questions requested if possible,
  // by trimming if we generated more (e.g. due to min(numQuestions, availableConcepts.length))
  return questions.slice(0, numQuestions);
};