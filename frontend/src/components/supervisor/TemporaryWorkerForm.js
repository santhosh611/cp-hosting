// frontend/src/components/supervisor/TemporaryWorkerForm.js
import React, { useState, useEffect,useCallback} from 'react';
import API from '../../api/axios';
import { toast } from 'react-toastify';
import { FaPlus, FaTrash, FaEdit } from 'react-icons/fa';

const TemporaryWorkerForm = ({ siteId, date, onClose }) => {
  const [temporaryWorkers, setTemporaryWorkers] = useState([]);
  const [managedDate, setManagedDate] = useState(date);
  const [newWorker, setNewWorker] = useState({ name: '', role: '', dailyRate: '', shiftType: '' });
  const [loading, setLoading] = useState(false);
  
  const [editingWorker, setEditingWorker] = useState(null); 
  const [editFormData, setEditFormData] = useState({ id: '', name: '', role: '', dailyRate: '', shiftType: '' });

  const [isCloning, setIsCloning] = useState(false);

  const shiftTypes = [
    { label: 'Full Day', value: 'Full Day' },
    { label: 'One-and-a-Half Day', value: 'One-and-a-Half Day' },
    { label: 'Half Day Morning', value: 'Half Day Morning' },
    { label: 'Half Day Evening', value: 'Half Day Evening' },
    { label: 'Absent', value: 'Absent' },
    { label: 'Leave', value: 'Leave' },
  ];

const fetchTemporaryWorkers = useCallback(async () => {
  if (!siteId || !managedDate) return;
  try {
    const formattedDate = new Date(managedDate).toISOString().split('T')[0];
    const res = await API.get(`/stranger-workers`, { params: { siteId, date: formattedDate } });
    setTemporaryWorkers(res.data);
  } catch (error) {
    toast.error('Failed to load temporary workers.');
  }
}, [siteId, managedDate]); // Add siteId and managedDate as dependencies here
  
useEffect(() => {
  fetchTemporaryWorkers();
}, [siteId, managedDate, fetchTemporaryWorkers]);

  const handleAddWorker = async (e) => {
    e.preventDefault();
    if (!newWorker.name || !newWorker.role || !newWorker.dailyRate || !newWorker.shiftType) {
      toast.error('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      await API.post('/stranger-workers', {
        ...newWorker,
        siteId,
        date: managedDate,
        dailyRate: parseFloat(newWorker.dailyRate),
      });
      toast.success('Temporary worker added!');
      setNewWorker({ name: '', role: '', dailyRate: '', shiftType: '' });
      setIsCloning(false);
      fetchTemporaryWorkers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add temporary worker.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorker = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await API.delete(`/stranger-workers/${id}`);
        toast.success('Temporary worker removed!');
        fetchTemporaryWorkers();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete temporary worker.');
      }
    }
  };
  
  const handleStartEdit = (worker) => {
    setEditingWorker(worker);
    setIsCloning(false); 
    setEditFormData({
      id: worker._id,
      name: worker.name,
      role: worker.role,
      dailyRate: worker.dailyRate,
      shiftType: worker.shiftType,
    });
  };

  const handleCancelEdit = () => {
    setEditingWorker(null);
    setEditFormData({ id: '', name: '', role: '', dailyRate: '', shiftType: '' });
  };
  
  const handleStartClone = (worker) => {
    setNewWorker({
      name: worker.name,
      role: worker.role,
      dailyRate: worker.dailyRate,
      shiftType: '' 
    });
    setIsCloning(true);
    setEditingWorker(null); 
    toast.info(`Re-adding ${worker.name}. Select a new date and shift.`);
  };

  const handleCancelCloning = () => {
    setIsCloning(false);
    setNewWorker({ name: '', role: '', dailyRate: '', shiftType: '' });
  };

  const handleUpdateWorker = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { id, ...updateData } = editFormData;
      await API.put(`/stranger-workers/${id}`, updateData);
      toast.success('Temporary worker updated!');
      handleCancelEdit();
      fetchTemporaryWorkers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update worker.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Manage Temporary Workers</h3>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700">Select Date</label>
        <input
            type="date"
            value={managedDate}
            onChange={(e) => setManagedDate(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
        />
      </div>
      
      {editingWorker && (
        <form onSubmit={handleUpdateWorker} className="space-y-4 mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-lg font-semibold text-gray-700">Editing: {editingWorker.name}</h4>
          <input type="text" value={editFormData.name} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} className="w-full p-2 border rounded-md" required />
          <input type="text" value={editFormData.role} onChange={(e) => setEditFormData({...editFormData, role: e.target.value})} className="w-full p-2 border rounded-md" required />
          <input type="number" value={editFormData.dailyRate} onChange={(e) => setEditFormData({...editFormData, dailyRate: e.target.value})} className="w-full p-2 border rounded-md" required min="0" step="any" />
          <select name="shiftType" value={editFormData.shiftType} onChange={(e) => setEditFormData({...editFormData, shiftType: e.target.value})} className="w-full p-2 border rounded-md" required>
            {shiftTypes.map(shift => (<option key={shift.value} value={shift.value}>{shift.label}</option>))}
          </select>
          <div className="flex space-x-2">
            <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" disabled={loading}>{loading ? 'Updating...' : 'Update Worker'}</button>
            <button type="button" onClick={handleCancelEdit} className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">Cancel</button>
          </div>
        </form>
      )}

      {!editingWorker && (
        <form onSubmit={handleAddWorker} className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-700">{isCloning ? `Re-adding: ${newWorker.name}` : 'Add New'}</h4>
          <input type="text" value={newWorker.name} onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })} className="w-full p-2 border rounded-md" placeholder="Name*" required disabled={isCloning} />
          <input type="text" value={newWorker.role} onChange={(e) => setNewWorker({ ...newWorker, role: e.target.value })} className="w-full p-2 border rounded-md" placeholder="Role/Type*" required disabled={isCloning} />
          {/* START: MODIFICATION - Removed the `disabled` attribute from the Daily Rate input */}
          <input type="number" value={newWorker.dailyRate} onChange={(e) => setNewWorker({ ...newWorker, dailyRate: e.target.value })} className="w-full p-2 border rounded-md" placeholder="Daily Rate (₹)*" required min="0" step="any" />
          {/* END: MODIFICATION */}
          <select name="shiftType" value={newWorker.shiftType} onChange={(e) => setNewWorker({ ...newWorker, shiftType: e.target.value })} className="w-full p-2 border rounded-md" required>
            <option value="">Select Shift*</option>
            {shiftTypes.map(shift => (<option key={shift.value} value={shift.value}>{shift.label}</option>))}
          </select>
          <div className="flex space-x-2">
            {isCloning && (
              <button type="button" onClick={handleCancelCloning} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">Cancel</button>
            )}
            <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50" disabled={loading}>
                <FaPlus className="inline mr-2" /> {loading ? 'Adding...' : (isCloning ? 'Add Again' : 'Add Worker')}
            </button>
          </div>
        </form>
      )}

      <div>
        <h4 className="text-lg font-semibold text-gray-700 mb-2">Workers for {new Date(managedDate).toLocaleDateString('en-GB')}</h4>
        <ul className="space-y-2 max-h-60 overflow-y-auto border p-2 rounded-md">
          {temporaryWorkers.length > 0 ? (
            temporaryWorkers.map((worker) => (
              <li key={worker._id} className="flex items-center justify-between p-2 bg-white rounded-md shadow-sm">
                <span>{worker.name} ({worker.role}) - ₹{(worker.dailyRate || 0).toFixed(2)} - {worker.shiftType}</span>
                <div className="flex space-x-3">
                   <button onClick={() => handleStartClone(worker)} className="p-1 text-green-600 hover:text-green-800" title="Add again on selected date">
                     <FaPlus />
                   </button>
                   <button onClick={() => handleStartEdit(worker)} className="p-1 text-blue-600 hover:text-blue-800" title="Edit"><FaEdit /></button>
                   <button onClick={() => handleDeleteWorker(worker._id)} className="p-1 text-red-600 hover:text-red-800" title="Delete"><FaTrash /></button>
                </div>
              </li>
            ))
          ) : (
            <li className="text-center text-gray-500">No temporary workers added for this day.</li>
          )}
        </ul>
      </div>

      <div className="flex justify-end mt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">Close</button>
      </div>
    </div>
  );
};

export default TemporaryWorkerForm;