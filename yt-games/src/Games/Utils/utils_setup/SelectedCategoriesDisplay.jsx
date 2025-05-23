import React from 'react';

function SelectedCategoriesDisplay({
  label,
  selectedCategories = [], // Array of IDs
  allCategoriesData = [], // Array of category objects { id: '...', name: '...' }
  onManageCategoriesClick,
  categoryValueKey = 'id',
  categoryNameKey = 'name',
  placeholderText = "No categories selected.",
  buttonText = "Manage Categories",
  error,
  disabled = false,
  isLoading = false,
  containerClass = "p-3 bg-gray-650 rounded-md border border-gray-600",
  labelClass = "block text-md font-medium text-gray-200 mb-2",
  tagsContainerClass = "flex flex-wrap gap-2 mb-3",
  tagClass = "px-2.5 py-1 bg-primary-dark text-white text-sm rounded-full",
  placeholderClass = "text-gray-400 italic mb-3",
  buttonClass = "w-full sm:w-auto px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
  errorClass = "mt-1 text-xs text-danger-light text-left",
}) {
  const getCategoryName = (categoryId) => {
    const foundCategory = allCategoriesData.find(cat => cat[categoryValueKey] === categoryId);
    return foundCategory ? foundCategory[categoryNameKey] : categoryId; // Fallback to ID if name not found
  };

  // Ensure selectedCategories is always an array for mapping
  const currentSelectedIds = Array.isArray(selectedCategories) ? selectedCategories : (selectedCategories ? [selectedCategories] : []);

  return (
    <div className={`${containerClass} ${error ? 'border-danger' : 'border-transparent'}`}>
      {label && <label className={labelClass}>{label}</label>}
      <div className={tagsContainerClass}>
        {currentSelectedIds.length > 0 ? (
          currentSelectedIds.map(id => (
            <span key={id} className={tagClass}>
              {getCategoryName(id)}
            </span>
          ))
        ) : (
          <p className={placeholderClass}>{placeholderText}</p>
        )}
      </div>
      <button
        onClick={onManageCategoriesClick}
        disabled={disabled || isLoading}
        className={`${buttonClass} ${isLoading ? 'animate-pulse' : ''}`}
      >
        {isLoading ? 'Loading...' : buttonText}
      </button>
      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
}

export default SelectedCategoriesDisplay;