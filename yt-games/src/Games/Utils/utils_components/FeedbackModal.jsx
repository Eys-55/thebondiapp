import React, { useState } from 'react';
import Modal from './Modal';
import { db } from '../../../firebase'; // Adjust path as needed
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';

// Define games list directly in the component or import from a shared location
const gamesList = [
  { id: 'general_other', name: 'General / Other' },
  { id: 'trivia-nights', name: 'Trivia Nights' },
  { id: 'truth-or-dare', name: 'Truth or Dare' },
  { id: 'charades-challenge', name: 'Charades' },
  { id: 'get-to-know', name: 'Get to Know' },
  { id: 'everyone-whos', name: "Everyone Who's" },
  // Add other games here as they become available
  // { id: 'picture-puzzle', name: 'Picture Puzzle' },
  // { id: 'drawing-duel', name: 'Drawing Duel' },
  // { id: 'never-have-i-ever', name: 'Never Have I Ever' },
];

function FeedbackModal({ isOpen, onClose, currentPage }) {
  const [feedbackType, setFeedbackType] = useState('general');
  const [selectedGame, setSelectedGame] = useState('general_other'); // New state for selected game
  const [feedbackText, setFeedbackText] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const feedbackTypes = [
    { value: 'general', label: 'General Comment' },
    { value: 'bug', label: 'Bug Report' },
    { value: 'suggestion', label: 'Suggestion' },
    { value: 'praise', label: 'Praise' },
  ];

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      toast.error("Please provide your feedback text.");
      return;
    }
    if (feedbackText.trim().length < 10) {
        toast.warn("Please provide a bit more detail in your feedback (min 10 characters).");
        return;
    }
    if (feedbackText.trim().length > 1000) {
        toast.warn("Feedback is too long (max 1000 characters). Please summarize.");
        return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        type: feedbackType,
        game: selectedGame, // Add selected game to Firestore document
        text: feedbackText.trim(),
        email: email.trim() || null,
        page: currentPage,
        submittedAt: serverTimestamp(),
        status: 'new', // Default status
        userAgent: navigator.userAgent,
      });
      toast.success("Feedback submitted successfully! Thank you.");
      setFeedbackText('');
      setEmail('');
      setFeedbackType('general');
      setSelectedGame('general_other'); // Reset selected game
      onClose();
    } catch (error) {
      console.error("Error submitting feedback: ", error);
      toast.error("Failed to submit feedback. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Feedback"
      titleColor="text-blue-400"
            footerContent={
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
            <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors w-full sm:w-auto"
            disabled={isSubmitting}
            >
            Cancel
            </button>
            <button
            type="submit" // Ensures form submission can be triggered by this button
            onClick={handleFormSubmit}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors disabled:opacity-50 w-full sm:w-auto"
            disabled={isSubmitting || !feedbackText.trim() || feedbackText.trim().length < 10 || feedbackText.trim().length > 1000}
            >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
            </div>
            }
            >
            <form onSubmit={handleFormSubmit} className="space-y-4">
        <div>
          <label htmlFor="feedbackType" className="block text-sm font-medium text-gray-300 mb-1">
            Feedback Type:
          </label>
          <select
            id="feedbackType"
            name="feedbackType"
            value={feedbackType}
            onChange={(e) => setFeedbackType(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
            disabled={isSubmitting}
          >
            {feedbackTypes.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="selectedGame" className="block text-sm font-medium text-gray-300 mb-1">
            Related Game (if applicable):
          </label>
          <select
            id="selectedGame"
            name="selectedGame"
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
            disabled={isSubmitting}
          >
            {gamesList.map(game => (
              <option key={game.id} value={game.id}>
                {game.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="feedbackText" className="block text-sm font-medium text-gray-300 mb-1">
            Your Feedback (required, 10-1000 chars):
          </label>
          <textarea
            id="feedbackText"
            name="feedbackText"
            rows="4"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
            placeholder="Tell us what you think..."
            required
            minLength="10"
            maxLength="1000"
            disabled={isSubmitting}
          />
           <p className="text-xs text-gray-400 mt-1 text-right">{feedbackText.length}/1000</p>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
            Your Email (optional, if you'd like a response):
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
            placeholder="you@example.com"
            disabled={isSubmitting}
          />
        </div>
        {/* Hidden submit button to allow form submission via footer button if Enter key is pressed in a field */}
        <button type="submit" style={{ display: 'none' }} disabled={isSubmitting} />
      </form>
    </Modal>
  );
}

export default FeedbackModal;