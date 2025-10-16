// frontend/src/components/common/Navbar.js
import React, {
  useContext
} from 'react';
import {
  AuthContext
} from '../../context/AuthContext'; //

const Navbar = () => {
  const {
    user
  } = useContext(AuthContext);

  return ( 
    <nav className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-10 md:pl-4 pl-16">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">CP ARCHITECT & INTERIORS</h1> 
      </div> 
      {/* Display role-specific name/title */}
      <span className="text-gray-800 font-medium"> 
        {user ? (
          user.role === 'admin' ? 'Admin' : // Shows 'Admin' for admin role
          user.role === 'supervisor' ? `${user.name} (Supervisor)` : // Shows 'Name (Supervisor)' for supervisor role
          user.name // Defaults to just the name for any other roles
        ) : 'Guest'}
      </span> 
    </nav>
  );
};

export default Navbar;