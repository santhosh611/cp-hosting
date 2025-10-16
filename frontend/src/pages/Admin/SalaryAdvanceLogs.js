import React, { useEffect, useState, useCallback, useMemo } from 'react';
import API from '../../api/axios';
import { toast, ToastContainer } from 'react-toastify';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import AdvanceForm from '../../components/supervisor/AdvanceForm';
import { FaFilter, FaPlus, FaEdit, FaTrash, FaMoneyBillAlt, FaCheckCircle, FaTimesCircle, FaCheckDouble, FaBan } from 'react-icons/fa';

const SalaryAdvanceLogs = () => {
  const today = new Date().toISOString().split('T')[0];

  const [salaryLogs, setSalaryLogs] = useState([]);
  const [advanceLogs, setAdvanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [filters, setFilters] = useState({
    siteId: '',
    workerId: '',
    startDate: today,
    endDate: today,
    paidStatus: ''
  });

  const [workersForFilter, setWorkersForFilter] = useState([]);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState(null);
  const [selectedSalaryLogIds, setSelectedSalaryLogIds] = useState(new Set());
  const [isSelectAllChecked, setIsSelectAllChecked] = useState(false);

  // This function now handles both initial load and manual filtering
  const getLogs = useCallback(async (currentFilters) => {
    setLoading(true);
    try {
      // Step 1: Trigger the backend to calculate salaries for the given period.
      await API.post('/reports/calculate-weekly-salaries', {
        startDate: currentFilters.startDate,
        endDate: currentFilters.endDate,
        siteId: currentFilters.siteId || undefined,
      });

      // Step 2: Fetch the newly calculated salary logs.
      const { siteId, workerId, startDate, endDate, paidStatus } = currentFilters;
      const salaryParams = { siteId, workerId, startDate, endDate, paidStatus };
      const salaryRes = await API.get('/reports/salary-logs', { params: salaryParams });
      setSalaryLogs(salaryRes.data);

      // Step 3: Fetch related advance logs for the same period.
      const advanceParams = { siteId, workerId, startDate, endDate };
      const advanceRes = await API.get('/advances', { params: advanceParams });
      setAdvanceLogs(advanceRes.data);

      setSelectedSalaryLogIds(new Set());
      setIsSelectAllChecked(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      const sitesRes = await API.get('/projects');
      setSites(sitesRes.data);
      const workersRes = await API.get('/workers');
      const allWorkers = workersRes.data.map(w => ({ ...w, isTemporary: false }));
      setWorkers(allWorkers);
      setWorkersForFilter(allWorkers);
    } catch (error) {
      toast.error('Failed to load initial site and worker data.');
    }
  }, []);

  const fetchWorkersForSite = useCallback(async (siteId) => {
    if (!siteId) {
      setWorkersForFilter(workers.map(w => ({ ...w, isTemporary: false })));
      return;
    }
    try {
      const siteRes = await API.get(`/projects/${siteId}`);
      const regularWorkers = siteRes.data.assignedWorkers.map(aw => ({ ...aw.workerId, isTemporary: false }));
      const tempRes = await API.get(`/stranger-workers?siteId=${siteId}`);
      const uniqueTempWorkers = tempRes.data.reduce((acc, current) => {
        if (!acc.some(item => item.name === current.name)) {
          acc.push(current);
        }
        return acc;
      }, []);
      const tempWorkersForDropdown = uniqueTempWorkers.map(sw => ({ ...sw, isTemporary: true }));
      setWorkersForFilter([...regularWorkers, ...tempWorkersForDropdown]);
    } catch (error) {
      setWorkersForFilter([]);
    }
  }, [workers]);

  useEffect(() => {
    fetchInitialData();
    getLogs({ startDate: today, endDate: today });

    const handleAttendanceUpdate = () => getLogs(filters);

    window.addEventListener('attendanceChanged', handleAttendanceUpdate);
    return () => {
      window.removeEventListener('attendanceChanged', handleAttendanceUpdate);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchWorkersForSite(filters.siteId);
  }, [filters.siteId, workers, fetchWorkersForSite]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, ...(name === 'siteId' && { workerId: '' }) }));
  };

  const handleApplyFilters = () => {
    if (!filters.startDate || !filters.endDate) {
      toast.error('Please select a start and end date.');
      return;
    }
    getLogs(filters);
  };

  const handleResetFilters = () => {
    const newFilters = { siteId: '', workerId: '', startDate: today, endDate: today, paidStatus: '' };
    setFilters(newFilters);
    getLogs(newFilters);
    fetchWorkersForSite('');
  };

  const handleTogglePaidStatus = async (salaryLogId, currentPaidStatus) => {
    const newPaidStatus = !currentPaidStatus;
    const confirmation = window.confirm(`Are you sure you want to mark this salary as ${newPaidStatus ? 'PAID' : 'UNPAID'}?`);
    if (confirmation) {
      try {
        await API.put(`/reports/salary-logs/${salaryLogId}/paid`, { paid: newPaidStatus });
        toast.success(`Salary marked as ${newPaidStatus ? 'PAID' : 'UNPAID'}!`);

        setSalaryLogs(prevLogs =>
          prevLogs.map(log =>
            log._id === salaryLogId ? { ...log, paid: newPaidStatus } : log
          )
        );

      } catch (error) {
        toast.error(`Failed to update paid status: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const handleCheckboxChange = (id) => {
    setSelectedSalaryLogIds(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) newSelected.delete(id);
      else newSelected.add(id);
      return newSelected;
    });
  };

  const handleSelectAllChange = (e) => {
    const { checked } = e.target;
    setIsSelectAllChecked(checked);
    setSelectedSalaryLogIds(new Set(checked ? aggregatedSalaryLogs.map(log => log._id) : []));
  };

  const handleMarkSelected = async (status) => {
    if (selectedSalaryLogIds.size === 0) return toast.info('No salaries selected.');
    if (window.confirm(`Mark ${selectedSalaryLogIds.size} salaries as ${status ? 'PAID' : 'UNPAID'}?`)) {
      setLoading(true);
      try {
        await Promise.all(
          Array.from(selectedSalaryLogIds).map(id => API.put(`/reports/salary-logs/${id}/paid`, { paid: status }))
        );
        toast.success(`${selectedSalaryLogIds.size} salaries updated.`);

        setSalaryLogs(prevLogs =>
          prevLogs.map(log =>
            selectedSalaryLogIds.has(log._id) ? { ...log, paid: status } : log
          )
        );
        setSelectedSalaryLogIds(new Set());
        setIsSelectAllChecked(false);

      } catch (error) {
        toast.error(`Failed to update salaries: ${error.response?.data?.message || error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddAdvance = () => {
    setSelectedAdvance(null);
    setIsAdvanceModalOpen(true);
  };

  const handleEditAdvance = (advance) => {
    setSelectedAdvance(advance);
    setIsAdvanceModalOpen(true);
  };

  const handleDeleteAdvance = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await API.delete(`/advances/${id}`);
        toast.success('Advance entry deleted!');
        getLogs(filters);
      } catch (error) {
        toast.error(`Failed to delete advance: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const handleSaveAdvance = () => {
    setIsAdvanceModalOpen(false);
    getLogs(filters);
  };

  const aggregatedSalaryLogs = useMemo(() => {
    const uniqueLogs = new Map();
    salaryLogs.forEach(log => {
      const key = `${log.workerId?._id || log.temporaryWorkerName}-${log.siteId?._id}-${log.weekStart}`;
      if (!uniqueLogs.has(key)) {
        uniqueLogs.set(key, log);
      }
    });
    return Array.from(uniqueLogs.values());
  }, [salaryLogs]);


  const isDailyView = filters.startDate === filters.endDate;
  const salaryTableHeaders = [
    <input type="checkbox" checked={isSelectAllChecked} onChange={handleSelectAllChange} />,
    'WORKER',
    'SITE',
    'START DATE',
    'END DATE',
    'ATT. DAYS',
    'GROSS SALARY',
    'ADVANCE DEDUCTED',
    'NET SALARY',
    'PAID',
    'ACTIONS'
  ];

  const advanceTableHeaders = ['WORKER NAME', 'SITE', 'AMOUNT', 'DATE', 'REASON', 'RECORDED BY', 'ACTIONS'];

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Salary & Advance Logs</h2>

    {loading && (
      <div className="flex items-center justify-center h-48">
        {/* You can replace this with your Spinner component if you have one, like: */}
        {/* <Spinner size="lg" type="logo" color="#2F3C7E" /> */}
        <p className="text-xl text-gray-600">Loading data...</p>
      </div>
    )}
      <div className="mb-4 sm:mb-6 p-2 sm:p-4 bg-gray-50 rounded-lg shadow-sm">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-3 sm:mb-4 flex items-center">
          <FaFilter className="mr-2 text-indigo-600" /> Filters
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4">
          <select name="siteId" value={filters.siteId} onChange={handleFilterChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-1 sm:p-2">
            <option value="">All Sites</option>
            {sites.map(site => (<option key={site._id} value={site._id}>{site.name}</option>))}
          </select>
          <select name="workerId" value={filters.workerId} onChange={handleFilterChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-1 sm:p-2">
            <option value="">All Workers</option>
            {workersForFilter.map(worker => (<option key={worker._id} value={worker._id}>{worker.name} {worker.isTemporary ? '(Temp)' : `(${worker.role})`}</option>))}
          </select>
          <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-1 sm:p-2" />
          <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-1 sm:p-2" />
          <select name="paidStatus" value={filters.paidStatus} onChange={handleFilterChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-1 sm:p-2">
            <option value="">All</option>
            <option value="true">Paid</option>
            <option value="false">Unpaid</option>
          </select>
        </div>
        <div className="mt-3 sm:mt-4 flex justify-end space-x-3">
          <button onClick={handleApplyFilters} className="px-3 sm:px-4 py-1 sm:py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Apply Filters</button>
          <button onClick={handleResetFilters} className="px-3 sm:px-4 py-1 sm:py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">Reset Filters</button>
        </div>
      </div>

      <div className="mb-6 sm:mb-8">
        <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
          <FaMoneyBillAlt className="mr-3 text-green-600" /> {isDailyView ? "Today's Salary Report" : "Weekly Salary Report"}
        </h3>
        <div className="mb-4 sm:mb-6 flex justify-between items-center">
          <div className="flex space-x-3">
            <button onClick={() => handleMarkSelected(true)} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700" disabled={selectedSalaryLogIds.size === 0}>
              <FaCheckDouble className="mr-2" /> Mark as Paid
            </button>
            <button onClick={() => handleMarkSelected(false)} className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md shadow hover:bg-red-700" disabled={selectedSalaryLogIds.size === 0}>
              <FaBan className="mr-2" /> Mark as Unpaid
            </button>
          </div>
        </div>
        <Table
          headers={salaryTableHeaders}
          data={aggregatedSalaryLogs}
          emptyMessage="No salary logs found for the selected criteria."
          renderRow={(log) => {
            // MODIFIED: Correctly handle date display by using UTC dates
            const startDate = new Date(log.weekStart).toLocaleDateString('en-GB', { timeZone: 'UTC' });
            const endDate = new Date(log.weekEnd).toLocaleDateString('en-GB', { timeZone: 'UTC' });

            return (
              <tr key={log._id}>
                <td className="px-5 py-3 border-b text-sm"><input type="checkbox" checked={selectedSalaryLogIds.has(log._id)} onChange={() => handleCheckboxChange(log._id)} /></td>
                <td className="px-5 py-3 border-b text-sm">{log.workerId?.name || log.temporaryWorkerName}</td>
                <td className="px-5 py-3 border-b text-sm">{log.siteId?.name}</td>
                <td className="px-5 py-3 border-b text-sm">{startDate}</td>
                <td className="px-5 py-3 border-b text-sm">{endDate}</td>
                <td className="px-5 py-3 border-b text-sm">{log.totalAttendanceDays.toFixed(1)}</td>
                <td className="px-5 py-3 border-b text-sm">{`₹${log.grossSalary.toFixed(2)}`}</td>
                <td className="px-5 py-3 border-b text-sm">{`₹${log.totalAdvanceDeducted.toFixed(2)}`}</td>
                <td className="px-5 py-3 border-b text-sm">{`₹${log.netSalary.toFixed(2)}`}</td>
                <td className="px-5 py-3 border-b text-sm">{log.paid ? <FaCheckCircle className="text-green-500" /> : <FaTimesCircle className="text-red-500" />}</td>
                <td className="px-5 py-3 border-b text-sm"><button onClick={() => handleTogglePaidStatus(log._id, log.paid)} className={`px-2 py-1 text-xs rounded-md ${log.paid ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>{log.paid ? 'Mark Unpaid' : 'Mark Paid'}</button></td>
              </tr>
            );
          }}
        />
      </div>
      
      <div>
        <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
          <FaMoneyBillAlt className="mr-3 text-purple-600" /> Advance Payment Logs
        </h3>
        <div className="mb-4 sm:mb-6 flex justify-end">
          <button onClick={handleAddAdvance} className="flex items-center px-3 sm:px-4 py-1 sm:py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700">
            <FaPlus className="mr-2" /> Add New Advance
          </button>
        </div>
        <Table
          headers={advanceTableHeaders}
          data={advanceLogs}
          emptyMessage="No advance payment logs found."
          renderRow={log => (
            <tr key={log._id}>
              <td className="px-5 py-3 border-b text-sm">{log.workerId?.name || log.temporaryWorkerName}</td>
              <td className="px-5 py-3 border-b text-sm">{log.siteId?.name}</td>
              <td className="px-5 py-3 border-b text-sm">{`₹${log.amount.toFixed(2)}`}</td>
              <td className="px-5 py-3 border-b text-sm">{new Date(log.date).toLocaleDateString('en-GB')}</td>
              <td className="px-5 py-3 border-b text-sm">{log.reason}</td>
              <td className="px-5 py-3 border-b text-sm">{log.recordedBy?.name}</td>
              <td className="px-5 py-3 border-b text-sm flex space-x-2">
                <button onClick={() => handleEditAdvance(log)} className="text-blue-600 hover:text-blue-800"><FaEdit /></button>
                <button onClick={() => handleDeleteAdvance(log._id)} className="text-red-600 hover:text-red-800"><FaTrash /></button>
              </td>
            </tr>
          )}
        />
      </div>

      <Modal isOpen={isAdvanceModalOpen} onClose={() => setIsAdvanceModalOpen(false)} title={selectedAdvance ? 'Edit Advance Entry' : 'Add New Advance Entry'} size="md">
        <AdvanceForm advanceEntry={selectedAdvance} onSave={handleSaveAdvance} onClose={() => setIsAdvanceModalOpen(false)} siteId={filters.siteId} />
      </Modal>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
};

export default SalaryAdvanceLogs;
