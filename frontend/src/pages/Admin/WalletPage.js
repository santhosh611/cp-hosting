import React, { useState, useEffect, useContext } from "react";
import { FaWallet, FaPlus, FaExclamationTriangle, FaChartPie, FaMoneyBillWave, FaTools, FaHardHat, FaBoxOpen, FaEdit, FaTrash } from "react-icons/fa";
import API from "../../api/axios";
import Spinner from "../../components/common/Spinner";
import Drawer from "../../components/common/Drawer";
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import { useDemoData } from '../../context/DemoDataContext';

const WalletPage = () => {
  const { user } = useContext(AuthContext);
  const demoData = useDemoData();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [projects, setProjects] = useState([]);
  const [walletSummary, setWalletSummary] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [sitePayments, setSitePayments] = useState([]);
  const [editingPayment, setEditingPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingToExistingSite, setIsAddingToExistingSite] = useState(false);
  const [formData, setFormData] = useState({
    siteId: '',
    date: '',
    amount: '',
    description: '',
    thresholdType: 'percentage', // 'percentage' or 'cash'
    thresholdPercentage: '80',
    thresholdCash: ''
  });

  useEffect(() => {
    // DEMO MODE: load mock wallet data
    if (user?.isDemo) {
      const demoWallet = demoData.wallet;
      setWalletSummary({
        sites: demoData.projects.map((p, i) => ({
          siteId: p,
          totalFunds: [500000, 300000, 270000][i] || 200000,
          totalExpenses: [395000, 110000, 72000][i] || 100000,
          remaining: [105000, 190000, 198000][i] || 100000,
        })),
        totals: {
          totalFunds: demoWallet.totalCredit,
          totalExpenses: demoWallet.totalDebit,
          totalRemaining: demoWallet.totalBalance,
        }
      });
      setProjects(demoData.projects);
      setSitePayments(demoWallet.transactions);
      setLoading(false);
      return;
    }
    fetchInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Removed fetchInitialData from dependencies to avoid infinite loop

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      console.log('=== STARTING FETCH INITIAL DATA ===');
      
      // First try to get sites
      let sitesData = [];
      try {
        console.log('Attempting to fetch sites from /wallet/sites-for-funds');
        const sitesRes = await API.get("/wallet/sites-for-funds");
        sitesData = sitesRes.data || [];
        console.log('Sites from wallet API:', sitesData);
      } catch (sitesError) {
        console.error('Wallet sites API failed:', sitesError);
        try {
          console.log('Attempting fallback to /projects');
          const projectsRes = await API.get("/projects");
          sitesData = projectsRes.data || [];
          console.log('Sites from projects API:', sitesData);
        } catch (projectsError) {
          console.error('Projects API also failed:', projectsError);
          sitesData = [];
        }
      }
      
      // Then get wallet summary
      let summaryData = { sites: [], totals: { totalFunds: 0, totalExpenses: 0, totalRemaining: 0 } };
      try {
        console.log('Attempting to fetch wallet summary');
        const summaryRes = await API.get("/wallet/summary");
        summaryData = summaryRes.data || summaryData;
        console.log('Wallet summary:', summaryData);
      } catch (summaryError) {
        console.error('Wallet summary API failed:', summaryError);
      }
      
      console.log('Final sites data:', sitesData);
      console.log('Final summary data:', summaryData);
      
      setWalletSummary(summaryData);
      setProjects(sitesData);
      
      // Set first site as selected if available
      if (summaryData.sites && summaryData.sites.length > 0) {
        const firstSite = summaryData.sites[0];
        setSelectedSite(firstSite);
        await fetchSitePayments(firstSite.siteId._id);
      }
      
      console.log('=== FETCH INITIAL DATA COMPLETED ===');
    } catch (err) {
      toast.error("Failed to fetch wallet data.");
      console.error("Failed to fetch wallet data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSitePayments = async (siteId) => {
    try {
      const res = await API.get(`/wallet/site/${siteId}/payments`);
      setSitePayments(res.data);
    } catch (err) {
      console.error("Failed to fetch site payments:", err);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    console.log('Form field changed:', name, value);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting) {
      console.log('Form submission already in progress, ignoring');
      return;
    }
    
    console.log('=== FORM SUBMIT ===');
    console.log('Current formData:', formData);
    console.log('editingPayment:', editingPayment);
    console.log('==================');
    
    // Frontend validation
    if (!formData.siteId) {
      toast.error('Please select a site');
      return;
    }
    
    if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }
    
    // More lenient threshold validation with defaults
    let thresholdValue = 80; // default percentage
    let thresholdCashValue = null;
    
    if (formData.thresholdType === 'percentage') {
      thresholdValue = formData.thresholdPercentage ? parseFloat(formData.thresholdPercentage) : 80;
      if (isNaN(thresholdValue) || thresholdValue < 1 || thresholdValue > 100) {
        toast.error('Please enter a valid threshold percentage between 1 and 100');
        return;
      }
    } else if (formData.thresholdType === 'cash') {
      thresholdCashValue = formData.thresholdCash ? parseFloat(formData.thresholdCash) : null;
      if (!thresholdCashValue || isNaN(thresholdCashValue) || thresholdCashValue <= 0) {
        toast.error('Please enter a valid cash threshold amount greater than 0');
        return;
      }
      // Convert cash to percentage based on amount
      const amountValue = parseFloat(formData.amount);
      if (amountValue > 0 && thresholdCashValue > 0) {
        thresholdValue = (thresholdCashValue / amountValue) * 100;
        if (thresholdValue > 100) {
          toast.error('Cash threshold cannot exceed the allocated amount');
          return;
        }
      }
    }
    
    setIsSubmitting(true);
    
    try {
      if (editingPayment) {
        // Update existing payment
        const updateData = {
          amount: parseFloat(formData.amount),
          thresholdType: formData.thresholdType,
          threshold: thresholdValue, // Always send the calculated threshold percentage
          thresholdCash: formData.thresholdType === 'cash' ? thresholdCashValue : null,
          description: formData.description || ''
        };
        console.log('Updating payment with data:', updateData);
        
        await API.put(`/wallet/payment/${editingPayment._id}`, updateData);
        toast.success("Payment updated successfully!");
        setShowEditForm(false);
        setEditingPayment(null);
      } else {
        // Add new payment
        const addData = {
          siteId: formData.siteId,
          amount: parseFloat(formData.amount),
          thresholdType: formData.thresholdType,
          threshold: thresholdValue, // Always send the calculated threshold percentage
          thresholdCash: formData.thresholdType === 'cash' ? thresholdCashValue : null,
          description: formData.description || ''
        };
        console.log('Adding payment with data:', addData);
        
        // Add timeout to request
        await Promise.race([
          API.post('/wallet/add-funds', addData),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 30000)
          )
        ]);
        
        toast.success("Payment allocated successfully!");
        setShowAddForm(false);
      }
      
      setFormData({ siteId: '', date: '', amount: '', description: '', threshold: '80' });
      setIsAddingToExistingSite(false);
      
      // Refresh data
      await fetchInitialData();
    } catch (err) {
      console.error('Form submit error:', err);
      console.error('Error response:', err.response?.data);
      
      let errorMessage = "Failed to save payment.";
      
      if (err.message === 'Request timeout') {
        errorMessage = "Request timed out. The payment may have been processed. Please refresh the page to check.";
      } else if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || "Invalid data provided.";
      } else if (err.response?.status === 401) {
        errorMessage = "Authentication failed. Please login again.";
      } else if (err.response?.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSiteSelect = async (site) => {
    setSelectedSite(site);
    if (site?.siteId?._id) {
      await fetchSitePayments(site.siteId._id);
    }
  };

  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setFormData({
      siteId: payment?.siteId?._id || '',
      amount: (payment?.amount || 0).toString(),
      thresholdType: payment?.thresholdType || 'percentage',
      thresholdPercentage: payment?.thresholdType === 'percentage' ? (payment?.threshold || 80).toString() : '80',
      thresholdCash: payment?.thresholdType === 'cash' ? (payment?.thresholdCash || '').toString() : '',
      description: payment?.description || '',
      date: ''
    });
    setShowEditForm(true);
  };

  const handleAddPayment = (siteId = null) => {
    // Reset submission state
    setIsSubmitting(false);
    
    if (siteId) {
      setIsAddingToExistingSite(true);
      setFormData({
        siteId: siteId,
        amount: '',
        thresholdType: 'percentage',
        thresholdPercentage: '80',
        thresholdCash: '',
        description: '',
        date: ''
      });
    } else {
      setIsAddingToExistingSite(false);
      setFormData({ siteId: '', date: '', amount: '', description: '', thresholdType: 'percentage', thresholdPercentage: '80', thresholdCash: '' });
    }
    setShowAddForm(true);
  };

  const handleDeletePayment = async (paymentId, paymentNumber) => {
    console.log('Attempting to delete payment:', { paymentId, paymentNumber });
    
    // Simple confirmation for permanent delete
    const confirmDelete = window.confirm(
      `Are you sure you want to delete Payment #${paymentNumber}?\n\n` +
      `⚠️ This will PERMANENTLY remove the payment from the database.\n` +
      `This action cannot be undone.`
    );
    
    if (!confirmDelete) {
      return;
    }

    try {
      console.log('Sending DELETE request with hardDelete=true');
      const response = await API.delete(`/wallet/payment/${paymentId}?hardDelete=true`);
      
      toast.success(`Payment #${paymentNumber} permanently deleted!`);
      
      // Refresh data to see updated payment numbers
      await fetchInitialData();
    } catch (err) {
      console.error('Delete payment error:', err);
      const errorMessage = err.response?.data?.message || "Failed to delete payment.";
      toast.error(errorMessage);
    }
  };

  const getThresholdColor = (usagePercentage, threshold) => {
    if (usagePercentage >= threshold) return 'text-red-600';
    if (usagePercentage >= threshold * 0.8) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressBarColor = (usagePercentage, threshold) => {
    if (usagePercentage >= threshold) return 'bg-red-500';
    if (usagePercentage >= threshold * 0.8) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 flex items-center">
        <FaWallet className="mr-3 text-indigo-600" /> Client Fund / Wallet
      </h2>

      {/* Debug Information (can be removed in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-sm font-semibold text-yellow-800 mb-2">Debug Info:</h4>
          <p className="text-xs text-yellow-700">Projects loaded: {projects ? projects.length : 'null'}</p>
          <p className="text-xs text-yellow-700">Wallet sites: {walletSummary?.sites ? walletSummary.sites.length : 'null'}</p>
          <p className="text-xs text-yellow-700">Loading: {loading ? 'true' : 'false'}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] py-12"> 
          <Spinner size="lg" type="logo" color="#2F3C7E" />
          <span className="ml-3 mt-4 text-sm text-gray-500">Loading wallet data...</span>
        </div>
      ) : (
        <>
          {/* Add Funds Button */}
          {!user?.isDemo && (
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => handleAddPayment()}
                className="flex items-center justify-center px-4 py-2 rounded-md transition-colors duration-200 text-sm bg-green-600 text-white hover:bg-green-700 shadow"
              >
                <FaPlus className="mr-2" />
                Add Client Funds
              </button>
            </div>
          )}

      {/* Overall Summary */}
      {walletSummary && (
        <div className="bg-blue-50 p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-semibold text-blue-800 mb-4">Overall Wallet Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-blue-100 p-4 rounded-lg shadow-sm">
              <p className="text-sm text-blue-700">Total Allocated Funds</p>
              <p className="text-2xl font-bold text-blue-900">₹{(walletSummary?.totals?.totalFunds || 0).toLocaleString()}</p>
            </div>
            <div className="bg-red-100 p-4 rounded-lg shadow-sm">
              <p className="text-sm text-red-700">Total Expenses</p>
              <p className="text-2xl font-bold text-red-900">₹{(walletSummary?.totals?.totalExpenses || 0).toLocaleString()}</p>
            </div>
            <div className="bg-green-100 p-4 rounded-lg shadow-sm">
              <p className="text-sm text-green-700">Remaining Balance</p>
              <p className="text-2xl font-bold text-green-900">₹{(walletSummary?.totals?.totalRemaining || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Site Selection Toggle */}
      {walletSummary && walletSummary.sites && walletSummary.sites.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Select Site to View Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {walletSummary?.sites?.map((site) => {
              const isSelected = selectedSite && selectedSite._id === site._id;
              const bgColor = isSelected ? 'bg-indigo-100 border-indigo-500' : 'bg-gray-50 border-gray-200';
              const thresholdColor = getThresholdColor(site?.usagePercentage || 0, site?.threshold || 80);
              
              return (
                <div
                  key={site._id}
                  onClick={() => handleSiteSelect(site)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${bgColor}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-800">{site?.siteId?.name || 'Unknown Site'}</h4>
                    {site?.isThresholdExceeded && (
                      <FaExclamationTriangle className="text-red-500" title="Threshold exceeded!" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{site?.siteId?.location || 'Unknown Location'}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Allocated:</span>
                      <span className="font-medium">₹{(site?.totalAllocatedAmount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Used:</span>
                      <span className={`font-medium ${thresholdColor}`}>₹{(site?.expenses?.total || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Usage:</span>
                      <span className={`font-medium ${thresholdColor}`}>{site?.usagePercentage || 0}%</span>
                    </div>
                    {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(site?.usagePercentage || 0, site?.threshold || 80)}`}
                        style={{ width: `${Math.min(site?.usagePercentage || 0, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Site Details */}
      {selectedSite && (
        <div className="bg-gray-50 p-6 rounded-lg shadow-md">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
              <FaChartPie className="mr-2 text-indigo-600" />
              {selectedSite?.siteId?.name || 'Unknown Site'} - Expense Breakdown
            </h3>
          </div>
          
          {/* Budget Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-semibold text-gray-700 mb-3">Budget Overview</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Allocated:</span>
                  <span className="font-medium text-blue-600">₹{(selectedSite?.totalAllocatedAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Used:</span>
                  <span className={`font-medium ${getThresholdColor(selectedSite?.usagePercentage || 0, selectedSite?.threshold || 80)}`}>
                    ₹{(selectedSite?.expenses?.total || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Remaining:</span>
                  <span className={`font-medium ${(selectedSite?.remainingBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{(selectedSite?.remainingBalance || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Usage Percentage:</span>
                  <span className={`font-medium ${getThresholdColor(selectedSite?.usagePercentage || 0, selectedSite?.threshold || 80)}`}>
                    {selectedSite?.usagePercentage || 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Threshold:</span>
                  <span className="font-medium text-gray-700">{selectedSite?.threshold || 80}%</span>
                </div>
              </div>
            </div>
            
            {/* Threshold Warning */}
            {selectedSite?.isThresholdExceeded && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <FaExclamationTriangle className="text-red-500 mr-2" />
                  <h4 className="font-semibold text-red-700">Budget Threshold Exceeded!</h4>
                </div>
                <p className="text-red-600 text-sm">
                  This site has exceeded the set threshold of {selectedSite?.threshold || 80}%. 
                  Current usage is at {selectedSite?.usagePercentage || 0}%.
                </p>
              </div>
            )}
          </div>

          {/* Expense Categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <FaBoxOpen className="text-orange-500 text-2xl" />
                <span className="text-sm text-gray-500">Materials</span>
              </div>
              <p className="text-xl font-bold text-gray-800">₹{(selectedSite?.expenses?.material || 0).toLocaleString()}</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <FaMoneyBillWave className="text-green-500 text-2xl" />
                <span className="text-sm text-gray-500">Advances</span>
              </div>
              <p className="text-xl font-bold text-gray-800">₹{(selectedSite?.expenses?.advance || 0).toLocaleString()}</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <FaTools className="text-blue-500 text-2xl" />
                <span className="text-sm text-gray-500">Rent</span>
              </div>
              <p className="text-xl font-bold text-gray-800">₹{(selectedSite?.expenses?.rent || 0).toLocaleString()}</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <FaHardHat className="text-purple-500 text-2xl" />
                <span className="text-sm text-gray-500">Salaries</span>
              </div>
              <p className="text-xl font-bold text-gray-800">₹{(selectedSite?.expenses?.salary || 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Payments List */}
          {sitePayments.length > 0 && (
            <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-800">Payment History</h4>
                <div className="flex gap-2">
                  {!user?.isDemo && (
                    <button
                      onClick={() => handleAddPayment(selectedSite?.siteId?._id)}
                      className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    >
                      <FaPlus className="mr-1" />
                      Add Payment
                    </button>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                {sitePayments?.map((payment) => (
                  <div key={payment._id} className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-sm font-medium">
                            Payment #{payment?.paymentNumber || 1}
                          </span>
                          <span className="text-lg font-bold text-gray-800">
                            ₹{(payment?.amount || 0).toLocaleString()}
                          </span>
                          <span className="text-sm text-gray-500">
                            {payment?.thresholdType === 'cash' ? (
                              `Alert at: ₹${(payment?.thresholdCash || 0).toLocaleString()}`
                            ) : (
                              `Threshold: ${payment?.threshold || 80}%`
                            )}
                          </span>
                        </div>
                        {payment?.description && (
                          <p className="text-sm text-gray-600 mb-1">{payment.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Added: {payment?.allocatedDate ? new Date(payment.allocatedDate).toLocaleDateString() : 'N/A'}</span>
                          <span>By: {payment?.allocatedBy?.name || 'Admin'}</span>
                        </div>
                      </div>
                      {!user?.isDemo ? (
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleEditPayment(payment)}
                            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                          >
                            <FaEdit className="mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePayment(payment._id, payment?.paymentNumber || 1)}
                            className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                          >
                            <FaTrash className="mr-1" />
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic ml-4">View Only</span>
                      )}
                    </div>
                  </div>
                )) || []}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No sites message */}
      {walletSummary && (!walletSummary.sites || walletSummary.sites.length === 0) && (
        <div className="text-center py-8">
          <FaWallet className="mx-auto text-gray-400 text-4xl mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No Sites with Allocated Funds</h3>
          <p className="text-gray-500">Start by allocating funds to your construction sites.</p>
        </div>
      )}

      {/* Add/Edit Funds Form Drawer */}
      <Drawer
        isOpen={showAddForm}
        onClose={() => {
          setShowAddForm(false);
          setIsAddingToExistingSite(false);
          setIsSubmitting(false);
          setFormData({ siteId: '', date: '', amount: '', description: '', thresholdType: 'percentage', thresholdPercentage: '80', thresholdCash: '' });
        }}
        title={isAddingToExistingSite ? "Add New Payment" : "Add Client Funds"}
      >
        <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label htmlFor="siteId" className="block text-sm font-medium text-gray-700">Site</label>
              {loading ? (
                <div className="mt-1">
                  <Spinner size="sm" type="logo" />
                </div>
              ) : (
                <>
                  <select
                    id="siteId"
                    name="siteId"
                    value={formData.siteId}
                    onChange={handleFormChange}
                    required
                    disabled={isAddingToExistingSite}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                      isAddingToExistingSite ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="">Select a Site</option>
                    {projects && projects.length > 0 ? (
                      projects.map(site => (
                        <option key={site?._id} value={site?._id}>
                          {site?.name || 'Unknown Site'} ({site?.location || 'No Location'})
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No sites available</option>
                    )}
                  </select>
                  {projects && projects.length === 0 && !loading && (
                    <div className="mt-1">
                      <p className="text-sm text-red-500 mb-2">No sites found. Please create a site first.</p>
                      <button
                        type="button"
                        onClick={() => {
                          console.log('Manual refresh clicked');
                          fetchInitialData();
                        }}
                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                      >
                        Refresh Sites
                      </button>
                    </div>
                  )}
                </>
              )}
              {isAddingToExistingSite && (
                <p className="text-sm text-gray-500 mt-1">Adding payment to selected site</p>
              )}
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount (₹)</label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleFormChange}
                required
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="e.g., 900000 for 9 lakhs"
              />
            </div>
            <div>
              <label htmlFor="thresholdType" className="block text-sm font-medium text-gray-700">Threshold Type</label>
              <select
                id="thresholdType"
                name="thresholdType"
                value={formData.thresholdType}
                onChange={handleFormChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="cash">Cash Amount (₹)</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">Choose how to set the spending threshold</p>
            </div>
            {formData.thresholdType === 'percentage' ? (
              <div>
                <label htmlFor="thresholdPercentage" className="block text-sm font-medium text-gray-700">Threshold Percentage (%)</label>
                <input
                  type="number"
                  id="thresholdPercentage"
                  name="thresholdPercentage"
                  value={formData.thresholdPercentage || ''}
                  onChange={handleFormChange}
                  min="1"
                  max="100"
                  step="1"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="80"
                />
                <p className="text-sm text-gray-500 mt-1">Alert when expenses reach this percentage of allocated amount (default: 80%)</p>
              </div>
            ) : (
              <div>
                <label htmlFor="thresholdCash" className="block text-sm font-medium text-gray-700">Threshold Cash Amount (₹)</label>
                <input
                  type="number"
                  id="thresholdCash"
                  name="thresholdCash"
                  value={formData.thresholdCash || ''}
                  onChange={handleFormChange}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="e.g., 800000 for 8 lakhs"
                />
                <p className="text-sm text-gray-500 mt-1">Alert when expenses reach this cash amount</p>
              </div>
            )}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                rows="3"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Optional description for this fund allocation"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isSubmitting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                isAddingToExistingSite ? 'Add Payment' : 'Allocate Funds'
              )}
            </button>
          </form>
        </div>
      </Drawer>

      {/* Edit Payment Form Drawer */}
      <Drawer
        isOpen={showEditForm}
        onClose={() => {
          setShowEditForm(false);
          setEditingPayment(null);
          setIsSubmitting(false);
          setFormData({ siteId: '', date: '', amount: '', description: '', thresholdType: 'percentage', thresholdPercentage: '80', thresholdCash: '' });
        }}
        title={editingPayment ? `Edit Payment #${editingPayment?.paymentNumber || 1}` : "Edit Payment"}
      >
        <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {editingPayment && (
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Site:</strong> {editingPayment?.siteId?.name || 'Unknown Site'}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Payment:</strong> #{editingPayment?.paymentNumber || 1}
                </p>
              </div>
            )}
            
            <div>
              <label htmlFor="editAmount" className="block text-sm font-medium text-gray-700">Amount (₹)</label>
              <input
                type="number"
                id="editAmount"
                name="amount"
                value={formData.amount}
                onChange={handleFormChange}
                required
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="e.g., 500000 for 5 lakhs"
              />
            </div>
            <div>
              <label htmlFor="editThresholdType" className="block text-sm font-medium text-gray-700">Threshold Type</label>
              <select
                id="editThresholdType"
                name="thresholdType"
                value={formData.thresholdType}
                onChange={handleFormChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="cash">Cash Amount (₹)</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">Choose how to set the spending threshold</p>
            </div>
            {formData.thresholdType === 'percentage' ? (
              <div>
                <label htmlFor="editThresholdPercentage" className="block text-sm font-medium text-gray-700">Threshold Percentage (%)</label>
                <input
                  type="number"
                  id="editThresholdPercentage"
                  name="thresholdPercentage"
                  value={formData.thresholdPercentage || ''}
                  onChange={handleFormChange}
                  min="1"
                  max="100"
                  step="1"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="80"
                />
                <p className="text-sm text-gray-500 mt-1">Alert when expenses reach this percentage (default: 80%)</p>
              </div>
            ) : (
              <div>
                <label htmlFor="editThresholdCash" className="block text-sm font-medium text-gray-700">Threshold Cash Amount (₹)</label>
                <input
                  type="number"
                  id="editThresholdCash"
                  name="thresholdCash"
                  value={formData.thresholdCash || ''}
                  onChange={handleFormChange}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="e.g., 800000 for 8 lakhs"
                />
                <p className="text-sm text-gray-500 mt-1">Alert when expenses reach this cash amount</p>
              </div>
            )}
            <div>
              <label htmlFor="editDescription" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="editDescription"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                rows="3"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Optional description for this payment"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isSubmitting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </div>
              ) : (
                'Update Payment'
              )}
            </button>
          </form>
        </div>
      </Drawer>
        </>
      )}
    </div>
  );
};

export default WalletPage;
