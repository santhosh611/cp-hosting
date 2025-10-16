// construction new/frontend/src/pages/Supervisor/RentPageSupervisor.js
import React, { useState, useEffect, useContext, useCallback } from 'react'; // Added useCallback
import { toast, ToastContainer } from 'react-toastify';
import API from '../../api/axios';
import { FaFilter, FaTrash, FaEdit, FaPlus } from 'react-icons/fa'; // FaRedo removed
import Modal from '../../components/common/Modal';
import RentForm from '../../components/admin/RentForm'; // Reuse the Admin's RentForm
import Table from '../../components/common/Table';
import { AuthContext } from '../../context/AuthContext'; //
import Spinner from '../../components/common/Spinner'; // Import Spinner component

const RentPageSupervisor = () => {
  useContext(AuthContext);
  const [rents, setRents] = useState([]);
  const [projects, setProjects] = useState([]); 
  const [loading, setLoading] = useState(false); // 'loading' state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRent, setSelectedRent] = useState(null);

  const initialFilters = { siteId: '', startDate: '', endDate: '' };
  const [filters, setFilters] = useState(initialFilters);

  // Wrap fetchRents in useCallback to prevent it from changing on every render
  // This makes it a stable dependency for useEffect
  const fetchRents = useCallback(async (currentFilters = {}) => {
    setLoading(true);
    const params = Object.entries(currentFilters).reduce((acc, [key, value]) => {
      if (value) acc[key] = value;
      return acc;
    }, {});
    try {
      const { data } = await API.get('/rent', { params });
      setRents(data);
    } catch (error) {
      toast.error('Failed to fetch rent logs.');
      console.error('Error fetching rent logs:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array as it only uses state setters

  useEffect(() => {
    const fetchAssignedSites = async () => {
      try {
        const res = await API.get('/supervisor/my-sites'); //
        setProjects(res.data);
      } catch (error) {
        toast.error('Failed to load assigned sites.');
        console.error('Error fetching assigned sites:', error);
      }
    };
    fetchAssignedSites();
    fetchRents(); // Initial fetch without filters
  }, [fetchRents]); // Added fetchRents to dependencies

  useEffect(() => {
    fetchRents(filters);
  }, [filters, fetchRents]); // Added fetchRents to dependencies for consistency

  const handleEdit = (rent) => {
    setSelectedRent(rent);
    setIsModalOpen(true);
  };

  const handleAddRent = () => {
    if (!filters.siteId) {
      toast.error('Please select a specific site from the filter to add a new rent entry.');
      return;
    }
    setSelectedRent(null);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    fetchRents(filters);
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) { // Consider replacing with a custom modal for better UX
      try {
        await API.delete(`/rent/${id}`);
        toast.success('Rent entry deleted.');
        fetchRents(filters);
      } catch (error) {
        toast.error('Failed to delete entry.');
      }
    }
  };

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });
  const handleApplyFilters = () => fetchRents(filters);
  const handleResetFilters = () => {
    setFilters(initialFilters);
    fetchRents({}); // Fetch all rents after reset
  };

  const tableHeaders = ['Site', 'Date', 'Amount', 'Description', 'Actions']; // Removed 'Recorded By' as it's not rendered

  // Conditional rendering for loading state
  if (loading) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
        <Spinner size="lg" type="logo" color="#2F3C7E" /> {/* Using your custom Spinner */}
        <span className="ml-3 mt-4 text-lg text-gray-700">Loading rent logs...</span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Rent Management</h2>
      
      {/* Filters */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-6">
          <div className="flex items-center mb-4">
              <FaFilter className="text-indigo-600 mr-2" />
              <h3 className="font-bold text-lg text-gray-700">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select name="siteId" value={filters.siteId} onChange={handleFilterChange} className="p-2 border rounded-md w-full">
              <option value="">All My Sites</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="p-2 border rounded-md" />
            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="p-2 border rounded-md" />
              <div className="flex space-x-2">
              <button onClick={handleApplyFilters} className="flex-1 p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Apply</button>
              <button onClick={handleResetFilters} className="flex-1 p-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">Reset</button>
            </div>
          </div>
      </div>
      
      {/* Add New Rent Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleAddRent}
          className={`flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 ${!filters.siteId ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!filters.siteId}
        >
            <FaPlus className="mr-2" /> Add New Rent
        </button>
      </div>

      {/* Rents Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow-md">
        <Table
          headers={tableHeaders}
          data={rents}
          emptyMessage="No rent logs found."
          renderRow={rent => (
            <tr key={rent._id}>
                <td className="px-6 py-4 whitespace-nowrap">{rent.site?.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(rent.rentDate).toLocaleDateString('en-GB')}</td>
                <td className="px-6 py-4 whitespace-nowrap">₹{rent.amount.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap max-w-xs truncate" title={rent.toolsDescription}>{rent.toolsDescription}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleEdit(rent)} className="text-indigo-600 hover:text-indigo-900 mr-4" title="Edit"><FaEdit /></button>
                    <button onClick={() => handleDelete(rent._id)} className="text-red-600 hover:text-red-900" title="Delete"><FaTrash /></button>
                </td>
              </tr>
            )}
        />
      </div>

      {/* Modal for Add/Edit Rent */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedRent ? 'Edit Rent Entry' : 'Add New Rent Entry'}
        size="md"
      >
        <RentForm
          rentEntry={selectedRent}
          onSave={handleSave}
          onClose={() => setIsModalOpen(false)}
          siteId={filters.siteId}
        />
      </Modal>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
};

export default RentPageSupervisor;