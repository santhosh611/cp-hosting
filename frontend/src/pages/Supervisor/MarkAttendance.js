// frontend/src/pages/Supervisor/MarkAttendance.js
import React, { useEffect, useState, useMemo, useCallback } from 'react'; // Added useCallback
import API from '../../api/axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import AttendanceForm from '../../components/supervisor/AttendanceForm';
import TemporaryWorkerForm from '../../components/supervisor/TemporaryWorkerForm';
import { FaPlus, FaEdit, FaTrash, FaFilter, FaUserPlus } from 'react-icons/fa';
import { useParams } from 'react-router-dom';
import Spinner from '../../components/common/Spinner'; // Import Spinner component

const MarkAttendance = () => {
  const { siteId: urlSiteId } = useParams();
  const [attendanceEntries, setAttendanceEntries] = useState([]);
  const [temporaryWorkers, setTemporaryWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [filters, setFilters] = useState({ siteId: urlSiteId || '', workerId: '', startDate: '', endDate: '' });

  const [workersForFilter, setWorkersForFilter] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isTemporaryModalOpen, setIsTemporaryModalOpen] = useState(false);
  // FIX: 'setSelectedDateForTemporary' is assigned a value but never used
  // Changed from useState to a regular constant as the setter was never called
  const initialDateForTemporary = new Date().toISOString().split('T')[0]; 

  // FIX: React Hook useEffect has a missing dependency: 'fetchAllEntries'
  // Wrapped fetchAllEntries in useCallback to make it a stable dependency
  const fetchAllEntries = useCallback(async () => {
    // Check for filters.siteId and urlSiteId at the start of the function,
    // as useEffect's dependency array handles when this function should re-run.
    if (!filters.siteId && !urlSiteId) { 
      setAttendanceEntries([]);
      setTemporaryWorkers([]);
      setLoading(false); 
      return; 
    }
    
    setLoading(true);
    try {
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([key, value]) => value)
      );
      const attendanceParams = new URLSearchParams(activeFilters).toString();
      const attendanceUrl = `/attendance${attendanceParams ? `?${attendanceParams}` : ''}`;
      
      let temporaryWorkerUrl = '/stranger-workers';
      if (filters.siteId) {
        temporaryWorkerUrl += `?siteId=${filters.siteId}`;
      }
      
      const [attendanceRes, temporaryRes] = await Promise.all([
        API.get(attendanceUrl),
        API.get(temporaryWorkerUrl)
      ]);
      
      setAttendanceEntries(attendanceRes.data);
      setTemporaryWorkers(temporaryRes.data);

    } catch (error) {
      toast.error('Failed to load attendance entries.');
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, urlSiteId, setAttendanceEntries, setTemporaryWorkers, setLoading]); // Dependencies for fetchAllEntries

  // FIX: React Hook useEffect has a missing dependency: 'fetchSitesAndWorkers'
  // Wrapped fetchSitesAndWorkers in useCallback to make it a stable dependency
  const fetchSitesAndWorkers = useCallback(async () => {
    try {
      const sitesRes = await API.get('/supervisor/my-sites'); //
      setSites(sitesRes.data);

      const initialSiteId = urlSiteId || (sitesRes.data.length > 0 ? sitesRes.data[0]._id : '');
      if (initialSiteId) {
        const site = sitesRes.data.find(s => s._id === initialSiteId);
        if (site) {
          const siteWorkers = site.assignedWorkers.map(w => w.workerId);
          setWorkersForFilter(siteWorkers);
        }
      }
    } catch (error) {
      toast.error('Failed to load sites or workers for filter.');
    }
  }, [urlSiteId, setSites, setWorkersForFilter]); // Dependencies for fetchSitesAndWorkers (state setters are stable)

  // FIX: React Hook useEffect has a missing dependency: 'fetchSitesAndWorkers'
  // Dependency array now includes the useCallback-wrapped function
  useEffect(() => {
    fetchSitesAndWorkers();
  }, [fetchSitesAndWorkers]); 

  // FIX: React Hook useEffect has a missing dependency: 'fetchAllEntries'
  // Dependency array now includes the useCallback-wrapped function
  useEffect(() => {
    fetchAllEntries();
  }, [fetchAllEntries]); 


  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => {
      const newFilters = { ...prev, [name]: value };
      if (name === 'siteId') {
        newFilters.workerId = '';
        const selectedSite = sites.find(site => site._id === value);
        setWorkersForFilter(selectedSite ? selectedSite.assignedWorkers.map(w => w.workerId) : []);
      }
      return newFilters;
    });
  };

  const applyFilters = () => fetchAllEntries();
  
  const resetFilters = () => {
    setFilters({ siteId: urlSiteId || '', workerId: '', startDate: '', endDate: '' });
    if (urlSiteId) {
        const site = sites.find(s => s._id === urlSiteId);
        setWorkersForFilter(site ? site.assignedWorkers.map(w => w.workerId) : []);
    } else {
        setWorkersForFilter([]);
    }
  };

  const handleAddEntry = () => {
    if (!filters.siteId) {
      toast.error('Please select a site before marking attendance.');
      return;
    }
    setSelectedEntry(null);
    setIsModalOpen(true);
  };

  const handleEditEntry = (entry) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  const handleDeleteEntry = async (id, isTemporary = false) => {
    if (window.confirm(`Are you sure you want to delete this ${isTemporary ? 'temporary worker' : 'attendance'} entry?`)) {
      try {
        const endpoint = isTemporary ? `/stranger-workers/${id}` : `/attendance/${id}`;
        await API.delete(endpoint);
        toast.success(`${isTemporary ? 'Temporary worker' : 'Attendance entry'} deleted successfully!`);
        fetchAllEntries();
      } catch (error) {
        toast.error(`Failed to delete entry: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const handleSaveEntry = () => {
    fetchAllEntries();
    setIsModalOpen(false);
  };
  
  const combinedEntries = useMemo(() => {
    const tempTransformed = temporaryWorkers.map(sw => {
      const site = sites.find(s => s._id === sw.siteId);
      return {
      ...sw,
      _id: `temporary-${sw._id}`,
      siteId: { name: site?.name || 'N/A' },
      workerId: { name: sw.name, role: sw.role },
      isTemporary: true,
      shiftType: sw.shiftType,
      multiplier: sw.multiplier,
    }});
    return [...attendanceEntries, ...tempTransformed].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [attendanceEntries, temporaryWorkers, sites]);

  const tableHeaders = ['Worker', 'Role', 'Site', 'Date', 'Shift Type', 'Multiplier', 'Recorded By', 'Actions'];

  if (loading && !sites.length) { // Using 'loading' for conditional render
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)]"> 
        <Spinner size="lg" type="logo" color="#2F3C7E" /> 
        <span className="ml-3 mt-4 text-lg text-gray-700">Loading attendance data...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Mark & Manage Attendance</h2>

      <div className="mb-4 sm:mb-6 p-2 sm:p-4 bg-gray-50 rounded-lg shadow-sm">
      <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-3 sm:mb-4 flex items-center"><FaFilter className="mr-2 text-indigo-600" /> Filters</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Site</label>
            <select name="siteId" value={filters.siteId} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1 sm:p-2" disabled={!!urlSiteId}>
              <option value="">Select a Site</option>
              {sites.map((site) => (<option key={site._id} value={site._id}>{site.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Worker</label>
            <select name="workerId" value={filters.workerId} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1 sm:p-2" disabled={!filters.siteId}>
              <option value="">All Workers</option>
              {workersForFilter.map((worker) => (<option key={worker._id} value={worker._id}>{worker.name} ({worker.role})</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1 sm:p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1 sm:p-2" />
          </div>
        </div>
        <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
        <button onClick={applyFilters} className="px-3 sm:px-4 py-1 sm:py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Apply Filters</button>
        <button onClick={resetFilters} className="px-3 sm:px-4 py-1 sm:py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">Reset Filters</button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end items-center mb-4 sm:mb-6 space-y-2 sm:space-y-0 sm:space-x-2">
      <button onClick={() => setIsTemporaryModalOpen(true)} className={`flex items-center px-3 sm:px-4 py-1 sm:py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700 ${!filters.siteId ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!filters.siteId}>
          <FaUserPlus className="mr-2" /> Add Temporary Worker
        </button>
        <button onClick={handleAddEntry} className={`flex items-center px-3 sm:px-4 py-1 sm:py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 ${!filters.siteId ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!filters.siteId}>
          <FaPlus className="mr-2" /> Mark New Attendance
        </button>
      </div>

      <Table
        headers={tableHeaders}
        data={combinedEntries}
        emptyMessage="No attendance records found. Please select a site to view attendance."
        renderRow={(entry) => (
          <tr key={entry._id} className="hover:bg-gray-50">
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
                {entry.isTemporary ? `${entry.workerId.name} (Temporary)` : (entry.workerId?.name || 'N/A')}
            </td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
                {entry.workerId?.role || 'N/A'}
            </td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">{entry.siteId?.name || 'N/A'}</td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">{new Date(entry.date).toLocaleDateString('en-GB')}</td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">{entry.shiftType}</td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">{entry.multiplier?.toFixed ? entry.multiplier.toFixed(1) : 'N/A'}</td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">{entry.recordedBy?.name || 'N/A'}</td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm flex space-x-2">
              <button onClick={() => { if (entry.isTemporary) { setIsTemporaryModalOpen(true); } else { handleEditEntry(entry); }}} className="text-blue-600 hover:text-blue-800"><FaEdit /></button>
              <button onClick={() => handleDeleteEntry(entry.isTemporary ? entry._id.replace('temporary-', '') : entry._id, entry.isTemporary)} className="text-red-600 hover:text-red-800"><FaTrash /></button>
            </td>
          </tr>
        )}
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedEntry ? 'Edit Attendance Entry' : 'Mark New Attendance'} size="md">
        <AttendanceForm onSave={handleSaveEntry} onClose={() => setIsModalOpen(false)} siteId={filters.siteId || urlSiteId} attendanceEntry={selectedEntry} />
      </Modal>

      <Modal isOpen={isTemporaryModalOpen} onClose={() => setIsTemporaryModalOpen(false)} title="Manage Temporary Workers" size="md">
        <TemporaryWorkerForm siteId={filters.siteId} date={initialDateForTemporary} onClose={() => { setIsTemporaryModalOpen(false); fetchAllEntries(); }} />
      </Modal>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
};

export default MarkAttendance;