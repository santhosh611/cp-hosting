import React, { useEffect, useState, useCallback, useContext } from 'react';
import API from '../../api/axios';
import { toast } from 'react-toastify';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import ActivityLogForm from '../../components/supervisor/ActivityLogForm';
import { FaFilter, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import Spinner from '../../components/common/Spinner';
import { AuthContext } from '../../context/AuthContext';
import { useDemoData } from '../../context/DemoDataContext';

const DailyActivityLogs = () => {
  const { user } = useContext(AuthContext);
  const demoData = useDemoData();
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [filters, setFilters] = useState({ siteId: '', startDate: '', endDate: '' });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedActivityLog, setSelectedActivityLog] = useState(null);

  // Memoize fetchActivityLogs with useCallback
  const fetchActivityLogs = useCallback(async () => {
    if (user?.isDemo) {
      setActivityLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams(filters).toString();
      const res = await API.get(`/activities?${params}`);
      setActivityLogs(res.data);
    } catch (error) {
      toast.error('Failed to load activity logs.');
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, user]);

  // Memoize fetchSites with useCallback
  const fetchSites = useCallback(async () => {
    if (user?.isDemo) {
      setSites([]);
      return;
    }
    try {
      const res = await API.get('/projects');
      setSites(res.data);
    } catch (error) {
      toast.error('Failed to load sites for filter.');
      console.error('Error fetching sites:', error);
    }
  }, [user]);

  // Initial data fetch useEffect
  useEffect(() => {
    fetchSites();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // This useEffect will now properly re-run when filters change because fetchActivityLogs
  // is a stable reference.
  useEffect(() => {
    if (user?.isDemo) return;
    fetchActivityLogs();
  }, [filters, fetchActivityLogs, user]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => fetchActivityLogs();

  const resetFilters = () => {
    setFilters({ siteId: '', startDate: '', endDate: '' });
  };

  const handleAddLog = () => {
    setSelectedActivityLog(null);
    setIsModalOpen(true);
  };

  const handleEditLog = (log) => {
    setSelectedActivityLog(log);
    setIsModalOpen(true);
  };

  const handleDeleteLog = async (id) => {
    if (window.confirm('Are you sure you want to delete this activity log?')) {
      try {
        await API.delete(`/activities/${id}`);
        toast.success('Activity log deleted successfully!');
        fetchActivityLogs();
      } catch (error) {
        toast.error(`Failed to delete activity log: ${error.response?.data?.message || error.message}`);
        console.error('Error deleting activity log:', error);
      }
    }
  };

  const handleSaveLog = () => {
    fetchActivityLogs();
    setIsModalOpen(false);
  };

  const tableHeaders = ['Site', 'Date', 'Message', 'Supervisor', 'Actions'];



  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Daily Activity Logs</h2>

      <div className="mb-4 sm:mb-6 p-2 sm:p-4 bg-gray-50 rounded-lg shadow-sm">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-3 sm:mb-4 flex items-center">
          <FaFilter className="mr-2 text-indigo-600" /> Filters
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Site</label>
            <select
              name="siteId"
              value={filters.siteId}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1 sm:p-2"
            >
              <option value="">All Sites</option>
              {sites.map((site) => (
                <option key={site._id} value={site._id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1 sm:p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1 sm:p-2"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={applyFilters}
            className="px-3 sm:px-4 py-1 sm:py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Apply Filters
          </button>
          <button
            onClick={resetFilters}
            className="px-3 sm:px-4 py-1 sm:py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {!user?.isDemo && (
        <div className="flex flex-col sm:flex-row justify-end items-center mb-4 sm:mb-6 space-y-2 sm:space-y-0">
          <button
            onClick={handleAddLog}
            className="flex items-center px-3 sm:px-4 py-1 sm:py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700"
          >
            <FaPlus className="mr-2" /> Log New Activity
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] py-12">
          <Spinner size="lg" type="logo" color="#2F3C7E" />
          <span className="ml-3 mt-4 text-sm text-gray-500">Loading daily activity...</span>
        </div>
      ) : (
        <Table
          headers={tableHeaders}
          data={activityLogs}
          emptyMessage="No activity logs found for the selected criteria."
          renderRow={(log) => (
            <tr key={log._id} className="hover:bg-gray-50">
              <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
                {log.siteId?.name || log.site?.name || 'N/A'}
              </td>
              <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
                {log.date ? new Date(log.date).toLocaleDateString('en-GB') : 'N/A'}
              </td>
              <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
                {log.message || log.activityType || 'N/A'}{log.description ? ` — ${log.description}` : ''}
              </td>
              <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
                {log.supervisorId?.name || log.enteredBy?.name || 'N/A'}
              </td>
              <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm flex space-x-2">
                {!user?.isDemo ? (
                  <>
                    <button onClick={() => handleEditLog(log)} className="text-blue-600 hover:text-blue-800">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDeleteLog(log._id)} className="text-red-600 hover:text-red-800">
                      <FaTrash />
                    </button>
                  </>
                ) : (
                  <span className="text-gray-400 text-xs italic">View Only</span>
                )}
              </td>
            </tr>
          )}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedActivityLog ? 'Edit Activity Log' : 'Log New Activity'}
        size="md"
      >
        <ActivityLogForm
          activityLog={selectedActivityLog}
          onSave={handleSaveLog}
          onClose={() => setIsModalOpen(false)}
          siteId={filters.siteId}
        />
      </Modal>
    </div>
  );
};

export default DailyActivityLogs;
