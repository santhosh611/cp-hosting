// construction new/frontend/src/pages/Admin/ManageWorkers.js
import React, { useEffect, useState, useContext } from 'react';
import API from '../../api/axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Modal from '../../components/common/Modal';
import Table from '../../components/common/Table';
import WorkerForm from '../../components/admin/WorkerForm';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import Spinner from '../../components/common/Spinner';
import { AuthContext } from '../../context/AuthContext';
import { useDemoData } from '../../context/DemoDataContext';

const ManageWorkers = () => {
  const { user } = useContext(AuthContext);
  const demoData = useDemoData();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);

  const fetchWorkers = async () => {
    // DEMO MODE
    if (user?.isDemo) {
      setWorkers(demoData.workers);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await API.get('/workers');
      setWorkers(res.data);
    } catch (error) {
      toast.error('Failed to load workers.');
      console.error('Error fetching workers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleAddWorker = () => {
    setSelectedWorker(null);
    setIsModalOpen(true);
  };

  const handleEditWorker = worker => {
    setSelectedWorker(worker);
    setIsModalOpen(true);
  };

  const handleDeleteWorker = async id => {
    if (user?.isDemo) {
      toast.info('Deleting workers is disabled in Demo Mode.');
      return;
    }
    const confirm = window.confirm(
      'Are you sure you want to delete this worker? This will also delete all their attendance, advance, and salary logs.'
    );
    if (!confirm) return;

    try {
      await API.delete(`/workers/${id}`);
      toast.success('Worker deleted successfully!');
      fetchWorkers();
    } catch (error) {
      toast.error(`Failed to delete worker: ${error.response?.data?.message || error.message}`);
      console.error('Error deleting worker:', error);
    }
  };

  const handleSaveWorker = () => {
    fetchWorkers();
    setIsModalOpen(false);
  };

  const tableHeaders = [
    'Name',
    'Role',
    'Base Daily Salary',
    'Assigned Projects',
    'Actions',
  ];

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Manage Workers</h2>
        <button
          onClick={handleAddWorker}
         className="flex items-center px-3 sm:px-4 py-1 sm:py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700"
        >
          <FaPlus className="mr-2" /> Add New Worker
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] py-12"> 
          <Spinner size="lg" type="logo" color="#2F3C7E" />
          <span className="ml-3 mt-4 text-sm text-gray-500">Loading workers...</span>
        </div>
      ) : (
        <Table
          headers={tableHeaders}
          data={workers}
          renderRow={worker => (
          <tr key={worker._id} className="hover:bg-gray-50">
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
              {worker.name}
            </td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
              {worker.role}
            </td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
              ₹{(worker.baseSalary || 0).toFixed(2)}
            </td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm">
              {worker.assignedProjects && worker.assignedProjects.length > 0
                ? worker.assignedProjects.map(p => p.siteName).join(', ')
                : 'None'}
            </td>
            <td className="px-5 py-3 border-b border-gray-200 bg-white text-sm flex space-x-2">
              <button
                onClick={() => handleEditWorker(worker)}
                className="text-blue-600 hover:text-blue-800"
              >
                <FaEdit />
              </button>
              <button
                onClick={() => handleDeleteWorker(worker._id)}
                className="text-red-600 hover:text-red-800"
              >
                <FaTrash />
              </button>
            </td>
          </tr>
        )}
      />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedWorker ? 'Edit Worker' : 'Add New Worker'}
        size="xl"
      >
        <WorkerForm
          worker={selectedWorker}
          onSave={handleSaveWorker}
          onClose={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default ManageWorkers;