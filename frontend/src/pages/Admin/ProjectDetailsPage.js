// construction/frontend/src/pages/Admin/ProjectDetailsPage.js
import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../../api/axios';
import { toast } from 'react-toastify';
import { FaClipboardCheck, FaBoxOpen, FaClipboardList, FaMoneyBillAlt, FaFilePdf, FaArrowLeft, FaDolly } from 'react-icons/fa'; // Added FaDolly
import AttendanceSection from '../../components/admin/AttendanceSection';
import MaterialLogSection from '../../components/admin/MaterialLogSection';
import ActivityLogSection from '../../components/admin/ActivityLogSection';
import AdvanceManagementSection from '../../components/admin/AdvanceManagementSection';
import ReportGeneratorSection from '../../components/admin/ReportGeneratorSection';
import ProjectRentTab from '../../components/admin/ProjectRentTab'; 
import Spinner from '../../components/common/Spinner'; // Importing custom Spinner component
import { AuthContext } from '../../context/AuthContext';
import { useDemoData } from '../../context/DemoDataContext';

const ProjectDetailsPage = () => {
  const { user } = useContext(AuthContext);
  const demoData = useDemoData();
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('attendance');

  useEffect(() => {
    // DEMO MODE
    if (user?.isDemo) {
      const demoProj = demoData.projects.find(p => p._id === projectId) || demoData.projects[0];
      setProject(demoProj);
      setLoading(false);
      return;
    }
    const fetchProjectDetails = async () => {
      try {
        const res = await API.get(`/projects/${projectId}`);
        setProject(res.data);
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to fetch project details.';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };
    if (projectId) {
      fetchProjectDetails();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user]);

  if (loading) {
    // Replaced "Loading projects..." text with the Spinner component
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)]"> 
        <Spinner size="lg" type="logo" color="#2F3C7E" /> {/* Using your custom Spinner with 'logo' type */}
        <span className="ml-3 mt-4 text-lg text-gray-700">Loading projects details...</span>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">Error: {error}</div>;
  }

  if (!project) {
    return <div className="p-4 text-center text-gray-600">Project not found.</div>;
  }

  const tabs = [
    { id: 'attendance', label: 'Attendance', icon: <FaClipboardCheck className="mr-2" /> },
    { id: 'materials', label: 'Materials', icon: <FaBoxOpen className="mr-2" /> },
    { id: 'activities', label: 'Daily Activities', icon: <FaClipboardList className="mr-2" /> },
    { id: 'advances', label: 'Advances', icon: <FaMoneyBillAlt className="mr-2" /> },
    { id: 'rent', label: 'Rent', icon: <FaDolly className="mr-2" /> },
    { id: 'reports', label: 'Reports', icon: <FaFilePdf className="mr-2" /> },
  ];

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
      {/* MODIFIED: Adjusted layout for better mobile alignment */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
        <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
            <span className="text-indigo-600">{project.name}</span> Project Details
            </h2>
            <p className="text-base text-gray-600">
                {project.location}
            </p>
        </div>
        <Link to="/admin/projects" className="flex-shrink-0 flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
          <FaArrowLeft className="mr-2" /> Back to Projects
        </Link>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex-shrink-0 flex items-center transition-colors duration-200`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === 'attendance' && <AttendanceSection siteId={projectId} />}
        {activeTab === 'materials' && <MaterialLogSection siteId={projectId} />}
        {activeTab === 'activities' && <ActivityLogSection siteId={projectId} />}
        {activeTab === 'advances' && <AdvanceManagementSection siteId={projectId} />}
        {activeTab === 'rent' && <ProjectRentTab siteId={projectId} />}
        {activeTab === 'reports' && <ReportGeneratorSection siteId={projectId} />}
      </div>
    </div>
  );
};

export default ProjectDetailsPage;