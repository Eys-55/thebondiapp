import React from 'react';

function StyledNumberInput({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  disabled,
  error,
  inputClassName = "",
  labelClassName = "mb-1 text-sm font-medium text-gray-300",
  containerClassName = "flex flex-col items-start"
}) {
  const baseInputClass = "w-full px-3 py-2 bg-gray-600 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50";
  return (
    <div className={containerClassName}>
      <label htmlFor={id} className={labelClassName}>{label}</label>
      <input
        type="number"
        id={id}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={`${baseInputClass} ${error ? 'border-danger' : 'border-gray-500'} ${inputClassName}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && <p id={`${id}-error`} className="mt-1 text-xs text-danger-light">{error}</p>}
    </div>
  );
}

export default StyledNumberInput;