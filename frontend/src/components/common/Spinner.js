// frontend/src/components/common/Spinner.js
import React from 'react';

const Spinner = ({ size = 'md', color = '#6398c9', type = 'border' }) => {
  if (type === 'border') {
    let spinnerClasses = `animate-spin inline-block rounded-full`;
    let spinnerStyle = {
      borderColor: color,
      borderRightColor: 'transparent',
      borderTopColor: 'transparent',
    };

    if (size === 'sm') {
      spinnerClasses += ' w-4 h-4 border-2';
    } else if (size === 'md') {
      spinnerClasses += ' w-8 h-8 border-4';
    } else if (size === 'lg') {
      spinnerClasses += ' w-12 h-12 border-4';
    } else if (size === 'xl') {
      spinnerClasses += ' w-16 h-16 border-8';
    }

    return (
      <div className={spinnerClasses} style={spinnerStyle} role="status">
        <span className="sr-only">Loading...</span>
      </div>
    );
  } else if (type === 'dot') {
    let dotClasses = `inline-block rounded-full animate-pulse`;
    let dotStyle = {
      backgroundColor: color,
    };

    if (size === 'sm') {
      dotClasses += ' w-3 h-3';
    } else if (size === 'md') {
      dotClasses += ' w-4 h-4';
    } else if (size === 'lg') {
      dotClasses += ' w-6 h-6';
    } else if (size === 'xl') {
      dotClasses += ' w-8 h-8';
    }
    
    return (
      <div className={dotClasses} style={dotStyle} role="status">
        <span className="sr-only">Loading...</span>
      </div>
    );
  } else if (type === 'building') {
    let buildingWrapperClasses = `inline-block animate-spin relative`;
    
    if (size === 'sm') {
      buildingWrapperClasses += ' w-6 h-6';
    } else if (size === 'md') {
      buildingWrapperClasses += ' w-12 h-12';
    } else if (size === 'lg') {
      buildingWrapperClasses += ' w-16 h-16';
    } else if (size === 'xl') {
      buildingWrapperClasses += ' w-24 h-24';
    }

    return (
      <div className={buildingWrapperClasses} role="status">
        <div 
          style={{ 
            position: 'absolute', 
            width: '50%', 
            height: '50%', 
            backgroundColor: color, 
            top: '50%', 
            left: '50%',
            transform: 'translate(-50%, -50%)' 
          }} 
          className="animate-pulse rounded-md"
        ></div>
        <div 
          style={{ 
            position: 'absolute', 
            width: '20px', 
            height: '20px', 
            backgroundColor: color, 
            borderRadius: '50%',
            top: '50%', 
            left: '50%',
            transform: 'translate(-50%, -50%)' 
          }}
        ></div>
        <span className="sr-only">Building...</span>
      </div>
    );
  } else if (type === 'logo') { // 'logo' type: spinner loads AROUND the logo
    let logoSizeClasses = '';
    let outerSpinnerSizeClasses = ''; 
    let spinnerBorderWidth = 'border-4'; 

    // Adjust sizes for both logo and outer spinner based on the 'size' prop
    if (size === 'sm') {
      logoSizeClasses = 'w-6 h-6'; // Reduced logo size
      outerSpinnerSizeClasses = 'w-12 h-12'; 
      spinnerBorderWidth = 'border-2';
    } else if (size === 'md') {
      logoSizeClasses = 'w-10 h-10'; // Reduced logo size
      outerSpinnerSizeClasses = 'w-16 h-16';
      spinnerBorderWidth = 'border-3';
    } else if (size === 'lg') {
      logoSizeClasses = 'w-14 h-14'; // Reduced logo size
      outerSpinnerSizeClasses = 'w-20 h-20';
      spinnerBorderWidth = 'border-4';
    } else if (size === 'xl') {
      logoSizeClasses = 'w-20 h-20'; // Reduced logo size
      outerSpinnerSizeClasses = 'w-28 h-28';
      spinnerBorderWidth = 'border-4';
    }

    return (
      // Parent container to hold both logo and the surrounding spinner
      <div className={`relative flex items-center justify-center ${outerSpinnerSizeClasses}`} role="status">
        {/* Spinning Border Loader (positioned absolutely and larger) */}
        <div
          className={`absolute animate-spin rounded-full ${outerSpinnerSizeClasses} ${spinnerBorderWidth}`}
          style={{
            borderColor: color, 
            borderRightColor: 'transparent',
            borderTopColor: 'transparent',
          }}
        ></div>
        {/* Static Logo Image (positioned absolutely in the center, on top of the spinner) */}
        <img
          src="/CP logo.png" // Path to your logo image
          alt="Loading..."
          className={`absolute object-cover rounded-full ${logoSizeClasses}`} // Logo itself uses reduced size classes
          style={{
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)', 
          }}
        />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  return null;
};

export default Spinner;

