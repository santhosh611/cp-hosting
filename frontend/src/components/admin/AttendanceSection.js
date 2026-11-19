// construction new/frontend/src/components/admin/AttendanceSection.js
import React, { useEffect, useState, useCallback, useContext } from 'react';
import API from '../../api/axios';
import { toast } from 'react-toastify';
import Table from '../common/Table';
import Modal from '../common/Modal';
// CORRECTED IMPORT PATHS
import AttendanceForm from '../supervisor/AttendanceForm';
import TemporaryWorkerForm from '../supervisor/TemporaryWorkerForm';
import { FaPlus, FaClipboardCheck, FaEdit, FaTrash, FaFilter, FaUserPlus } from 'react-icons/fa';
import Spinner from '../common/Spinner';
import { AuthContext } from '../../context/AuthContext';

const AttendanceSection = ({ siteId }) => {
  const { user } = useContext(AuthContext);
  const [attendanceEntries, setAttendanceEntries] = useState([]);
  const [temporaryWorkers, setTemporaryWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState([]);
  const [filters, setFilters] = useState({ workerId: '', startDate: '', endDate: '' });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTemporaryModalOpen, setIsTemporaryModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const selectedDateForTemporary = new Date().toISOString().split('T')[0]; // Changed from useState to a regular constant

const fetchAttendanceAndTemporaryWorkers = useCallback(async () => {
  if (user?.isDemo) {
    setAttendanceEntries([]);
    setTemporaryWorkers([]);
    setLoading(false);
    return;
  }
  setLoading(true);
  try {
    const params = new URLSearchParams({ ...filters, siteId }).toString();
    const res = await API.get(`/attendance?${params}`);
    setAttendanceEntries(res.data);

    // Use 'filters.startDate' for temporary worker fetch if available, otherwise 'selectedDateForTemporary'
    const tempWorkerDate = filters.startDate || selectedDateForTemporary;
    const temporaryRes = await API.get(`/stranger-workers?siteId=${siteId}&date=${tempWorkerDate}`);
    setTemporaryWorkers(temporaryRes.data);
  } catch (error) {
    toast.error('Failed to load attendance entries for this project.');
    console.error('Error fetching attendance entries:', error);
  } finally {
    setLoading(false);
  }
}, [filters, siteId, selectedDateForTemporary, user]); 

const fetchSiteWorkers = useCallback(async () => {
  if (user?.isDemo) {
    setWorkers([]);
    return;
  }
  try {
    const res = await API.get(`/projects/${siteId}`);
    const assignedWorkersData = res.data.assignedWorkers.map(assignment => ({
      _id: assignment.workerId._id,
      name: assignment.workerId.name,
      role: assignment.workerId.role
    }));
    setWorkers(assignedWorkersData);
  } catch (error) {
    toast.error('Failed to load workers for this project.');
    console.error('Error fetching site workers:', error);
  }
}, [siteId, user]); // Dependency for useCallback

useEffect(() => {
  if (siteId) {
    fetchSiteWorkers();
    fetchAttendanceAndTemporaryWorkers();
  }
}, [siteId, filters.workerId, filters.startDate, filters.endDate, fetchAttendanceAndTemporaryWorkers, fetchSiteWorkers]); // Dependencies for useEffect

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => fetchAttendanceAndTemporaryWorkers();

  const resetFilters = () => {
    setFilters({ workerId: '', startDate: '', endDate: '' });
  };

  const handleAddEntry = () => {
    setSelectedEntry(null);
    setIsModalOpen(true);
  };

  const handleEditEntry = (entry) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  const handleDeleteEntry = async (id, isTemporary = false) => {
    const confirmationMessage = `Are you sure you want to delete this ${isTemporary ? 'temporary worker' : 'attendance'} entry?`;
    if (window.confirm(confirmationMessage)) {
      try {
        const endpoint = isTemporary ? `/stranger-workers/${id}` : `/attendance/${id}`;
        await API.delete(endpoint);
        toast.success(`${isTemporary ? 'Temporary worker' : 'Attendance entry'} deleted successfully!`);
        fetchAttendanceAndTemporaryWorkers();
      } catch (error) {
        toast.error(`Failed to delete entry: ${error.response?.data?.message || error.message}`);
        console.error('Error deleting entry:', error);
      }
    }
  };

  const handleSaveEntry = () => {
    fetchAttendanceAndTemporaryWorkers();
    setIsModalOpen(false);
  };

  const combinedEntries = (() => {
    const combined = [...attendanceEntries];
    temporaryWorkers.forEach(sw => {
      combined.push({
        ...sw,
        _id: `temporary-${sw._id}`,
        workerId: { _id: sw._id, name: sw.name, role: sw.role },
        isTemporary: true,
        shiftType: sw.shiftType,
        multiplier: sw.multiplier
      });
    });
    return combined;
  })();

  const tableHeaders = ['Worker', 'Date', 'Shift Type', 'Multiplier', 'Recorded By', 'Actions'];

  if (loading) {
    // Replaced "Loading projects..." text with the Spinner component
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)]"> 
        <Spinner size="lg" type="logo" color="#2F3C7E" /> {/* Using your custom Spinner with 'logo' type */}
        <span className="ml-3 mt-4 text-lg text-gray-700">Loading attendance...</span>
      </div>
    );
  }
  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <FaClipboardCheck className="mr-2 text-indigo-600" /> Attendance Logs
      </h3>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg shadow-sm">
        <h4 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
          <FaFilter className="mr-2 text-indigo-600" /> Filters
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Worker</label>
            <select
              name="workerId"
              value={filters.workerId}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            >
              <option value="">All Workers</option>
              {workers.map((worker) => (
                <option key={worker._id} value={worker._id}>
                  {worker.name} ({worker.role})
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end space-x-3">
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Apply Filters
          </button>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
          >
            Reset Filters
          </button>
        </div>
      </div>

      <div className="flex justify-end items-center mb-4 space-x-2">
        <button
          onClick={() => setIsTemporaryModalOpen(true)}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700"
        >
          <FaUserPlus className="mr-2" /> Add Temporary Worker 
        </button>
        <button
          onClick={handleAddEntry}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700"
        >
          <FaPlus className="mr-2" /> Mark New Attendance
        </button>
      </div>

      <Table
        headers={tableHeaders}
        data={combinedEntries}
        emptyMessage="No attendance records found for this project with the selected criteria."
        renderRow={(entry) => (
          <tr key={entry._id} className="hover:bg-gray-50">
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
              {entry.isTemporary ? `${entry.workerId.name} (Temporary)` : `${entry.workerId?.name || 'N/A'} (${entry.workerId?.role || 'N/A'})`}
            </td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
              {entry.date ? new Date(entry.date).toLocaleDateString('en-GB') : 'N/A'}
            </td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
              {entry.shiftType || 'N/A'}
            </td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
              {entry.multiplier ? entry.multiplier.toFixed(1) : 'N/A'}
            </td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
              {entry.recordedBy?.name || 'N/A'}
            </td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm flex space-x-2">
              <button
                onClick={() => {
                  if (entry.isTemporary) {
                    // For temporary workers, open the management modal
                    setIsTemporaryModalOpen(true);
                  } else {
                    // For regular workers, open the standard edit modal
                    handleEditEntry(entry);
                  }
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                <FaEdit />
              </button>
              <button
                onClick={() => handleDeleteEntry(entry.isTemporary ? entry.workerId._id : entry._id, entry.isTemporary)}
                className="text-red-600 hover:text-red-800"
              >
                <FaTrash />
              </button>
            </td>
          </tr>
        )}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedEntry ? 'Edit Attendance Entry' : 'Mark New Attendance'}
        size="md"
      >
        <AttendanceForm
          onSave={handleSaveEntry}
          onClose={() => setIsModalOpen(false)}
          siteId={siteId}
          attendanceEntry={selectedEntry}
        />
      </Modal>

      <Modal
        isOpen={isTemporaryModalOpen}
        onClose={() => {
          setIsTemporaryModalOpen(false);
          fetchAttendanceAndTemporaryWorkers(); // This line ensures the table refreshes
        }}
        title="Manage Temporary Workers"
        size="md"
      >
        <TemporaryWorkerForm
          siteId={siteId}
          date={selectedDateForTemporary}
          onClose={() => {
            setIsTemporaryModalOpen(false);
            fetchAttendanceAndTemporaryWorkers();
          }}
        />
      </Modal>
    </div>
  );
};

export default AttendanceSection;