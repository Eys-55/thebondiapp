// Using simple emojis for flags for now.
const flagsData = [
  { id: 'flag-ph', flag: '🇵🇭', country: 'Philippines' },
  { id: 'flag-jp', flag: '🇯🇵', country: 'Japan' },
  { id: 'flag-us', flag: '🇺🇸', country: 'United States' },
  { id: 'flag-ca', flag: '🇨🇦', country: 'Canada' },
  { id: 'flag-br', flag: '🇧🇷', country: 'Brazil' },
  { id: 'flag-de', flag: '🇩🇪', country: 'Germany' },
  { id: 'flag-fr', flag: '🇫🇷', country: 'France' },
  { id: 'flag-it', flag: '🇮🇹', country: 'Italy' },
  { id: 'flag-au', flag: '🇦🇺', country: 'Australia' },
  { id: 'flag-kr', flag: '🇰🇷', country: 'South Korea' },
];

// Function to get a random subset of flags and generate options in a standard format
export const getFlagQuiz = (count = 5) => {
  const shuffled = [...flagsData].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);

  return selected.map(item => {
    const correctAnswer = item.country;
    // Get some wrong answers
    const wrongAnswers = flagsData
      .filter(f => f.country !== correctAnswer)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map(f => f.country);

    const options = [...wrongAnswers, correctAnswer].sort(() => 0.5 - Math.random());

    return {
      id: item.id,
      question: item.flag, // The flag emoji is the question content
      options: options,
      correctAnswer: correctAnswer,
      type: 'flag', // Add type for potential specific rendering
    };
  });
};