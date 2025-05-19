import React from 'react';

// Props:
// isOpen: boolean - Controls whether the modal is visible
// onClose: function - Called when the modal requests to be closed (e.g., overlay click, close button)
// title?: string - Optional title for the modal
// children: ReactNode - Content to be displayed within the modal body
// footerContent?: ReactNode - Optional content for the modal footer (e.g., action buttons)
// titleColor?: string - Tailwind CSS class for title color (e.g., 'text-yellow-400')

function Modal({ isOpen, onClose, title, children, footerContent, titleColor = 'text-white' }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose} // Optional: close modal on overlay click
        >
        <div
        className="bg-gray-700 p-6 rounded-lg shadow-xl max-w-md w-full" // Changed bg-gray-800 to bg-gray-700
        onClick={(e) => e.stopPropagation()} // Prevent click inside modal from closing it
        >
        {title && (
          <h4 className={`text-2xl font-bold ${titleColor} mb-4`}>{title}</h4>
        )}
        <div className="text-gray-200 mb-6">
          {children}
        </div>
        {footerContent && (
          <div className="flex justify-end gap-4">
            {footerContent}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;