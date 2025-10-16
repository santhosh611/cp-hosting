// construction new/frontend/src/components/admin/RentForm.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import API from '../../api/axios';

const RentForm = ({ rentEntry, onSave, onClose, siteId: initialSiteId }) => {
  const initialFormData = { amount: '', toolsDescription: '', rentDate: '' };
  const [formData, setFormData] = useState(initialFormData);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const res = await API.get('/projects');
        setSites(res.data);
      } catch (error) {
        toast.error('Failed to load projects.');
        console.error('Error fetching projects:', error);
      }
    };
    fetchSites();

    if (rentEntry) {
      let formattedDate = '';
      if (rentEntry.rentDate) {
        const dateObj = new Date(rentEntry.rentDate);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split('T')[0];
        }
      }
      setFormData({
        amount: rentEntry.amount || '',
        toolsDescription: rentEntry.toolsDescription || '',
        rentDate: formattedDate,
        site: rentEntry.site?._id || rentEntry.site || '',
      });
    } else {
      setFormData({
        amount: '',
        toolsDescription: '',
        rentDate: new Date().toISOString().split('T')[0], // Default to today's date for new entry
        site: initialSiteId || '',
      });
    }
  }, [rentEntry, initialSiteId]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const dataToSubmit = { ...formData };

    try {
      const apiCall = rentEntry
        ? API.put(`/rent/${rentEntry._id}`, dataToSubmit)
        : API.post('/rent', dataToSubmit);

      await apiCall;
      toast.success(rentEntry ? 'Rent entry updated!' : 'Rent entry added!');
      onSave();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit entry.');
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* MODIFIED: Wrapped form fields in a responsive grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Site</label>
            <select
              name="site"
              value={formData.site}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
              disabled={!!rentEntry}
            >
              <option value="">Select Site*</option>
              {sites.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Rent Date*</label>
            <input
              type="date"
              name="rentDate"
              value={formData.rentDate}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Amount (₹)*</label>
            <input
              type="number"
              name="amount"
              placeholder="Amount (₹)*"
              value={formData.amount}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
              min="0"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Tools Description*</label>
            <textarea
              name="toolsDescription"
              placeholder="Tools Description*"
              value={formData.toolsDescription}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              rows="3"
              required
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Submitting...' : (rentEntry ? 'Update Entry' : 'Add New Rent')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RentForm;