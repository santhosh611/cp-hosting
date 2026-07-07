// frontend/src/components/common/Navbar.js
import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const Navbar = () => {
  const { user } = useContext(AuthContext);

  return ( 
    <nav className="bg-white shadow-md h-16 px-4 flex justify-between items-center sticky top-0 z-10 md:pl-6 pl-16">
      <div className="flex items-center min-w-0">
        <h1 className="text-base md:text-2xl font-bold text-gray-800 truncate">
          <span className="hidden md:inline">CP ARCHITECT &amp; INTERIORS</span>
          <span className="inline md:hidden">CP Architect</span>
        </h1> 
      </div> 

      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        {/* Demo Mode Badge */}
        {user?.isDemo && (
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 md:px-3.5 md:py-1.5 rounded-full text-[10px] md:text-xs font-semibold tracking-wider transition-all duration-300 whitespace-nowrap"
            style={{
              background: 'rgba(217, 119, 6, 0.08)',
              color: '#b45309',
              border: '1px solid rgba(217, 119, 6, 0.25)',
              boxShadow: '0 1px 3px rgba(217, 119, 6, 0.05)',
            }}
          >
            <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75 animate-ping"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-amber-600"></span>
            </span>
            <span className="hidden sm:inline">DEMO MODE &bull; READ ONLY</span>
            <span className="inline sm:hidden">DEMO</span>
          </div>
        )}

        {/* Display role-specific name/title */}
        <span 
          className="text-gray-800 font-medium text-xs md:text-base whitespace-nowrap truncate max-w-[80px] sm:max-w-[120px] md:max-w-none" 
          title={user ? (user.role === 'supervisor' ? `${user.name} (Supervisor)` : user.name) : 'Guest'}
        > 
          {user ? (
            user.isDemo ? 'Demo User' :
            user.role === 'admin' ? 'Admin' :
            user.role === 'supervisor' ? (
              <>
                <span className="hidden sm:inline">{user.name} (Supervisor)</span>
                <span className="inline sm:hidden">{user.name}</span>
              </>
            ) :
            user.name
          ) : 'Guest'}
        </span> 
      </div>
    </nav>
  );
};

export default Navbar;