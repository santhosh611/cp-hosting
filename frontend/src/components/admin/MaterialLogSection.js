// construction new/frontend/src/components/admin/MaterialLogSection.js
import React, { useEffect, useState, useCallback } from 'react';
import API from '../../api/axios';
import { toast, ToastContainer } from 'react-toastify';
import Table from '../common/Table';
import Modal from '../common/Modal';
import MaterialLogForm from '../supervisor/MaterialLogForm';
import { FaFilter, FaPlus, FaEdit, FaTrash, FaBoxOpen } from 'react-icons/fa';
import Spinner from '../common/Spinner';

const MaterialLogSection = ({ siteId }) => {
  const [materialLogs, setMaterialLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ material: '', startDate: '', endDate: '' });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMaterialLog, setSelectedMaterialLog] = useState(null);

  // ---- STABLE FETCHER: accept query as an argument
  const fetchMaterialLogs = useCallback(async (query = {}) => {
    setLoading(true);
    try {
      const res = await API.get('/materials', { params: query });
      setMaterialLogs(res.data);
    } catch (error) {
      toast.error('Failed to load material logs for this project.');
      console.error('Error fetching material logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- INITIAL LOAD / WHEN siteId CHANGES ONLY
  useEffect(() => {
    if (siteId) {
      // initial unfiltered load for this site
      fetchMaterialLogs({ siteId });
    }
  }, [siteId, fetchMaterialLogs]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    if (!siteId) return;
    fetchMaterialLogs({ siteId, ...filters });
  };

  const resetFilters = () => {
    const cleared = { material: '', startDate: '', endDate: '' };
    setFilters(cleared);
    if (siteId) fetchMaterialLogs({ siteId }); // refresh with no filters
  };

  const handleAddLog = () => {
    setSelectedMaterialLog(null);
    setIsModalOpen(true);
  };

  const handleEditLog = (log) => {
    setSelectedMaterialLog(log);
    setIsModalOpen(true);
  };

  const handleDeleteLog = async (id) => {
    if (window.confirm('Are you sure you want to delete this material log?')) {
      try {
        await API.delete(`/materials/${id}`);
        toast.success('Material log deleted successfully!');
        if (siteId) fetchMaterialLogs({ siteId, ...filters }); // keep current view/filters
      } catch (error) {
        toast.error(`Failed to delete material log: ${error.response?.data?.message || error.message}`);
        console.error('Error deleting material log:', error);
      }
    }
  };

  const handleSaveLog = () => {
    if (siteId) fetchMaterialLogs({ siteId, ...filters });
    setIsModalOpen(false);
  };

  const tableHeaders = [
    'Material',
    'Brand',
    'Quantity',
    'Unit',
    'Price/Unit',
    'Flight Charge',
    'Total Cost',
    'Date',
    'Recorded By',
    'Actions',
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
        <Spinner size="lg" type="logo" color="#2F3C7E" />
        <span className="ml-3 mt-4 text-lg text-gray-700">Loading raw material...</span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <FaBoxOpen className="mr-2 text-green-600" /> Raw Materials Logs
      </h3>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg shadow-sm">
        <h4 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
          <FaFilter className="mr-2 text-indigo-600" /> Filters
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Material Name</label>
            <input
              type="text"
              name="material"
              value={filters.material}
              onChange={handleFilterChange}
              placeholder="e.g., Cement"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
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

      <div className="flex justify-end items-center mb-4">
        <button
          onClick={handleAddLog}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700"
        >
          <FaPlus className="mr-2" /> Log New Material
        </button>
      </div>

      <Table
        headers={tableHeaders}
        data={materialLogs}
        emptyMessage="No material logs found for this project with the selected criteria."
        renderRow={(log) => {
          const totalCostIncludingFlight = (
            (typeof log.total === 'number' ? log.total : 0) +
            (typeof log.flightCharge === 'number' ? log.flightCharge : 0)
          ).toFixed(2);

          return (
            <tr key={log._id} className="hover:bg-gray-50">
              <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
                {log.material}
              </td>
              <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
                {log.brand || 'N/A'}
              </td>
              <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
                {log.quantity}
              </td>
              <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
                {log.unit}
              </td>
              <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
                ₹{typeof log.pricePerUnit === 'number' ? log.pricePerUnit.toFixed(2) : 'N/A'}
              </td>
              <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
                ₹{typeof log.flightCharge === 'number' ? log.flightCharge.toFixed(2) : 'N/A'}
              </td>
              <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
                ₹{totalCostIncludingFlight}
              </td>
              <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
                {log.date ? new Date(log.date).toLocaleDateString('en-GB') : 'N/A'}
              </td>
              <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
                {log.recordedBy?.name || 'N/A'}
              </td>
              <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm flex space-x-2">
                <button onClick={() => handleEditLog(log)} className="text-blue-600 hover:text-blue-800">
                  <FaEdit />
                </button>
                <button onClick={() => handleDeleteLog(log._id)} className="text-red-600 hover:text-red-800">
                  <FaTrash />
                </button>
              </td>
            </tr>
          );
        }}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedMaterialLog ? 'Edit Material Entry' : 'Log New Material'}
        size="md"
      >
        <MaterialLogForm
          entryToEdit={selectedMaterialLog}
          onMaterialLogAdded={handleSaveLog}
          onClose={() => setIsModalOpen(false)}
          siteId={siteId}
        />
      </Modal>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
};

export default MaterialLogSection;

