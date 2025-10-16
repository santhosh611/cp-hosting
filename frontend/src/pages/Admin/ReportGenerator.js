// contract/frontend/src/pages/Admin/ReportGenerator.js
import React, { useEffect, useState } from 'react';
import API from '../../api/axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaFilePdf, FaFileExcel, FaFilter } from 'react-icons/fa'; // MODIFIED: Import FaFileExcel
import * as XLSX from 'xlsx'; // MODIFIED: Import xlsx

const ReportGenerator = () => {
  const [sites, setSites] = useState([]);
  const [filters, setFilters] = useState({
    siteId: '',
    startDate: '',
    endDate: '',
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showExcelOptions, setShowExcelOptions] = useState(false); // MODIFIED: State for excel options

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const res = await API.get('/projects');
        setSites(res.data);
      } catch (error) {
        toast.error('Failed to load sites for report generation.');
        console.error('Error fetching sites:', error);
      }
    };
    fetchSites();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleExcelOptionClick = () => {
    setShowExcelOptions(!showExcelOptions);
  };

  const generateReport = async (format, reportType) => { // MODIFIED: Added reportType parameter
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ ...filters, format, reportType }).toString(); // MODIFIED: Add reportType to params
      const res = await API.get(`/reports/generate?${params}`, {
        responseType: format === 'pdf' ? 'blob' : 'json',
      });

      if (format === 'pdf') {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'contractor_report.pdf');
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('PDF report generated and downloaded!');
      } else if (format === 'xlsx') {
        // MODIFIED: Handle Excel download
        const data = res.data;
        if (!data || data.length === 0) {
          toast.info('No data found for the selected filters.');
          setLoading(false);
          return;
        }

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, reportType.charAt(0).toUpperCase() + reportType.slice(1));
        XLSX.writeFile(workbook, `${reportType}_report.xlsx`);
        toast.success('Excel report generated and downloaded!');
      } else {
        setReportData(res.data);
        toast.success('Report generated successfully!');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to generate report.';
      setError(msg);
      toast.error(msg);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
       <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Report Generator</h2>

       <div className="mb-4 sm:mb-6 p-2 sm:p-4 bg-gray-50 rounded-lg shadow-sm">
       <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-3 sm:mb-4 flex items-center">
          <FaFilter className="mr-2 text-indigo-600" /> Filters & Options
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Site</label>
            <select
                name="siteId"
                value={filters.siteId}
                onChange={handleFilterChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1 sm:p-2"
              >
                <option value="" disabled>
                  Select Site
                </option>
                {sites.map((site) => (
                  <option key={site._id} value={site._id}>
                    {site.name}
                  </option>
                ))}
              </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1 sm:p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1 sm:p-2"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
        <button
          onClick={() => generateReport('pdf')}
          disabled={loading || !filters.startDate || !filters.endDate}
          className="flex items-center px-3 sm:px-4 py-1 sm:py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          <FaFilePdf className="mr-2" />
          {loading ? 'Generating...' : 'Generate PDF'}
        </button>
        
        {/* MODIFIED: Excel Button */}
        <div className="relative">
            <button
              onClick={handleExcelOptionClick}
              disabled={loading || !filters.startDate || !filters.endDate}
              className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <FaFileExcel className="mr-2" /> Generate Excel
            </button>
            {showExcelOptions && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <button
                  onClick={() => generateReport('xlsx', 'total_summary')}
                  className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
                >
                  Total Summary
                </button>
                <button
                  onClick={() => generateReport('xlsx', 'salary')}
                  className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
                >
                  Salary
                </button>
                <button
                  onClick={() => generateReport('xlsx', 'advances')}
                  className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
                >
                  Advances
                </button>
                <button
                  onClick={() => generateReport('xlsx', 'rent')}
                  className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
                >
                  Rent
                </button>

                <button
                  onClick={() => generateReport('xlsx', 'materials')}
                  className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
                >
                  Material Logs
                  
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading && <div className="p-2 sm:p-4 text-center">Generating report...</div>}
      {error && <div className="p-2 sm:p-4 text-center text-red-600">Error: {error}</div>}

      {reportData && (
        <div className="mt-6 sm:mt-8 bg-gray-50 p-4 sm:p-6 rounded-lg shadow-md">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Generated Report (JSON Preview)</h3>
          <pre className="bg-gray-100 p-2 sm:p-4 rounded-md overflow-x-auto text-xs sm:text-sm">
            {JSON.stringify(reportData, null, 2)}
          </pre>
          <p className="mt-2 sm:mt-4 text-gray-600">
            For a formatted report, please use the PDF option.
          </p>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
};

export default ReportGenerator;
