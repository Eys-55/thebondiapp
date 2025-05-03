/**
 * Generates formatted quiz questions from concept data,
 * dynamically finding distractors from a pool of concepts.
 */

// Helper function to shuffle an array (Fisher-Yates algorithm)
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

// --- Helper function ---
// Gets potential distractor values from a pool of concepts based on category and attribute.
const getPotentialDistractors = (targetConcept, conceptPool) => {
    if (!targetConcept || !conceptPool) return [];

    return conceptPool
        .filter(potentialDistractor =>
            // Must be in the same category (or broader logic if needed)
            potentialDistractor.category === targetConcept.category &&
            // Must have the same attribute (e.g., both are 'Capital' or 'Country')
            potentialDistractor.attribute === targetConcept.attribute &&
            // Must not be the same concept
            potentialDistractor.id !== targetConcept.id &&
            // Must not have the same correct value as the target answer
            potentialDistractor.correctValue !== targetConcept.correctValue
        )
        .map(c => c.correctValue); // Return only the values
};


/**
 * Generates a Multiple Choice question object from a concept, finding distractors dynamically.
 * @param {object} concept - The target concept object.
 * @param {Array<object>} conceptPool - The pool of all available concepts for finding distractors.
 * @returns {object|null} A formatted question object or null if generation fails.
 */
export const generateMultipleChoice = (concept, conceptPool) => {
  if (!concept || !conceptPool) {
    console.warn(`Cannot generate MC for concept ${concept?.id}: Missing concept or pool.`);
    return null;
  }

  // --- Find Distractors ---
  const potentialDistractorValues = getPotentialDistractors(concept, conceptPool);

  if (potentialDistractorValues.length < 3) {
    console.warn(`Cannot generate MC for concept ${concept.id}: Found only ${potentialDistractorValues.length} potential distractors (need 3).`);
    // TODO: Optionally, could try finding distractors from broader categories or tags if < 3 found.
    // For now, fail generation if not enough relevant distractors exist.
    return null;
  }

  // Select 3 unique distractors randomly
  const shuffledDistractors = shuffleArray([...potentialDistractorValues]);
  const selectedDistractors = shuffledDistractors.slice(0, 3);

  // --- Determine Question Text ---
  let questionText = '';
  let questionType = 'text_mc'; // Default type

  if (concept.category === 'flags' && concept.subject?.length === 2) {
    questionText = concept.subject;
    questionType = 'flag_mc';
  } else if (concept.attribute) {
    questionText = `What is the ${concept.attribute.toLowerCase()} of ${concept.subject}?`;
  } else if (concept.subject) {
    questionText = `What is associated with: ${concept.subject}?`;
  } else {
     console.warn(`Cannot generate question text for concept ${concept.id}: Missing subject/attribute.`);
     return null; // Cannot form a question
  }

  // Specific override for languages
  if (concept.category === 'languages') {
     questionText = `Which language is this: "${concept.subject}"?`;
     questionType = 'language_mc';
  }

  // --- Assemble Question ---
  const options = shuffleArray([concept.correctValue, ...selectedDistractors]);

  return {
    id: `${concept.id}-mc-${Date.now()}`,
    question: questionText,
    options: options,
    correctAnswer: concept.correctValue,
    type: questionType,
    // conceptId: concept.id // Optional debug info
  };
};

/**
 * Generates an Identification question object from a concept.
 * @param {object} concept - The target concept object.
 * @returns {object|null} A formatted question object or null if generation fails.
 */
export const generateIdentification = (concept) => {
    if (!concept || !concept.correctValue) {
        console.warn(`Cannot generate ID question for concept ${concept?.id}: Missing concept or correctValue.`);
        return null;
    }

    let questionText = '';

    // Determine question text based on category/subject/attribute
    if (concept.category === 'flags' && concept.subject?.length === 2) {
        questionText = `What country's flag is this: ${concept.subject}?`;
    } else if (concept.category === 'languages') {
        questionText = `What language is this: "${concept.subject}"?`;
    } else if (concept.attribute) {
        // More natural phrasing for identification
        questionText = `The ${concept.attribute.toLowerCase()} of ${concept.subject} is:`;
    } else if (concept.subject) {
        // Fallback if attribute is missing
        questionText = `Identify what is associated with: ${concept.subject}`;
    } else {
        console.warn(`Cannot generate identification question text for concept ${concept.id}: Missing subject/attribute.`);
        return null; // Cannot form a question
    }

    return {
        id: `${concept.id}-id-${Date.now()}`,
        question: questionText,
        options: [], // No options for identification
        correctAnswer: concept.correctValue, // The answer to be typed
        type: 'identification',
        // conceptId: concept.id // Optional debug info
    };
};

/**
 * Generates a True/False question object from a concept, finding a distractor dynamically if needed.
 * @param {object} concept - The target concept object.
 * @param {Array<object>} conceptPool - The pool of all available concepts for finding distractors.
 * @returns {object|null} A formatted question object or null if generation fails.
 */
export const generateTrueFalse = (concept, conceptPool) => {
  if (!concept || !conceptPool || !concept.trueFalseStatement?.true || !concept.trueFalseStatement?.falseTemplate) {
    console.warn(`Cannot generate T/F for concept ${concept?.id}: Missing required fields or pool.`);
    return null;
  }

  let statement = '';
  let correctAnswer = '';
  const makeFalse = Math.random() < 0.5; // 50% chance to make a false statement

  if (makeFalse) {
    // --- Find a suitable distractor for the false statement ---
    const potentialDistractorValues = getPotentialDistractors(concept, conceptPool);

    if (potentialDistractorValues.length === 0) {
        console.warn(`Cannot generate FALSE statement for T/F concept ${concept.id}: No potential distractors found. Defaulting to TRUE.`);
        // Default to making a TRUE statement if no suitable distractor found
        statement = concept.trueFalseStatement.true;
        correctAnswer = 'True';
    } else {
        // Pick a random distractor from the potential values
        const chosenDistractor = potentialDistractorValues[Math.floor(Math.random() * potentialDistractorValues.length)];
        statement = concept.trueFalseStatement.falseTemplate.replace('{distractor}', chosenDistractor);

        // Final check: Ensure the generated false statement isn't accidentally the same as the true one
        if (statement === concept.trueFalseStatement.true) {
            console.warn(`Generated false statement for ${concept.id} was same as true, defaulting to TRUE.`);
            statement = concept.trueFalseStatement.true;
            correctAnswer = 'True';
        } else {
            correctAnswer = 'False'; // Successfully generated a distinct false statement
        }
    }
  } else {
    // Generate a TRUE statement
    statement = concept.trueFalseStatement.true;
    correctAnswer = 'True';
  }

  return {
    id: `${concept.id}-tf-${Date.now()}`,
    question: `True or False: ${statement}`,
    options: ['True', 'False'], // Always the same options for T/F
    correctAnswer: correctAnswer,
    type: 'true_false',
    // conceptId: concept.id // Optional debug info
  };
};