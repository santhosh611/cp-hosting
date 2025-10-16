import React from 'react';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  let modalSizeClass = 'max-w-md';
  if (size === 'sm') modalSizeClass = 'max-w-sm';
  if (size === 'lg') modalSizeClass = 'max-w-lg';
  if (size === 'xl') modalSizeClass = 'max-w-xl';
  if (size === '2xl') modalSizeClass = 'max-w-2xl';

  return (
    <div
      className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-lg shadow-xl relative ${modalSizeClass} w-full max-h-[90vh] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          {/* MODIFIED: Adjusted text size for smaller screens */}
          <h2 className="text-lg md:text-xl font-bold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none font-semibold"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        {/* MODIFIED: Adjusted padding for smaller screens */}
        <div className="p-4 md:p-6 flex-grow overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;