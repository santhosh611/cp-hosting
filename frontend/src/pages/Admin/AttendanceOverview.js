// frontend/src/pages/Admin/AttendanceOverview.js
import React, { useEffect, useState, useMemo, useCallback } from 'react'; // Added useCallback
import API from '../../api/axios';
import { toast, ToastContainer } from 'react-toastify'; // ToastContainer is now used
import 'react-toastify/dist/ReactToastify.css';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import AttendanceForm from '../../components/supervisor/AttendanceForm';
import TemporaryWorkerForm from '../../components/supervisor/TemporaryWorkerForm';
import { FaFilter, FaPlus, FaEdit, FaTrash, FaUserPlus } from 'react-icons/fa';
import Spinner from '../../components/common/Spinner';

const AttendanceOverview = () => {
  const [attendanceEntries, setAttendanceEntries] = useState([]);
  const [temporaryWorkers, setTemporaryWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [workersForSiteFilter, setWorkersForSiteFilter] = useState([]);
  const [filters, setFilters] = useState({ siteId: '', workerId: '', startDate: '', endDate: '' });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isTemporaryModalOpen, setIsTemporaryModalOpen] = useState(false);

  // Memoize fetchAllEntries with useCallback
  const fetchAllEntries = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch regular attendance entries
      const regularAttendanceFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value)
      );
      const regularAttendanceParams = new URLSearchParams(regularAttendanceFilters).toString();
      const attendanceUrl = `/attendance?${regularAttendanceParams}`;
      const attendanceRes = await API.get(attendanceUrl);
      setAttendanceEntries(attendanceRes.data);

      // Handle temporary workers based on site filter and loaded sites
      if (filters.siteId) {
        const temporaryWorkerParams = new URLSearchParams(regularAttendanceFilters).toString();
        const temporaryWorkerUrl = `/stranger-workers?${temporaryWorkerParams}`;
        const temporaryRes = await API.get(temporaryWorkerUrl);
        setTemporaryWorkers(temporaryRes.data);
      } else {
        if (sites.length > 0) { // Only fetch if sites are loaded for 'All Sites' view
          const dateFilters = Object.fromEntries(
            Object.entries(filters).filter(([key, value]) => (key === 'startDate' || key === 'endDate') && value)
          );

          const promises = sites.map(site => {
            const paramsForSite = new URLSearchParams({ ...dateFilters, siteId: site._id }).toString();
            return API.get(`/stranger-workers?${paramsForSite}`);
          });

          const results = await Promise.allSettled(promises);

          const combinedTempWorkers = results
            .filter(result => result.status === 'fulfilled')
            .flatMap(result => result.value.data);

          setTemporaryWorkers(combinedTempWorkers);
        } else {
          setTemporaryWorkers([]); // Clear if sites aren't loaded yet for 'All Sites'
        }
      }
    } catch (error) {
      toast.error('Failed to load some attendance entries.');
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, sites]); // Dependencies for fetchAllEntries

  // Memoize fetchSites with useCallback
  const fetchSites = useCallback(async () => {
    try {
      const res = await API.get('/projects');
      setSites(res.data);
    } catch (error) {
      toast.error('Failed to load sites for filter.');
      console.error('Error fetching sites:', error);
    }
  }, []); // No external dependencies

  // Memoize fetchWorkersForSelectedSite with useCallback
  const fetchWorkersForSelectedSite = useCallback(async (siteId) => {
    if (siteId) {
      try {
        const res = await API.get(`/projects/${siteId}`);
        const assignedWorkers = res.data.assignedWorkers.map(aw => ({
          _id: aw.workerId._id,
          name: aw.workerId.name,
          role: aw.workerId.role
        }));
        setWorkersForSiteFilter(assignedWorkers);
      } catch (error) {
        toast.error('Failed to load workers for the selected site.');
        setWorkersForSiteFilter([]);
      }
    } else {
      setWorkersForSiteFilter([]);
    }
  }, []); // No external dependencies here

  // Initial data fetch useEffect (runs once on mount)
  useEffect(() => {
    fetchSites();
  }, [fetchSites]); // Dependency: fetchSites (now stable)

  // This useEffect runs whenever filters change, or when the sites list populates
  useEffect(() => {
    fetchAllEntries();
    fetchWorkersForSelectedSite(filters.siteId);
  }, [sites, filters.siteId, filters.workerId, filters.startDate, filters.endDate, fetchAllEntries, fetchWorkersForSelectedSite]); // Dependencies for this useEffect


  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value, ...(name === 'siteId' && { workerId: '' }) }));
  };

  const applyFilters = () => fetchAllEntries();
  const resetFilters = () => setFilters({ siteId: '', workerId: '', startDate: '', endDate: '' });

  const handleAddEntry = () => {
    if (!filters.siteId) {
      toast.error('Please select a specific site from the filters to mark new attendance.');
      return;
    }
    setSelectedEntry(null);
    setIsModalOpen(true);
  };

  const handleAddTemporaryWorker = () => {
    if (!filters.siteId) {
      toast.error('Please select a specific site from the filters to add a temporary worker.');
      return;
    }
    setIsTemporaryModalOpen(true);
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

        fetchAllEntries(); // Refresh the current component's data
        window.dispatchEvent(new CustomEvent('attendanceChanged')); // Dispatch global event

      } catch (error) {
        toast.error(`Failed to delete entry: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const handleSaveEntry = () => {
    fetchAllEntries();
    window.dispatchEvent(new CustomEvent('attendanceChanged')); // Notify salary page
    setIsModalOpen(false);
  };

  const combinedEntries = useMemo(() => {
    const tempTransformed = temporaryWorkers.map(sw => {
      const site = sites.find(s => s._id === sw.siteId);
      return {
        ...sw,
        _id: `temporary-${sw._id}`, // Prefix ID to differentiate from regular entries
        siteId: { name: site?.name || 'N/A' },
        workerId: { name: sw.name, role: sw.role },
        isTemporary: true,
        shiftType: sw.shiftType,
        multiplier: sw.multiplier,
      }
    });
    // Combine and sort by date, newest first
    return [...attendanceEntries, ...tempTransformed].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [attendanceEntries, temporaryWorkers, sites]); // Dependencies for useMemo

  const tableHeaders = ['Site', 'Worker', 'Role', 'Date', 'Shift Type', 'Multiplier', 'Recorded By', 'Actions'];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
        <Spinner size="lg" type="logo" color="#2F3C7E" />
        <span className="ml-3 mt-4 text-lg text-gray-700">Loading attendance...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Attendance Overview</h2>

      <div className="mb-4 sm:mb-6 p-2 sm:p-4 bg-gray-50 rounded-lg shadow-sm">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-3 sm:mb-4 flex items-center">
          <FaFilter className="mr-2 text-indigo-600" /> Filters
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Site</label>
            <select name="siteId" value={filters.siteId} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1 sm:p-2">
              <option value="">All Sites</option>
              {sites.map((site) => (<option key={site._id} value={site._id}>{site.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Worker</label>
            <select name="workerId" value={filters.workerId} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1 sm:p-2" disabled={!filters.siteId || workersForSiteFilter.length === 0}>
              <option value="">All Workers</option>
              {workersForSiteFilter.map((worker) => (<option key={worker._id} value={worker._id}>{worker.name} ({worker.role})</option>))}
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
        <div className="mt-4 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
          <button onClick={applyFilters} className="px-3 sm:px-4 py-1 sm:py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Apply Filters</button>
          <button onClick={resetFilters} className="px-3 sm:px-4 py-1 sm:py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">Reset Filters</button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end items-center mb-4 sm:mb-6 space-y-2 sm:space-y-0 sm:space-x-2">
        <button onClick={handleAddTemporaryWorker} className={`flex items-center px-3 sm:px-4 py-1 sm:py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700 ${!filters.siteId ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!filters.siteId}>
          <FaUserPlus className="mr-2" /> Add Temporary Worker
        </button>
        <button onClick={handleAddEntry} className={`flex items-center px-3 sm:px-4 py-1 sm:py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 ${!filters.siteId ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!filters.siteId}>
          <FaPlus className="mr-2" /> Mark New Attendance
        </button>
      </div>

      <Table
        headers={tableHeaders}
        data={combinedEntries}
        renderRow={(entry) => (
          <tr key={entry._id} className="hover:bg-gray-50">
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">{entry.siteId?.name || 'N/A'}</td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
              {entry.isTemporary ? `${entry.workerId.name} (Temporary)` : (entry.workerId?.name || 'N/A')}
            </td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
              {entry.workerId?.role || 'N/A'}
            </td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">{entry.date ? new Date(entry.date).toLocaleDateString('en-GB') : 'N/A'}</td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">{entry.shiftType}</td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">{entry.multiplier?.toFixed ? entry.multiplier.toFixed(1) : entry.multiplier}</td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">{entry.recordedBy?.name || 'N/A'}</td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    if (entry.isTemporary) {
                      // For temporary workers, open the TemporaryWorkerForm for editing
                      // Note: Your TemporaryWorkerForm doesn't currently accept an 'entryToEdit' prop for pre-filling.
                      // You might need to extend it to handle editing if needed.
                      // For now, this just opens the modal.
                      setIsTemporaryModalOpen(true);
                      // If you want to edit a temporary worker, you'd also set a selectedTemporaryWorker state here
                      // setSelectedTemporaryWorker(entry);
                    } else {
                      handleEditEntry(entry);
                    }
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => handleDeleteEntry(entry.isTemporary ? entry._id.replace('temporary-', '') : entry._id, entry.isTemporary)}
                  className="text-red-600 hover:text-red-800"
                >
                  <FaTrash />
                </button>
              </div>
            </td>
          </tr>
        )}
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedEntry ? 'Edit Attendance Entry' : 'Mark New Attendance'} size="md">
        <AttendanceForm onSave={handleSaveEntry} onClose={() => setIsModalOpen(false)} siteId={filters.siteId} attendanceEntry={selectedEntry} />
      </Modal>

      <Modal
        isOpen={isTemporaryModalOpen}
        onClose={() => {
          setIsTemporaryModalOpen(false);
          fetchAllEntries(); // Refresh after closing temporary worker modal
        }}
        title="Manage Temporary Workers"
        size="md"
      >
        <TemporaryWorkerForm
          siteId={filters.siteId}
          date={new Date().toISOString().split('T')[0]}
          onClose={() => {
            setIsTemporaryModalOpen(false);
            fetchAllEntries();
            window.dispatchEvent(new CustomEvent('attendanceChanged'));
          }}
        />
      </Modal>

      {/* ToastContainer added to the component's render */}
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
};

export default AttendanceOverview;