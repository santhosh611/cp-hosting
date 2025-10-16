import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import { toast } from 'react-toastify';

const AdvanceForm = ({ advanceEntry, onSave, onClose, siteId: initialSiteId }) => {
  const [formData, setFormData] = useState({
    siteId: initialSiteId || '',
    workerId: '',
    temporaryWorkerName: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    reason: '',
  });

  const [sites, setSites] = useState([]);
  const [permanentWorkers, setPermanentWorkers] = useState([]);
  const [temporaryWorkers, setTemporaryWorkers] = useState([]);
  const [workerType, setWorkerType] = useState('permanent'); // 'permanent' or 'temporary'

  const fetchWorkersForSite = async (siteIdForFetch) => {
    if (!siteIdForFetch) {
      setPermanentWorkers([]);
      setTemporaryWorkers([]);
      return;
    }
    try {
      // Fetch regular assigned workers
      const siteRes = await API.get(`/projects/${siteIdForFetch}`);
      const regularWorkers = siteRes.data.assignedWorkers.map(aw => ({
        _id: aw.workerId._id,
        name: aw.workerId.name,
        role: aw.workerId.role,
      }));
      setPermanentWorkers(regularWorkers);

      // Fetch unique temporary workers for that site
      const tempWorkerRes = await API.get(`/stranger-workers?siteId=${siteIdForFetch}`);
      const uniqueTemporaryWorkers = tempWorkerRes.data.reduce((acc, current) => {
        if (!acc.find(item => item.name === current.name)) {
          acc.push(current);
        }
        return acc;
      }, []);
      setTemporaryWorkers(uniqueTemporaryWorkers);

    } catch (error) {
      toast.error('Failed to load workers for the selected site.');
      console.error('Error fetching site workers:', error);
    }
  };

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const sitesRes = await API.get('/projects');
        setSites(sitesRes.data);
        if (initialSiteId) {
          fetchWorkersForSite(initialSiteId);
        }
      } catch (error) {
        toast.error('Failed to load sites.');
      }
    };

    fetchSites();

    if (advanceEntry) {
      const isTemporary = !!advanceEntry.temporaryWorkerName;
      setWorkerType(isTemporary ? 'temporary' : 'permanent');

      setFormData({
        siteId: advanceEntry.siteId?._id || advanceEntry.siteId,
        workerId: !isTemporary ? (advanceEntry.workerId?._id || advanceEntry.workerId) : '',
        temporaryWorkerName: isTemporary ? advanceEntry.temporaryWorkerName : '',
        amount: advanceEntry.amount || '',
        date: advanceEntry.date ? new Date(advanceEntry.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        reason: advanceEntry.reason || '',
      });
    } else {
      setFormData(prev => ({
        ...prev,
        siteId: initialSiteId || '',
        workerId: '',
        temporaryWorkerName: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        reason: '',
      }));
    }
  }, [advanceEntry, initialSiteId]);

  const handleChange = async (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    if (name === 'siteId' && value) {
      fetchWorkersForSite(value);
      setFormData(prev => ({ ...prev, workerId: '', temporaryWorkerName: '' }));
    }
  };

  const handleWorkerTypeChange = (type) => {
    setWorkerType(type);
    setFormData(prev => ({ ...prev, workerId: '', temporaryWorkerName: '' })); // Reset selection on type change
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        siteId: formData.siteId,
        amount: parseFloat(formData.amount),
        date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
        reason: formData.reason,
      };

      if (workerType === 'temporary') {
        if (!formData.temporaryWorkerName) return toast.error("Please select a temporary worker.");
        payload.temporaryWorkerName = formData.temporaryWorkerName;
      } else {
        if (!formData.workerId) return toast.error("Please select a permanent worker.");
        payload.workerId = formData.workerId;
      }

      if (advanceEntry) {
        // const { id, ...updatePayload } = formData; // Removed unused 'updatePayload'
        await API.put(`/advances/${advanceEntry._id}`, payload);
        toast.success('Advance entry updated successfully!');
      } else {
        await API.post('/advances', payload);
        toast.success('Advance entry logged successfully!');
      }

      onSave();
      onClose();
    } catch (error) {
      toast.error(`Failed to save advance: ${error.response?.data?.message || error.message}`);
      console.error('Error saving advance:', error.response?.data || error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Site</label>
          <select
            name="siteId"
            value={formData.siteId}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
            disabled={!!initialSiteId && !advanceEntry}
          >
            <option value="">Select Site</option>
            {sites.map(site => (
              <option key={site._id} value={site._id}>{site.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Worker Type</label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <button type="button" onClick={() => handleWorkerTypeChange('permanent')} className={`px-4 py-2 rounded-l-md ${workerType === 'permanent' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>Permanent</button>
            <button type="button" onClick={() => handleWorkerTypeChange('temporary')} className={`px-4 py-2 rounded-r-md ${workerType === 'temporary' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>Temporary</button>
          </div>
        </div>
      </div>

      {workerType === 'permanent' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700">Permanent Worker</label>
          <select name="workerId" value={formData.workerId} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required disabled={!formData.siteId}>
            <option value="">Select Permanent Worker</option>
            {permanentWorkers.map(worker => (<option key={worker._id} value={worker._id}>{worker.name} ({worker.role})</option>))}
          </select>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700">Temporary Worker</label>
          <select name="temporaryWorkerName" value={formData.temporaryWorkerName} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required disabled={!formData.siteId}>
            <option value="">Select Temporary Worker</option>
            {temporaryWorkers.map(worker => (<option key={worker._id} value={worker.name}>{worker.name} ({worker.role})</option>))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Amount</label>
          <input type="number" name="amount" value={formData.amount} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required min="0" step="0.01" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input type="date" name="date" value={formData.date} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Reason (Optional)</label>
        <textarea name="reason" value={formData.reason} onChange={handleChange} rows="3" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"></textarea>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">Cancel</button>
        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
          {advanceEntry ? 'Update Advance' : 'Log Advance'}
        </button>
      </div>
    </form>
  );
};

export default AdvanceForm;