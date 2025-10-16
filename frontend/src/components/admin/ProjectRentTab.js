// construction new/frontend/src/components/admin/ProjectRentTab.js
import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { toast } from 'react-toastify';
import API from '../../api/axios';
import { FaFilter, FaTrash, FaEdit, FaPlus } from 'react-icons/fa'; // FaRedo removed
import Modal from '../common/Modal';
import RentForm from './RentForm';
import Table from '../common/Table'; // Assuming you have this Table component

const ProjectRentTab = ({ siteId }) => {
  const [rents, setRents] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false); // 'loading' state is now used
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRent, setSelectedRent] = useState(null);

  const initialFilters = { startDate: '', endDate: '' };
  const [filters, setFilters] = useState(initialFilters);

  // Memoize fetchRents using useCallback to make it a stable dependency
  const fetchRents = useCallback(async (currentFilters) => {
    setLoading(true);
    const params = { ...currentFilters, siteId };
    if (!params.startDate) delete params.startDate;
    if (!params.endDate) delete params.endDate;

    try {
      const { data } = await API.get('/rent', { params });
      setRents(data);
    } catch (error) {
      toast.error('Failed to fetch rent logs.');
      console.error('Error fetching rent logs:', error); // Log the error for debugging
    } finally {
      setLoading(false);
    }
  }, [siteId]); // Dependency: siteId is used in the params for the API call

  // Memoize fetchProjectData using useCallback
  const fetchProjectData = useCallback(async () => {
    if (!siteId) return;
    try {
      const projectRes = await API.get(`/projects/${siteId}`);
      setProject(projectRes.data);
    } catch (error) {
      toast.error('Failed to load project data.');
      console.error('Error fetching project data:', error); // Log the error for debugging
    }
  }, [siteId]); // Dependency: siteId is used in the API call

  // Initial data fetch and re-fetch when siteId changes
  useEffect(() => {
    fetchProjectData();
    fetchRents({}); // Fetch all rents for the initial load
  }, [siteId, fetchProjectData, fetchRents]); // Dependencies: memoized functions and siteId

  const handleEdit = (rent) => {
    setSelectedRent(rent);
    setIsModalOpen(true);
  };

  const handleAddRent = () => {
    setSelectedRent(null);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    fetchRents(filters); // Refresh data after save with current filters
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await API.delete(`/rent/${id}`);
        toast.success('Rent entry deleted.');
        fetchRents(filters); // Refresh data after delete
      } catch (error) {
        toast.error('Failed to delete entry.');
        console.error('Error deleting rent entry:', error); // Log the error for debugging
      }
    }
  };

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  const handleApplyFilters = () => fetchRents(filters); // Apply current filters

  const handleResetFilters = () => {
    setFilters(initialFilters); // Reset filters state
    fetchRents({}); // Fetch all rents (empty filters)
  };

  const tableHeaders = ['Date', 'Amount', 'Description', 'Actions']; // Removed 'Recorded By' as it wasn't in renderRow

  return (
    <div className="border-t border-gray-200 pt-6">
      <h3 className="text-2xl font-bold text-gray-800 mb-4">Rent Logs</h3>
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-6">
        <div className="flex items-center mb-4">
          <FaFilter className="text-indigo-600 mr-2" />
          <h3 className="font-bold text-lg text-gray-700">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input type="text" value={project?.name || 'Loading...'} disabled className="p-2 border rounded-md bg-gray-200 cursor-not-allowed" />
          <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="p-2 border rounded-md" />
          <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="p-2 border rounded-md" />
          <div className="flex justify-start space-x-2">
            <button onClick={handleApplyFilters} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Apply</button>
            <button onClick={handleResetFilters} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">Reset</button>
          </div>
        </div>
      </div>
      <div className="flex justify-end mb-4">
        <button onClick={handleAddRent} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
          <FaPlus className="mr-2" /> Add New Rent
        </button>
      </div>

      {/* Conditional rendering based on loading state */}
      {loading ? (
        <div className="text-center py-4">Loading rent logs...</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          {/* Using the common Table component */}
          <Table
            headers={tableHeaders}
            data={rents}
            emptyMessage="No rent logs found for this project with the selected criteria."
            renderRow={rent => (
              <tr key={rent._id}>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(rent.rentDate).toLocaleDateString()}</td>
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
      )}

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
          siteId={siteId} // Pass the siteId from props
        />
      </Modal>
      {/* ToastContainer is likely defined at a higher level, but if not, include it here */}
      {/* <ToastContainer position="top-right" autoClose={3000} hideProgressBar /> */}
    </div>
  );
};

export default ProjectRentTab;