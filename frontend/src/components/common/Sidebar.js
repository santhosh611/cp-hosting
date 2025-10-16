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

  // --- Style block for the logo animation ---
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
            <div className="flex items-center cursor-pointer">
              <img
                src="/CP logo.png"
                alt="CP Architect Logo"
                className={`w-12 h-12 rounded-full mr-3 object-cover ${isLogoHovered ? 'animate-flip-and-rotate' : ''}`}
                title="CP Architect"
              />
              <h1 className="text-2xl font-extrabold text-white">
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

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
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
    </>
  );
};

export default Sidebar;
