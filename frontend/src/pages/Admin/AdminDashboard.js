// construction/frontend/src/pages/Admin/AdminDashboard.js
import React, { useEffect, useState, useContext } from 'react';
import API from '../../api/axios';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import { useDemoData } from '../../context/DemoDataContext';
import {
  FaHardHat,
  FaProjectDiagram,
  FaUserTie,
  FaMoneyBillWave,
  FaChartLine,
  FaClipboardList,
  FaList,
  FaChartPie
} from 'react-icons/fa';
import Spinner from '../../components/common/Spinner';

import ProjectSummaryCards from '../../components/admin/ProjectSummaryCards';
import Drawer from '../../components/common/Drawer';
import BreakdownDrawerContent from '../../components/admin/BreakdownDrawerContent.js';

// MODIFIED: Added a new component for the counter animation
const AnimatedNumber = ({ end, duration = 1.5, isCurrency = false }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const endValue = Number(end) || 0;
    // Avoid division by zero
    const frameDuration = 1000 / 60; // 60fps
    const totalFrames = (duration * 1000) / frameDuration;
    const increment = endValue / totalFrames;

    if (endValue === 0) {
      setCount(0);
      return;
    }

    const counter = setInterval(() => {
      start += increment;
      if (start >= endValue) {
        setCount(endValue);
        clearInterval(counter);
      } else {
        setCount(start);
      }
    }, frameDuration);

    return () => clearInterval(counter);
  }, [end, duration]);

  const formatDisplay = () => {
    if (isCurrency) {
      return `₹${count.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return Math.ceil(count).toLocaleString();
  };

  return <span>{formatDisplay()}</span>;
};


const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const demoData = useDemoData();
  const [summary, setSummary] = useState(null);
  const [projectSummaries, setProjectSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showOverallSummary, setShowOverallSummary] = useState(true);

  const [isBreakdownDrawerOpen, setIsBreakdownDrawerOpen] = useState(false);
  const [breakdownType, setBreakdownType] = useState('');
  const [breakdownTitle, setBreakdownTitle] = useState('');


  useEffect(() => {
    // ── DEMO MODE: use mock data ────────────────────────────────────────────
    if (user?.isDemo) {
      setSummary(demoData.dashboardSummary);
      setProjectSummaries(demoData.projectSummaries);
      setLoading(false);
      return;
    }
    // ───────────────────────────────────────────────────────────────────────
    const fetchDashboardData = async () => {
      try {
        const summaryRes = await API.get('/admin/dashboard-summary');
        console.log('API Response:', summaryRes.data); // Debug log
        
        // Add fallback values for new fields
        const summaryData = {
          ...summaryRes.data,
          totalAdvance: summaryRes.data.totalAdvance || 0,
          totalRent: summaryRes.data.totalRent || 0
        };
        
        setSummary(summaryData);

        const projectSummariesRes = await API.get('/admin/project-summaries');
        
        const formattedProjectSummaries = projectSummariesRes.data.map(project => {
          if (project.startDate) {
            const date = new Date(project.startDate);
            if (!isNaN(date.getTime())) {
              const day = String(date.getDate()).padStart(2, '0');
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const year = date.getFullYear();
              return {
                ...project,
                startDate: `${day}/${month}/${year}`,
                totalAdvance: project.totalAdvance || 0,
                totalRent: project.totalRent || 0
              };
            }
          }
          return {
            ...project,
            startDate: 'N/A',
            totalAdvance: project.totalAdvance || 0,
            totalRent: project.totalRent || 0
          };
        });
        setProjectSummaries(formattedProjectSummaries);

      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to fetch dashboard data.';
        setError(msg);
        toast.error('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user, demoData]);
  
  const handleCardClick = (type, title) => {
    setBreakdownType(type);
    setBreakdownTitle(title);
    setIsBreakdownDrawerOpen(true);
  };

  const handleCloseBreakdownDrawer = () => {
    setIsBreakdownDrawerOpen(false);
    setBreakdownType('');
    setBreakdownTitle('');
  };


  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Admin Dashboard</h2>

      <div className="flex flex-col sm:flex-row justify-end mb-4 sm:mb-6 space-y-2 sm:space-y-0 sm:space-x-3">
        <button
          onClick={() => setShowOverallSummary(true)}
          className={`flex items-center justify-center px-3 sm:px-4 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base ${
            showOverallSummary
              ? 'bg-indigo-600 text-white shadow'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <FaChartPie className="mr-2" /> Overall Summary
        </button>
        <button
          onClick={() => setShowOverallSummary(false)}
          className={`flex items-center justify-center px-3 sm:px-4 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base ${
            !showOverallSummary
              ? 'bg-indigo-600 text-white shadow'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <FaList className="mr-2" /> Project-wise Summary
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] py-12"> 
          <Spinner size="lg" type="logo" color="#2F3C7E" />
          <span className="ml-3 mt-4 text-sm text-gray-500">Loading dashboard...</span>
        </div>
      ) : error ? (
        <div className="p-4 text-center text-red-600">Error: {error}</div>
      ) : showOverallSummary ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div
  className="bg-indigo-100 p-5 rounded-lg shadow-sm flex items-center justify-between cursor-pointer transform transition-all duration-300 hover:scale-105 hover:bg-indigo-200"
  onClick={() => handleCardClick('projects', 'Total Projects Breakdown')}
>
  <div>
    <p className="text-sm text-indigo-700">Total Projects</p>
    <h3 className="text-2xl md:text-3xl font-bold text-indigo-900"><AnimatedNumber end={summary.totalProjects} /></h3>
  </div>
  <FaProjectDiagram className="text-indigo-600 text-4xl md:text-5xl" />
</div>

<div
  className="bg-green-100 p-5 rounded-lg shadow-sm flex items-center justify-between cursor-pointer transform transition-all duration-300 hover:scale-105 hover:bg-green-200"
  onClick={() => handleCardClick('workers', 'Total Workers Breakdown')}
>
  <div>
    <p className="text-sm text-green-700">Total Workers</p>
    <h3 className="text-2xl md:text-3xl font-bold text-green-900"><AnimatedNumber end={summary.totalWorkers} /></h3>
  </div>
  <FaHardHat className="text-green-600 text-4xl md:text-5xl" />
</div>

<div
  className="bg-blue-100 p-5 rounded-lg shadow-sm flex items-center justify-between cursor-pointer transform transition-all duration-300 hover:scale-105 hover:bg-blue-200"
  onClick={() => handleCardClick('supervisors', 'Total Supervisors Breakdown')}
>
  <div>
    <p className="text-sm text-blue-700">Total Supervisors</p>
    <h3 className="text-2xl md:text-3xl font-bold text-blue-900"><AnimatedNumber end={summary.totalSupervisors} /></h3>
  </div>
  <FaUserTie className="text-blue-600 text-4xl md:text-5xl" />
</div>

<div
  className="bg-yellow-100 p-5 rounded-lg shadow-sm flex items-center justify-between cursor-pointer transform transition-all duration-300 hover:scale-105 hover:bg-yellow-200"
  onClick={() => handleCardClick('material_cost', 'Total Material Cost Breakdown')}
>
  <div>
    <p className="text-sm text-yellow-700">Total Material Cost</p>
    <h3 className="text-2xl md:text-3xl font-bold text-yellow-900">
      <AnimatedNumber end={summary.totalMaterialCost} isCurrency />
    </h3>
  </div>
  <FaMoneyBillWave className="text-yellow-600 text-4xl md:text-5xl" />
</div>

<div
  className="bg-purple-100 p-5 rounded-lg shadow-sm flex items-center justify-between cursor-pointer transform transition-all duration-300 hover:scale-105 hover:bg-purple-200"
  onClick={() => handleCardClick('salary_cost', 'Total Salary Cost Breakdown')}
>
  <div>
    <p className="text-sm text-purple-700">Total Salary Cost</p>
    <h3 className="text-2xl md:text-3xl font-bold text-purple-900">
      <AnimatedNumber end={summary.totalSalaryCost} isCurrency />
    </h3>
  </div>
  <FaMoneyBillWave className="text-purple-600 text-4xl md:text-5xl" />
</div>

<div
  className="bg-orange-100 p-5 rounded-lg shadow-sm flex items-center justify-between cursor-pointer transform transition-all duration-300 hover:scale-105 hover:bg-orange-200"
  onClick={() => handleCardClick('total_advance', 'Total Advance Breakdown')}
>
  <div>
    <p className="text-sm text-orange-700">Total Advance</p>
    <h3 className="text-2xl md:text-3xl font-bold text-orange-900">
      <AnimatedNumber end={summary?.totalAdvance || 0} isCurrency />
    </h3>
  </div>
  <FaMoneyBillWave className="text-orange-600 text-4xl md:text-5xl" />
</div>

<div
  className="bg-teal-100 p-5 rounded-lg shadow-sm flex items-center justify-between cursor-pointer transform transition-all duration-300 hover:scale-105 hover:bg-teal-200"
  onClick={() => handleCardClick('total_rent', 'Total Rent Breakdown')}
>
  <div>
    <p className="text-sm text-teal-700">Total Rent</p>
    <h3 className="text-2xl md:text-3xl font-bold text-teal-900">
      <AnimatedNumber end={summary?.totalRent || 0} isCurrency />
    </h3>
  </div>
  <FaMoneyBillWave className="text-teal-600 text-4xl md:text-5xl" />
</div>

            <div
              className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 bg-red-100 p-5 rounded-lg shadow-sm flex items-center justify-between cursor-pointer hover:bg-red-200 transition-colors"
              onClick={() => handleCardClick('overall_cost', 'Overall Total Cost Breakdown')}
            >
              <div>
                <p className="text-sm text-red-700">Overall Total Cost</p>
                {/* MODIFIED: Used AnimatedNumber component */}
                <h3 className="text-2xl md:text-3xl font-bold text-red-900">
                  <AnimatedNumber end={summary.overallTotalCost} isCurrency />
                </h3>
              </div>
              <FaChartLine className="text-red-600 text-4xl md:text-5xl" />
            </div>
          </div>

          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg shadow-md">
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <FaClipboardList className="mr-3 text-indigo-600" /> Recent Activities
            </h3>
            <ul className="divide-y divide-gray-200">
              {summary.recentActivities.length > 0 ? (
                summary.recentActivities.map(activity => (
                  <li key={activity._id} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                      <p className="text-gray-900 font-medium">{activity.message}</p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        <span className="font-semibold">Site:</span> {activity.siteId?.name || 'N/A'} |{' '}
                        <span className="font-semibold">By:</span> {activity.supervisorId?.name || 'admin'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 mt-1 sm:mt-0">
                      {new Date(activity.date).toLocaleDateString('en-GB')}
                    </span>
                  </li>
                ))
              ) : (
                <li className="py-3 text-center text-gray-500">
                  No recent activities found.
                </li>
              )}
            </ul>
          </div>
        </>
      ) : (
        <ProjectSummaryCards />
      )}

      <Drawer
        isOpen={isBreakdownDrawerOpen}
        onClose={handleCloseBreakdownDrawer}
        title={breakdownTitle}
      >
        <BreakdownDrawerContent
          breakdownType={breakdownType}
          projectSummaries={projectSummaries}
          overallSummary={summary}
        />
      </Drawer>
    </div>
  );
};

export default AdminDashboard;
