import React, { useState, useContext } from 'react'; // MODIFIED: Imported useState
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import LoginPage from './pages/Auth/LoginPage';
import AdminDashboard from './pages/Admin/AdminDashboard';
import ManageProjects from './pages/Admin/ManageProjects';
import ManageWorkers from './pages/Admin/ManageWorkers';
import ManageRolesSalaries from './pages/Admin/ManageRolesSalaries';
import AttendanceOverview from './pages/Admin/AttendanceOverview';
import SalaryAdvanceLogs from './pages/Admin/SalaryAdvanceLogs';
import RawMaterialLogs from './pages/Admin/RawMaterialLogs';
import DailyActivityLogs from './pages/Admin/DailyActivityLogs';
import ReportGenerator from './pages/Admin/ReportGenerator';
import AdminSettings from './pages/Admin/AdminSettings';
import ProjectDetailsPage from './pages/Admin/ProjectDetailsPage';
import SupervisorDashboard from './pages/Supervisor/SupervisorDashboard';
import MySites from './pages/Supervisor/MySites';
import SiteDetailsPage from './pages/Supervisor/SiteDetailsPage';
import MarkAttendance from './pages/Supervisor/MarkAttendance';
import LogRawMaterials from './pages/Supervisor/LogRawMaterials';
import LogDailyActivities from './pages/Supervisor/LogDailyActivities';
import ManageAdvances from './pages/Supervisor/ManageAdvances';
import SupervisorGenerateReports from './pages/Supervisor/GenerateReports';
import RentPage from './pages/Admin/RentPage';
import EditRentPage from './pages/Admin/EditRentPage';
import RentPageSupervisor from './pages/Supervisor/RentPageSupervisor';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import Spinner from './components/common/Spinner';
import WalletPage from './pages/Admin/WalletPage'; 

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <Spinner size="xl" type="logo" /> {/* Changed type to 'logo' */}
        <span className="ml-3 mt-4 text-lg text-gray-700">Loading application...</span> {/* Text might still be relevant */}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/supervisor/dashboard'} replace />;
  }

  return children;
};

function App() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  
  // MODIFIED: Added state and a toggle function for the sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const showLayout =
   location.pathname.startsWith('/admin') ||
   location.pathname.startsWith('/supervisor');

  return (
    // MODIFIED: Changed main layout div to handle relative positioning for the sidebar
    <div className="relative md:flex h-screen bg-gray-100 font-inter">
      {/* MODIFIED: Passed state and toggle function to Sidebar */}
      {showLayout && user && <Sidebar role={user.role} isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />}
      
      <div className="flex flex-col flex-1">
        {/* MODIFIED: Passed toggle function to Navbar */}
       {showLayout && user && <Navbar user={user} toggleSidebar={toggleSidebar} />}
       
       <main className="flex-1 overflow-y-auto p-4">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin/*" element={<ProtectedRoute allowedRoles={['admin']}><AdminRoutes /></ProtectedRoute>} />
            <Route path="/supervisor/*" element={<ProtectedRoute allowedRoles={['supervisor']}><SupervisorRoutes /></ProtectedRoute>} />
            <Route path="/" element={user ? (user.role === 'admin' ? <Navigate to="/admin/dashboard" /> : <Navigate to="/supervisor/dashboard" />) : <Navigate to="/login" />} />
            <Route path="*" element={<Navigate to={user ? (user.role === 'admin' ? '/admin/dashboard' : '/supervisor/dashboard') : '/login'} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

// --- AdminRoutes and SupervisorRoutes components remain unchanged ---

const AdminRoutes = () => (
  <Routes>
    <Route path="dashboard" element={<AdminDashboard />} />
    <Route path="projects" element={<ManageProjects />} />
    <Route path="projects/:projectId" element={<ProjectDetailsPage />} />
    <Route path="workers" element={<ManageWorkers />} />
    <Route path="roles-salaries" element={<ManageRolesSalaries />} />
    <Route path="attendance-overview" element={<AttendanceOverview />} />
    <Route path="salary-advance-logs" element={<SalaryAdvanceLogs />} />
    <Route path="raw-material-logs" element={<RawMaterialLogs />} />
    <Route path="daily-activity-logs" element={<DailyActivityLogs />} />
    <Route path="rent" element={<RentPage />} />
    <Route path="report-generator" element={<ReportGenerator />} />
    <Route path="settings" element={<AdminSettings />} />
    <Route path="rent/:rentId/edit" element={<EditRentPage />} />
    <Route path="wallet" element={<WalletPage />} />
    <Route path="*" element={<Navigate to="dashboard" replace />} />
  </Routes>
);

const SupervisorRoutes = () => (
  <Routes>
    <Route path="dashboard" element={<SupervisorDashboard />} />
    <Route path="my-sites" element={<MySites />} />
    <Route path="sites/:siteId" element={<SiteDetailsPage />} />
    <Route path="mark-attendance" element={<MarkAttendance />} />
    <Route path="log-raw-materials" element={<LogRawMaterials />} />
    <Route path="log-daily-activities" element={<LogDailyActivities />} />
    <Route path="manage-advances" element={<ManageAdvances />} />
    <Route path="rent" element={<RentPageSupervisor />} />
    <Route path="*" element={<Navigate to="dashboard" replace />} />
  </Routes>
);


export default App;
