// construction new/frontend/src/components/supervisor/AttendanceForm.js
import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import { toast } from 'react-toastify';

const AttendanceForm = ({ onSave, onClose, siteId: initialSiteId, attendanceEntry }) => {
  const [formData, setFormData] = useState({
    siteId: initialSiteId || '',
    workerId: '',
    date: new Date().toISOString().split('T')[0],
    shiftType: '',
  });

  const [sites, setSites] = useState([]);
  const [workers, setWorkers] = useState([]);

  const shiftTypes = [
    { label: 'Full Day', value: 'Full Day', multiplier: 1.0 },
    { label: 'One-and-a-Half Day', value: 'One-and-a-Half Day', multiplier: 1.5 },
    { label: 'Half Day Morning', value: 'Half Day Morning', multiplier: 0.5 },
    { label: 'Half Day Evening', value: 'Half Day Evening', multiplier: 0.5 },
    { label: 'Absent', value: 'Absent', multiplier: 0 }, // Added Absent
    { label: 'Leave', value: 'Leave', multiplier: 0 },   // Added Leave
  ];

  useEffect(() => {
    const fetchSitesAndWorkers = async () => {
      try {
        const sitesRes = await API.get('/projects'); // Supervisors get only their assigned sites, Admins get all
        setSites(sitesRes.data);

        // If an initialSiteId is provided (e.g., from SiteDetailsPage or Admin Mark Attendance)
        if (initialSiteId) {
          const siteDetail = sitesRes.data.find(s => s._id === initialSiteId);
          if (siteDetail && siteDetail.assignedWorkers) {
            // Fetch detailed worker info for assigned workers on this specific site
            const workerDetailsPromises = siteDetail.assignedWorkers.map(aw =>
              API.get(`/workers/${aw.workerId._id}`)
            );
            const workerDetailsResponses = await Promise.all(workerDetailsPromises);
            setWorkers(workerDetailsResponses.map(res => res.data));
          }
        } else {
          // If no initialSiteId (e.g., general MarkAttendance page where user selects site)
          // Fetch all workers. The worker dropdown will then filter based on selected site.
          const workersRes = await API.get('/workers');
          setWorkers(workersRes.data);
        }
      } catch (error) {
        toast.error('Failed to load sites or workers.');
        console.error('Error fetching data:', error);
      }
    };

    fetchSitesAndWorkers();
  }, [initialSiteId]);

  useEffect(() => {
    // Populate form for editing
    if (attendanceEntry) {
      let entryDate = '';
      if (attendanceEntry.date) {
        const dateObj = new Date(attendanceEntry.date);
        if (!isNaN(dateObj.getTime())) {
          entryDate = dateObj.toISOString().split('T')[0];
        } else {
          console.warn(`[AttendanceForm] Invalid date received from attendanceEntry.date: ${attendanceEntry.date}`);
          entryDate = new Date().toISOString().split('T')[0];
        }
      } else {
        entryDate = new Date().toISOString().split('T')[0];
      }

      setFormData({
        siteId: attendanceEntry.siteId?._id || attendanceEntry.siteId,
        workerId: attendanceEntry.workerId?._id || attendanceEntry.workerId,
        date: entryDate,
        shiftType: attendanceEntry.shiftType || '',
      });
    } else {
      // Reset form for new entry, pre-selecting initial site if available
      setFormData(prev => ({
        siteId: initialSiteId || '',
        workerId: '',
        date: new Date().toISOString().split('T')[0],
        shiftType: '',
      }));
    }
  }, [attendanceEntry, initialSiteId]);


  const handleChange = async (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // If siteId changes, update the workers list for that site
    if (name === 'siteId' && value) {
      try {
        const siteRes = await API.get(`/projects/${value}`);
        const siteWorkers = siteRes.data.assignedWorkers;

        const workerDetailsPromises = siteWorkers.map(aw =>
          API.get(`/workers/${aw.workerId._id}`)
        );
        const workerDetailsResponses = await Promise.all(workerDetailsPromises);
        setWorkers(workerDetailsResponses.map(res => res.data));

        setFormData(prev => ({
          ...prev,
          workerId: '', // Reset worker when site changes
        }));
      } catch (error) {
        toast.error('Failed to load workers for selected site.');
        console.error('Error fetching site workers:', error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedShift = shiftTypes.find(s => s.value === formData.shiftType);
    if (!selectedShift) {
      toast.error('Please select a valid shift type.');
      return;
    }

    const payload = {
      siteId: formData.siteId,
      date: formData.date,
      attendanceRecords: [{
        workerId: formData.workerId,
        status: selectedShift.value === 'Absent' || selectedShift.value === 'Leave' ? selectedShift.value : 'Present', // Set status based on shiftType
        shiftType: formData.shiftType,
        multiplier: selectedShift.multiplier,
      }]
    };

    try {
      if (attendanceEntry) {
        await API.put(`/attendance/${attendanceEntry._id}`, {
          status: payload.attendanceRecords[0].status,
          shiftType: payload.attendanceRecords[0].shiftType,
          multiplier: payload.attendanceRecords[0].multiplier,
        });
        toast.success('Attendance entry updated successfully!');
      } else {
        await API.post('/attendance', payload);
        toast.success('Attendance marked successfully!');
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error(`Failed to save attendance: ${error.response?.data?.message || error.message}`);
      console.error('Error saving attendance:', error.response?.data || error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
      {/* Site Selection */}
      <div>
       <label className="block text-sm sm:text-base font-medium text-gray-700">Site</label>
        <select
          name="siteId"
          value={formData.siteId}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1 sm:p-2"
          required
          disabled={!!initialSiteId && !attendanceEntry}
        >
          <option value="">Select Site</option>
          {sites.map(site => (
            <option key={site._id} value={site._id}>
              {site.name}
            </option>
          ))}
        </select>
      </div>

      {/* Worker Selection */}
      <div>
        <label className="block text-sm sm:text-base font-medium text-gray-700">Worker</label>
        <select
          name="workerId"
          value={formData.workerId}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1 sm:p-2"
          required
          disabled={!formData.siteId || !!attendanceEntry} // Disable worker selection on edit
        >
          <option value="">Select Worker</option>
          {workers.map(worker => (
            <option key={worker._id} value={worker._id}>
              {worker.name} ({worker.role})
            </option>
          ))}
        </select>
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm sm:text-base font-medium text-gray-700">Date</label>
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1 sm:p-2"
          required
        />
      </div>

      {/* Shift Type */}
      <div>
        <label className="block text-sm sm:text-base font-medium text-gray-700">Shift Type</label>
        <select
          name="shiftType"
          value={formData.shiftType}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1 sm:p-2"
          required
        >
          <option value="">Select Shift</option>
          {shiftTypes.map(shift => (
            <option key={shift.value} value={shift.value}>
              {shift.label}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="px-3 sm:px-4 py-1 sm:py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 sm:px-4 py-1 sm:py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          {attendanceEntry ? 'Update Attendance' : 'Mark Attendance'}
        </button>
      </div>
    </form>
  );
};

export default AttendanceForm;