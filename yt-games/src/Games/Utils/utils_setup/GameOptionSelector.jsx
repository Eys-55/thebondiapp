import React from 'react';

function GameOptionSelector({
  options,
  selectedOption,
  onOptionChange,
  type,
  groupName,
  label,
  isLoading,
  layoutClass = "flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0",
  itemLayoutClass = "flex items-center space-x-2 px-3 py-1.5 rounded-md cursor-pointer transition duration-200 border",
  baseItemClass = "bg-gray-600 hover:bg-gray-500 text-textPrimary border-gray-600 hover:border-gray-500",
  selectedItemClass = "bg-primary-dark text-white border-primary-light ring-1 ring-primary-light",
  error,
  containerClass = "p-3 bg-gray-650 rounded-md border border-gray-600",
  labelClass = "block text-md font-medium text-gray-200 mb-2",
  inputClass = "form-radio h-4 w-4 text-primary focus:ring-primary-light disabled:opacity-50 sr-only"
}) {
  return (
    <div className={`${containerClass} ${error ? 'border-danger' : 'border-transparent'}`}>
      {label && <label className={labelClass}>{label}</label>}
      <div className={layoutClass}>
        {options.map(option => {
          const isSelected = type === 'radio'
            ? selectedOption === option.value
            : Array.isArray(selectedOption) && selectedOption.includes(option.value);

          return (
            <label
              key={option.id}
              className={`${itemLayoutClass} ${isSelected ? selectedItemClass : baseItemClass} ${isLoading || option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type={type}
                name={groupName}
                value={option.value}
                checked={isSelected}
                onChange={(e) => onOptionChange(option.value, type === 'checkbox' ? e.target.checked : undefined)}
                disabled={isLoading || option.disabled}
                className={inputClass}
              />
              <span>{option.name}</span>
            </label>
          );
        })}
      </div>
      {error && <p className="mt-1 text-xs text-danger-light text-left">{error}</p>}
    </div>
  );
}

export default GameOptionSelector;