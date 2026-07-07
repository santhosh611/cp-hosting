// construction new/frontend/src/pages/Admin/RentPage.js
import React, { useState, useEffect, useContext } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import API from '../../api/axios';
import { FaFilter, FaTrash, FaEdit, FaPlus } from 'react-icons/fa';
import Modal from '../../components/common/Modal'; // Import Modal
import RentForm from '../../components/admin/RentForm'; // Import the new RentForm component
import { AuthContext } from '../../context/AuthContext';
import { useDemoData } from '../../context/DemoDataContext';

const RentPage = () => {
  const { user } = useContext(AuthContext);
  const demoData = useDemoData();
  const [rents, setRents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // State to control modal visibility
  const [selectedRent, setSelectedRent] = useState(null); // State for editing

  const initialFilters = { siteId: '', startDate: '', endDate: '' };
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    // DEMO MODE
    if (user?.isDemo) {
      setRents(demoData.rentEntries);
      setProjects(demoData.projects);
      return;
    }
    API.get('/projects').then(res => setProjects(res.data)).catch(() => toast.error('Failed to load projects.'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user?.isDemo) return;
    fetchRents(filters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchRents = async (currentFilters = {}) => {
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
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rent) => {
    setSelectedRent(rent); // Set rent to edit
    setIsModalOpen(true); // Open modal
  };

  const handleAddRent = () => {
    setSelectedRent(null); // No rent selected for new entry
    setIsModalOpen(true); // Open modal
  };

  const handleSave = () => {
    fetchRents(filters); // Refresh data after save
    setIsModalOpen(false); // Close modal
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
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
    fetchRents({});
  };

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
      {/* MODIFIED: Responsive text size */}
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Rent Management</h2>

      {/* Filters */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-6">
         <div className="flex items-center mb-4">
            <FaFilter className="text-indigo-600 mr-2" />
            <h3 className="font-bold text-lg text-gray-700">Filters</h3>
        </div>
        {/* MODIFIED: Responsive grid and button layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <select name="siteId" value={filters.siteId} onChange={handleFilterChange} className="p-2 border rounded-md w-full">
            <option value="">All Sites</option>
            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="p-2 border rounded-md" />
          <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="p-2 border rounded-md" />
           <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <button onClick={handleApplyFilters} className="flex-1 p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Apply</button>
            <button onClick={handleResetFilters} className="flex-1 p-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">Reset</button>
          </div>
        </div>
      </div>

      {/* Add New Rent Button */}
      {!user?.isDemo && (
        <div className="flex justify-end mb-4">
          <button onClick={handleAddRent} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
              <FaPlus className="mr-2" /> Add New Rent
          </button>
        </div>
      )}

      {/* Rents Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="5" className="text-center py-4">Loading...</td></tr>
            ) : rents.map(rent => (
              <tr key={rent._id}>
                <td className="px-6 py-4 whitespace-nowrap">{rent.site?.name || rent.vendorName || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{rent.startDate ? new Date(rent.startDate).toLocaleDateString() : (rent.rentDate ? new Date(rent.rentDate).toLocaleDateString() : 'N/A')}</td>
                <td className="px-6 py-4 whitespace-nowrap">₹{rent.rentAmount ? rent.rentAmount.toFixed(2) : (rent.amount ? rent.amount.toFixed(2) : '0.00')}</td>
                <td className="px-6 py-4 whitespace-nowrap max-w-xs truncate" title={rent.itemName || rent.toolsDescription}>{rent.itemName || rent.toolsDescription}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {!user?.isDemo ? (
                    <>
                      <button onClick={() => handleEdit(rent)} className="text-indigo-600 hover:text-indigo-900 mr-4" title="Edit"><FaEdit /></button>
                      <button onClick={() => handleDelete(rent._id)} className="text-red-600 hover:text-red-900" title="Delete"><FaTrash /></button>
                    </>
                  ) : (
                    <span className="text-gray-400 text-xs italic">View Only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL for Add/Edit Rent */}
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
    </div>
  );
};

export default RentPage;