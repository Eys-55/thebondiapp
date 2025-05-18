import React from 'react';
import { Link } from 'react-router-dom';

// Updated game data: removed imageUrl, ensured active games are correctly set up.
const games = [
  {
    id: 'trivia-nights',
    name: 'Trivia Nights ❓',
    description: 'Challenge friends in this local multiplayer quiz! Features flexible question styles: identification or multiple choice.',
    link: '/trivia-nights/setup',
    tags: ['Quiz', 'Multiplayer', 'Local'],
    disabled: false,
  },
  {
    id: 'truth-or-dare',
    name: 'Truth or Dare 🔥',
    description: 'The classic party game of embarrassing questions and funny challenges. Spin the bottle (figuratively!) and choose your fate.',
    link: '/truth-or-dare/setup',
    tags: ['Party', 'Social', 'Icebreaker'],
    disabled: false,
  },
  {
    id: 'charades-challenge',
    name: 'Charades 🎭',
    description: 'Act it out! A classic party game for hilarious moments.',
    link: '/charades/setup',
    tags: ['Party', 'Acting', 'Multiplayer'],
    disabled: false,
  },
  {
    id: 'get-to-know',
    name: 'Get to Know 👋',
    description: 'Answer personal questions and learn more about your friends, family, or partner!',
    link: '/get-to-know/setup',
    tags: ['Social', 'Icebreaker', 'Personal'],
    disabled: false,
  },
  {
    id: 'picture-puzzle',
    name: 'Picture Puzzle 🖼️',
    description: 'Guess the word or phrase based on the pictures shown.',
    link: '#',
    tags: ['Puzzle', 'Word Game', 'Visual'],
    disabled: true,
  },
  {
    id: 'drawing-duel',
    name: 'Drawing Duel ✏️',
    description: 'Can your friends guess what you\'re drawing before time runs out?',
    link: '#',
    tags: ['Drawing', 'Party', 'Creative'],
    disabled: true,
  },
  {
    id: 'never-have-i-ever',
    name: 'Never Have I Ever 🤫',
    description: 'Discover secrets and funny stories with this classic icebreaker.',
    link: '#',
    tags: ['Party', 'Icebreaker', 'Social'],
    disabled: true,
  },
];

function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {games.map((game) => (
          <div
            key={game.id}
            className={`bg-gray-800 rounded-lg shadow-xl flex flex-col overflow-hidden transition-transform duration-300 ease-in-out ${game.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
          >
            {/* Typographical "Logo" / Header Area */}
            <div className="bg-gray-700 p-8 text-center">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {game.name}
              </h2>
            </div>

            {/* Content Area */}
            <div className="p-6 flex flex-col flex-grow">
              <div className="mb-4 space-x-2 flex-wrap">
                {game.tags.map(tag => (
                    <span key={tag} className="inline-block bg-gray-600 text-gray-300 text-xs font-medium px-2.5 py-0.5 rounded mb-1">
                        {tag}
                    </span>
                ))}
              </div>
              <p className="text-textSecondary mb-6 flex-grow">{game.description}</p>
              
              {/* Action Button */}
              {game.disabled ? (
                 <button
                    className="w-full mt-auto bg-gray-600 text-gray-400 font-bold py-3 px-4 rounded-md cursor-not-allowed text-base sm:text-lg"
                    disabled
                 >
                    Coming Soon
                 </button>
              ) : (
                <Link
                    to={game.link}
                    className={`block w-full mt-auto text-center font-bold py-3 px-4 rounded-md transition duration-200 text-white text-base sm:text-lg ${
                      game.id === 'truth-or-dare'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-primary hover:bg-primary-dark' // Assuming 'primary' colors are defined in Tailwind config
                    }`}
                >
                    Play Now
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HomePage;