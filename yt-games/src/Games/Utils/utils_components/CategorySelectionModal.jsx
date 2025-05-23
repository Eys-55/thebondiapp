import React, { useState, useEffect } from 'react';
import Modal from './Modal';

function CategorySelectionModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Select Categories",
  allCategories = [],
  initiallySelectedCategories = [],
  categoryKey = 'id',
  categoryNameKey = 'name',
  allowMultiple = true,
}) {
  const [currentSelections, setCurrentSelections] = useState([]);

  useEffect(() => {
    if (isOpen) {
      // Ensure initiallySelectedCategories is always an array, even if a single string is passed for single selection mode.
      const initial = Array.isArray(initiallySelectedCategories)
        ? [...initiallySelectedCategories]
        : (initiallySelectedCategories ? [initiallySelectedCategories] : []);
      setCurrentSelections(initial);
    }
  }, [isOpen, initiallySelectedCategories]);

  const handleSelectionChange = (categoryId) => {
    if (allowMultiple) {
      setCurrentSelections(prevSelections =>
        prevSelections.includes(categoryId)
          ? prevSelections.filter(id => id !== categoryId)
          : [...prevSelections, categoryId]
      );
    } else {
      setCurrentSelections([categoryId]);
    }
  };

  const handleConfirmClick = () => {
    if (allowMultiple) {
      onConfirm(currentSelections);
    } else {
      // For single selection, pass the single ID or an empty array if nothing selected
      onConfirm(currentSelections.length > 0 ? currentSelections[0] : null);
    }
    // The parent component is responsible for closing the modal by setting isOpen to false
  };

  const handleCancelClick = () => {
    onClose();
  };
  
  const inputType = allowMultiple ? 'checkbox' : 'radio';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose} // Modal's own onClose for overlay click etc.
      title={title}
      footerContent={
        <>
          <button
            onClick={handleCancelClick}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmClick}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-md transition-colors"
          >
            Confirm
          </button>
        </>
      }
    >
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {allCategories.length > 0 ? (
          allCategories.map(category => {
            const categoryId = category[categoryKey];
            const categoryName = category[categoryNameKey];
            const isChecked = currentSelections.includes(categoryId);

            return (
              <label
                key={categoryId}
                className={`flex items-center p-3 rounded-md cursor-pointer transition-colors border
                            ${isChecked ? 'bg-primary-light border-primary-dark ring-1 ring-primary-dark' : 'bg-gray-600 border-gray-500 hover:bg-gray-550'}`}
              >
                <input
                  type={inputType}
                  name={allowMultiple ? categoryId : "categorySelectionGroup"} // Unique name for checkbox, common for radio
                  value={categoryId}
                  checked={isChecked}
                  onChange={() => handleSelectionChange(categoryId)}
                  className={`form-${inputType} h-5 w-5 ${isChecked ? 'text-primary-dark' : 'text-primary-light'} bg-gray-500 border-gray-400 focus:ring-primary-dark`}
                />
                <span className={`ml-3 text-md ${isChecked ? 'text-gray-800 font-semibold' : 'text-gray-100'}`}>{categoryName}</span>
              </label>
            );
          })
        ) : (
          <p className="text-gray-400">No categories available.</p>
        )}
      </div>
    </Modal>
  );
}

export default CategorySelectionModal;