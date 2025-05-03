const factsData = [
  {
    id: 'fact-capital-fr',
    question: 'What is the capital of France?',
    options: ['Berlin', 'Madrid', 'Paris', 'Rome'],
    correctAnswer: 'Paris',
  },
  {
    id: 'fact-red-planet',
    question: 'Which planet is known as the Red Planet?',
    options: ['Earth', 'Mars', 'Jupiter', 'Saturn'],
    correctAnswer: 'Mars',
  },
  {
    id: 'fact-largest-ocean',
    question: 'What is the largest ocean on Earth?',
    options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'],
    correctAnswer: 'Pacific',
  },
  {
    id: 'fact-hamlet',
    question: 'Who wrote "Hamlet"?',
    options: ['Charles Dickens', 'William Shakespeare', 'Leo Tolstoy', 'Mark Twain'],
    correctAnswer: 'William Shakespeare',
  },
  {
    id: 'fact-water-symbol',
    question: 'What is the chemical symbol for water?',
    options: ['O2', 'H2O', 'CO2', 'NaCl'],
    correctAnswer: 'H2O',
  },
  {
    id: 'fact-tallest-mammal',
    question: 'What is the tallest mammal?',
    options: ['Elephant', 'Giraffe', 'Whale', 'Rhino'],
    correctAnswer: 'Giraffe',
  },
  {
    id: 'fact-largest-country',
    question: 'Which country is the largest by area?',
    options: ['China', 'USA', 'Canada', 'Russia'],
    correctAnswer: 'Russia',
  },
  {
    id: 'fact-guacamole',
    question: 'What is the main ingredient in guacamole?',
    options: ['Tomato', 'Avocado', 'Onion', 'Lime'],
    correctAnswer: 'Avocado',
  },
  {
    id: 'fact-continents',
    question: 'How many continents are there?',
    options: ['5', '6', '7', '8'],
    correctAnswer: '7',
  },
  {
    id: 'fact-hardest-substance',
    question: 'What is the hardest natural substance on Earth?',
    options: ['Gold', 'Iron', 'Diamond', 'Quartz'],
    correctAnswer: 'Diamond',
  },
];

// Function to get a random subset of facts in a standard format
export const getFactsQuiz = (count = 5) => {
  const shuffled = [...factsData].sort(() => 0.5 - Math.random());
  // Add type to each question object
  return shuffled.slice(0, count).map(item => ({ ...item, type: 'fact' }));
};