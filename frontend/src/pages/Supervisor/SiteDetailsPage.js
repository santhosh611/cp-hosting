// construction new/frontend/src/pages/Supervisor/SiteDetailsPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../../api/axios';
import { toast } from 'react-toastify';
import {
   FaMapMarkerAlt,
  FaClipboardList, FaBoxOpen, FaUserCheck, FaMoneyBillAlt, FaChartBar, FaArrowLeft
} from 'react-icons/fa';

// Import all supervisor-specific components for the tabs
import AttendanceSection from '../../components/supervisor/AttendanceSection';
import MaterialLogSection from '../../components/supervisor/MaterialLogSection';
import ActivityLogSection from '../../components/supervisor/ActivityLogSection';
import AdvanceManagementSection from '../../components/supervisor/AdvanceManagementSection';
import ReportGeneratorSection from '../../components/supervisor/ReportGeneratorSection';
// Import the NEW Rent Management component for supervisors
import ProjectRentTab from '../../components/supervisor/ProjectRentTab';
import Spinner from '../../components/common/Spinner'; // Importing custom Spinner component


const SiteDetailsPage = () => {
  const { siteId } = useParams();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attendance'); // Default to attendance tab

  useEffect(() => {
    const fetchSiteDetails = async () => {
      try {
        const res = await API.get(`/projects/${siteId}`);
        setSite(res.data);
      } catch (error) {
        toast.error('Failed to load site details.');
        console.error('Error fetching site details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSiteDetails();
  }, [siteId]);
  if (loading) {
    // Replaced "Loading projects..." text with the Spinner component
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)]"> 
        <Spinner size="lg" type="logo" color="#2F3C7E" /> {/* Using your custom Spinner with 'logo' type */}
        <span className="ml-3 mt-4 text-lg text-gray-700">Loading site details...</span>
      </div>
    );
  }

  if (!site) {
    return <div className="text-center p-2 sm:p-4 text-red-500">Site not found.</div>;
  }

  const tabs = [
    { name: 'Attendance', icon: FaUserCheck },
    { name: 'Materials', icon: FaBoxOpen },
    { name: 'Daily Activities', icon: FaClipboardList },
    { name: 'Advances', icon: FaMoneyBillAlt },
    { name: 'Reports', icon: FaChartBar },
    { name: 'Rent', icon: FaMoneyBillAlt } // ADDED: New Rent tab
  ];

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6">
        <div className="flex-1">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">{site.name} Site Details & Operations</h2>
          <p className="text-gray-600 flex items-center mt-1">
            <FaMapMarkerAlt className="mr-2" /> {site.location}
          </p>
        </div>
        <Link to="/supervisor/my-sites" className="flex items-center px-3 sm:px-4 py-1 sm:py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
          <FaArrowLeft className="mr-2" /> Back to My Sites
        </Link>
      </div>

      {/* Tabs for different sections */}
      <div className="flex flex-wrap sm:flex-nowrap border-b border-gray-200 mb-4 sm:mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name.toLowerCase().replace(' ', '-'))}
            className={`px-2 sm:px-4 py-1 sm:py-2 text-sm font-medium border-b-2 transition-all duration-150 ${
              activeTab === tab.name.toLowerCase().replace(' ', '-')
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Content based on active tab */}
      {activeTab === 'attendance' && <AttendanceSection siteId={siteId} />}
      {activeTab === 'materials' && <MaterialLogSection siteId={siteId} />}
      {activeTab === 'daily-activities' && <ActivityLogSection siteId={siteId} />}
      {activeTab === 'advances' && <AdvanceManagementSection siteId={siteId} />}
      {activeTab === 'reports' && <ReportGeneratorSection siteId={siteId} />}
      {activeTab === 'rent' && <ProjectRentTab siteId={siteId} />}
    </div>
  );
};

export default SiteDetailsPage;