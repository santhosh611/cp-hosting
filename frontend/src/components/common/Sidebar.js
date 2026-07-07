// frontend/src/components/common/Sidebar.js
import React, { useContext, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import {
  FaTachometerAlt, FaProjectDiagram, FaClipboardList,
  FaMoneyBillAlt, FaBoxOpen, FaTasks, FaFileInvoiceDollar, FaCog, FaSignOutAlt,
  FaHardHat, FaBuilding, FaUserCheck, FaChevronLeft,  FaTools, FaDolly, FaBars, FaWallet,
} from 'react-icons/fa';

const Sidebar = ({ role }) => {
  const { logout } = useContext(AuthContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // --- Style block for the logo animation and modal animations ---
  const animationStyle = `
    /* MODIFIED: New animation for the flip and rotate effect */
    @keyframes flip-and-rotate {
      0% {
        transform: perspective(400px) rotateY(0) rotateZ(0);
      }
      100% {
        transform: perspective(400px) rotateY(360deg) rotateZ(360deg);
      }
    }
    .animate-flip-and-rotate {
      animation: flip-and-rotate 1.5s ease-in-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes zoomIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    @keyframes bounce-subtle {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.2s ease-out forwards;
    }
    .animate-zoomIn {
      animation: zoomIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    .animate-bounce-subtle {
      animation: bounce-subtle 2s infinite ease-in-out;
    }
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `;

  const navItems = {
    admin: [
      { name: 'Dashboard', path: '/admin/dashboard', icon: FaTachometerAlt },
      { name: 'Manage Projects', path: '/admin/projects', icon: FaProjectDiagram },
      { name: 'Manage Workers', path: '/admin/workers', icon: FaHardHat },
      { name: 'Manage Roles & Salaries', path: '/admin/roles-salaries', icon: FaMoneyBillAlt },
      { name: 'Attendance Overview', path: '/admin/attendance-overview', icon: FaClipboardList },
      { name: 'Salary & Advance Logs', path: '/admin/salary-advance-logs', icon: FaFileInvoiceDollar },
      { name: 'Raw Material Logs', path: '/admin/raw-material-logs', icon: FaBoxOpen },
      { name: 'Daily Activity Logs', path: '/admin/daily-activity-logs', icon: FaTasks },
      { name: 'Rent Management', path: '/admin/rent', icon: FaDolly },
      {name: 'Client Fund', path: '/admin/wallet',icon: FaWallet,},
      { name: 'Report Generator', path: '/admin/report-generator', icon: FaClipboardList },
      { name: 'Admin Settings', path: '/admin/settings', icon: FaCog },
    ],
    supervisor: [
        { name: 'My Dashboard', path: '/supervisor/dashboard', icon: FaTachometerAlt },
        { name: 'My Sites', path: '/supervisor/my-sites', icon: FaBuilding },
        { name: 'Mark Attendance', path: '/supervisor/mark-attendance', icon: FaUserCheck },
        { name: 'Log Raw Materials', path: '/supervisor/log-raw-materials', icon: FaBoxOpen },
        { name: 'Log Daily Activities', path: '/supervisor/log-daily-activities', icon: FaTasks },
        { name: 'Manage Advances', path: '/supervisor/manage-advances', icon: FaMoneyBillAlt },
        { name: 'Rent Management', path: '/supervisor/rent', icon: FaTools },
    ],
  };

  const currentNavItems = navItems[role] || [];

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLinkClick = () => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleLogoutClick = () => {
    handleLinkClick();
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  return (
    <>
      <style>{animationStyle}</style>

      <button
        onClick={toggleSidebar}
        className="md:hidden p-2 text-white bg-[#6398c9] fixed top-4 left-4 z-50 rounded-md"
        aria-label="Toggle Sidebar"
      >
        {isSidebarOpen ? <FaChevronLeft /> : <FaBars />}
      </button>

      {isSidebarOpen && window.innerWidth < 768 && (
        <div
          className="fixed inset-0 bg-opacity-50 z-40 backdrop-blur-sm"
          onClick={toggleSidebar}
        ></div>
      )}

      <div
        className={`
          fixed inset-y-0 left-0 flex flex-col bg-[#2F3C7E] text-white
          transition-transform duration-300 transform shadow-lg z-50
          ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
          md:relative md:translate-x-0 md:w-64 md:h-full
        `}
      >
        <div
          className="p-4 flex items-center justify-between border-b border-[#44508E]"
          onMouseEnter={() => setIsLogoHovered(true)}
          onMouseLeave={() => setIsLogoHovered(false)}
        >
          {isSidebarOpen ? (
            <div className="flex items-center cursor-pointer min-w-0">
              <img
                src="/CP logo.png"
                alt="CP Architect Logo"
                className={`w-12 h-12 rounded-full mr-3 object-cover flex-shrink-0 ${isLogoHovered ? 'animate-flip-and-rotate' : ''}`}
                title="CP Architect"
              />
              <h1 className="text-lg font-bold text-white tracking-wider truncate whitespace-nowrap flex-1">
                {isLogoHovered ? "Welcome Back" : "CP ARCHITECT"}
              </h1>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full cursor-pointer">
                <img
                    src="/CP logo.png"
                    alt="CP Architect Logo"
                    className="w-12 h-12 rounded-full object-cover"
                    title="CP Architect"
                />
            </div>
          )}
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto no-scrollbar">
          {currentNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center p-3 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#6398c9] text-white border-l-4 border-white'
                    : 'hover:bg-[#5282B0] hover:text-white'
                } ${isSidebarOpen ? '' : 'justify-center'}`
              }
              title={item.name}
            >
              <item.icon className={`text-xl ${isSidebarOpen ? 'mr-3' : ''}`} />
              {isSidebarOpen && <span>{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[#44508E]">
          <button
            onClick={handleLogoutClick}
            className={`flex items-center p-3 rounded-md text-sm font-medium w-full text-left bg-red-600 hover:bg-red-700 transition-colors ${isSidebarOpen ? '' : 'justify-center'}`}
            title="Logout"
          >
            <FaSignOutAlt className={`text-xl ${isSidebarOpen ? 'mr-3' : ''}`} />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center animate-fadeIn"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <div 
            className="bg-white text-gray-800 rounded-2xl p-8 max-w-sm w-full mx-4 transform animate-zoomIn"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #f1f5f9',
            }}
          >
            <div className="flex flex-col items-center text-center">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-bounce-subtle"
                style={{
                  backgroundColor: '#fff1f2',
                }}
              >
                <FaSignOutAlt className="text-2xl" style={{ color: '#e11d48' }} />
              </div>

              <h3 className="text-xl font-bold mb-2" style={{ color: '#0f172a' }}>
                Are you sure?
              </h3>

              <p className="text-sm mb-6 leading-relaxed" style={{ color: '#64748b' }}>
                You are about to log out. Any unsaved progress in active forms may be lost.
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer hover:bg-gray-100 border text-gray-700"
                  style={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    color: '#334155',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmLogout}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 cursor-pointer hover:opacity-90"
                  style={{
                    background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                    color: '#ffffff',
                    boxShadow: '0 4px 12px rgba(225, 29, 72, 0.25)',
                    border: 'none',
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
