// construction new/frontend/src/pages/Supervisor/ManageAdvances.js
import React, { useEffect, useState,  useCallback } from 'react'; // Added useCallback
import API from '../../api/axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import AdvanceForm from '../../components/supervisor/AdvanceForm';
import { FaFilter, FaPlus, FaEdit, FaTrash } from 'react-icons/fa'; // Removed FaMoneyBillAlt
import { useParams } from 'react-router-dom';
import Spinner from '../../components/common/Spinner';

const ManageAdvances = () => {

  const { siteId: urlSiteId } = useParams();
  const [advanceLogs, setAdvanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [filters, setFilters] = useState({ siteId: urlSiteId || '', workerId: '', startDate: '', endDate: '' });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState(null);

  const fetchAdvanceLogs = useCallback(async (currentFilters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams(currentFilters).toString();
      const res = await API.get(`/advances?${params}`);
      setAdvanceLogs(res.data);
    } catch (error) {
      toast.error('Failed to load advance logs.');
      console.error('Error fetching advance logs:', error);
    } finally {
      setLoading(false);
    }
  }, []); 

  const fetchMySitesAndWorkers = useCallback(async () => {
    setLoading(true); // Add this line
    try {
      const sitesRes = await API.get('/supervisor/my-sites');
      setSites(sitesRes.data);
  
      let allAssignedWorkers = [];
      sitesRes.data.forEach(site => {
        site.assignedWorkers.forEach(worker => {
          if (!allAssignedWorkers.some(w => w._id === worker.workerId._id)) {
            allAssignedWorkers.push({
              _id: worker.workerId._id,
              name: worker.workerId.name,
              role: worker.workerId.role
            });
          }
        });
      });
      setWorkers(allAssignedWorkers);
  
      let initialSiteId = urlSiteId;
      if (!urlSiteId && sitesRes.data.length === 1) {
        initialSiteId = sitesRes.data[0]._id;
      }
      
      // Replace the existing setFilters block with this
      setFilters(prev => {
        const newFilters = { ...prev, siteId: initialSiteId || prev.siteId };
        fetchAdvanceLogs(newFilters); // Trigger fetch with the new filters
        return newFilters;
      });
  
    } catch (error) {
      toast.error('Failed to load sites or workers for filter.');
      console.error('Error fetching sites/workers:', error);
      setLoading(false); // Ensure loading is set to false on error
    }
  }, [urlSiteId, fetchAdvanceLogs]);

  useEffect(() => {
    fetchMySitesAndWorkers();
  }, [fetchMySitesAndWorkers]);

  useEffect(() => {
    fetchAdvanceLogs(filters); 
  }, [filters, fetchAdvanceLogs]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => fetchAdvanceLogs(filters);

  const resetFilters = () => {
    setFilters({ siteId: urlSiteId || '', workerId: '', startDate: '', endDate: '' });
  };

  const handleAddAdvance = () => {
    // CONDITIONALLY DISABLE BUTTON: Ensure a site is selected before opening the form
    if (!filters.siteId) {
      toast.error('Please select a site from the filter to add a new advance log.');
      return;
    }
    setSelectedAdvance(null);
    setIsModalOpen(true);
  };

  const handleEditAdvance = (advance) => {
    setSelectedAdvance(advance);
    setIsModalOpen(true);
  };

  const handleDeleteAdvance = async (id) => {
    if (window.confirm('Are you sure you want to delete this advance entry?')) {
      try {
        await API.delete(`/advances/${id}`);
        toast.success('Advance entry deleted successfully!');
        fetchAdvanceLogs(filters);
      } catch (error) {
        toast.error(`Failed to delete advance: ${error.response?.data?.message || error.message}`);
        console.error('Error deleting advance:', error);
      }
    }
  };

  const handleSaveAdvance = () => {
    fetchAdvanceLogs(filters);
    setIsModalOpen(false);
  };

  const tableHeaders = ['Worker Name', 'Site', 'Amount', 'Date', 'Reason', 'Recorded By', 'Actions'];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
        <Spinner size="lg" type="logo" color="#2F3C7E" />
        <span className="ml-3 mt-4 text-lg text-gray-700">Loading advance logs...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Manage Advance Payments</h2>

      <div className="mb-4 sm:mb-6 p-2 sm:p-4 bg-gray-50 rounded-lg shadow-sm">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-3 sm:mb-4 flex items-center">
          <FaFilter className="mr-2 text-indigo-600" /> Filters
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Site</label>
            <select
              name="siteId"
              value={filters.siteId}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1 sm:p-2"
              disabled={!!urlSiteId}
            >
              <option value="">All My Sites</option>
              {sites.map(site => (
                <option key={site._id} value={site._id}>{site.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Worker</label>
            <select
              name="workerId"
              value={filters.workerId}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1 sm:p-2"
            >
              <option value="">All Workers</option>
              {workers.map(worker => (
                <option key={worker._id} value={worker._id}>{worker.name} ({worker.role})</option>
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
        <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
        <button onClick={applyFilters} className="px-3 sm:px-4 py-1 sm:py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            Apply Filters
          </button>
          <button onClick={resetFilters} className="px-3 sm:px-4 py-1 sm:py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">
            Reset Filters
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end items-center mb-4 sm:mb-6 space-y-2 sm:space-y-0 sm:space-x-2">
        <button
          onClick={handleAddAdvance}
          className={`flex items-center px-3 sm:px-4 py-1 sm:py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 ${!filters.siteId ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!filters.siteId}
        >
          <FaPlus className="mr-2" /> Add New Advance
        </button>
      </div>

      <Table
        headers={tableHeaders}
        data={advanceLogs}
        emptyMessage="No advance payment logs found."
        renderRow={log => (
          <tr key={log._id} className="hover:bg-gray-50">
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">{log.workerId?.name || 'N/A'}</td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">{log.siteId?.name || 'N/A'}</td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">₹{log.amount.toFixed(2)}</td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
              {log.date ? new Date(log.date).toLocaleDateString('en-GB') : 'N/A'}
            </td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">{log.reason}</td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">{log.recordedBy?.name || 'N/A'}</td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm flex space-x-2">
              <button onClick={() => handleEditAdvance(log)} className="text-blue-600 hover:text-blue-800">
                <FaEdit />
              </button>
              <button onClick={() => handleDeleteAdvance(log._id)} className="text-red-600 hover:text-red-800">
                <FaTrash />
              </button>
            </td>
          </tr>
        )}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedAdvance ? 'Edit Advance Entry' : 'Add New Advance Entry'}
        size="md"
      >
        <AdvanceForm
          advanceEntry={selectedAdvance}
          onSave={handleSaveAdvance}
          onClose={() => setIsModalOpen(false)}
          siteId={filters.siteId || urlSiteId}
        />
      </Modal>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
};

export default ManageAdvances;