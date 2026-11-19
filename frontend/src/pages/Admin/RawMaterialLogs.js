import React, { useEffect, useState, useCallback, useContext } from 'react';
import API from '../../api/axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import MaterialLogForm from '../../components/supervisor/MaterialLogForm';
import { FaFilter, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import Spinner from '../../components/common/Spinner';
import { AuthContext } from '../../context/AuthContext';
import { useDemoData } from '../../context/DemoDataContext';

const RawMaterialLogs = () => {
  const { user } = useContext(AuthContext);
  const demoData = useDemoData();
  const [materialLogs, setMaterialLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [filters, setFilters] = useState({ siteId: '', material: '', startDate: '', endDate: '' });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMaterialLog, setSelectedMaterialLog] = useState(null);

const fetchMaterialLogs = useCallback(async (query = {}) => {
  setLoading(true);
  try {
    // use axios params instead of manual URLSearchParams
    const res = await API.get('/materials', { params: query });
    setMaterialLogs(res.data);
  } catch (error) {
    toast.error('Failed to load material logs.');
    console.error('Error fetching material logs:', error);
  } finally {
    setLoading(false);
  }
}, []);

const fetchSites = useCallback(async () => {
  try {
    const res = await API.get('/projects');
    setSites(res.data);
  } catch (error) {
    toast.error('Failed to load sites for filter.');
    console.error('Error fetching sites:', error);
  }
}, []);

useEffect(() => {
  // DEMO MODE
  if (user?.isDemo) {
    setMaterialLogs(demoData.materialLogs);
    setSites(demoData.projects);
    setLoading(false);
    return;
  }
  fetchSites();
  fetchMaterialLogs(); // initial, no filters
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [user]);
  // We are removing this useEffect because we want to trigger the fetch
  // only when the user explicitly clicks the "Apply Filters" button.
  // The first useEffect already handles the initial data load.
  // useEffect(() => {
  //   fetchMaterialLogs();
  // }, [filters, fetchMaterialLogs]);

const handleFilterChange = (e) => {
  const { name, value } = e.target;
  setFilters((prev) => ({ ...prev, [name]: value }));
};

const applyFilters = () => {
  fetchMaterialLogs(filters);
};

const resetFilters = () => {
  const cleared = { siteId: '', material: '', startDate: '', endDate: '' };
  setFilters(cleared);
  fetchMaterialLogs({}); // optional: refresh list after reset
};

  const handleAddLog = () => {
    if (!filters.siteId) {
      toast.error('Please select a site from the filter to add a new material log.');
      return;
    }
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
        fetchMaterialLogs();
      } catch (error) {
        toast.error(`Failed to delete material log: ${error.response?.data?.message || error.message}`);
        console.error('Error deleting material log:', error);
      }
    }
  };

  const handleSaveLog = () => {
    fetchMaterialLogs();
    setIsModalOpen(false);
  };

  const tableHeaders = ['Site', 'Material', 'Brand', 'Quantity', 'Unit', 'Price/Unit', 'Flight Charge', 'Total Cost', 'Date', 'Recorded By', 'Actions'];



  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Raw Material Logs</h2>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg shadow-sm">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-3 flex items-center">
          <FaFilter className="mr-2 text-indigo-600" /> Filters
        </h3>

        {/* The fix: Wrap the filter section in a form element */}
        <form onSubmit={(e) => { e.preventDefault(); applyFilters(); }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Site</label>
              <select
                name="siteId"
                value={filters.siteId}
                onChange={handleFilterChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
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

          <div className="mt-4 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              type="submit" // Changed to 'submit' to be semantically correct
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Apply Filters
            </button>
            <button
              type="button" // Changed to 'button' to prevent it from submitting the form
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
            >
              Reset Filters
            </button>
          </div>
        </form>
      </div>

      {!user?.isDemo && (
        <div className="flex justify-end items-center mb-4">
          <button
            onClick={handleAddLog}
            className={`flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 ${!filters.siteId ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!filters.siteId}
          >
            <FaPlus className="mr-2" /> Log New Material
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] py-12">
          <Spinner size="lg" type="logo" color="#2F3C7E" />
          <span className="ml-3 mt-4 text-sm text-gray-500">Loading raw material...</span>
        </div>
      ) : (
        <Table
          headers={tableHeaders}
          data={materialLogs}
          emptyMessage="No material logs found for the selected criteria."
          renderRow={(log) => {
            return (
              <tr key={log._id} className="hover:bg-gray-50">
                <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
                  {log.siteId?.name || log.site?.name || 'N/A'}
                </td>
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
                  ₹{typeof log.pricePerUnit === 'number' ? log.pricePerUnit.toFixed(2) : (typeof log.costPerUnit === 'number' ? log.costPerUnit.toFixed(2) : 'N/A')}
                </td>
                <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
                  ₹{typeof log.flightCharge === 'number' ? log.flightCharge.toFixed(2) : '0.00'}
                </td>
                <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
                  ₹{typeof log.total === 'number' ? (log.total + (log.flightCharge || 0)).toFixed(2) : (typeof log.totalCost === 'number' ? log.totalCost.toFixed(2) : 'N/A')}
                </td>
                <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
                  {log.date ? new Date(log.date).toLocaleDateString('en-GB') : 'N/A'}
                </td>
                <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
                  {log.recordedBy?.name || log.enteredBy?.name || 'N/A'}
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
            );
          }}
        />
      )}

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
          siteId={filters.siteId}
        />
      </Modal>
    </div>
  );
};

export default RawMaterialLogs;
