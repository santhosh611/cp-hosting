import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import { FaArrowLeft } from 'react-icons/fa';
import Spinner from '../../components/common/Spinner'; // Importing custom Spinner component

const EditRentPage = () => {
  const { rentId } = useParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    site: '',
    amount: '',
    toolsDescription: '',
    rentDate: '',
  });

  useEffect(() => {
    const fetchRentData = async () => {
      try {
        const { data: rentData } = await API.get(`/rent/${rentId}`);
        const { data: projectsData } = await API.get('/projects');
        
        setProjects(projectsData);
        
        const formattedDate = rentData.rentDate ? new Date(rentData.rentDate).toISOString().split('T')[0] : '';
        setFormData({
          site: rentData.site._id,
          amount: rentData.amount,
          toolsDescription: rentData.toolsDescription,
          rentDate: formattedDate,
        });
        setLoading(false);
      } catch (error) {
        toast.error("Failed to fetch rent data.");
        navigate('/admin/rent');
      }
    };
    fetchRentData();
  }, [rentId, navigate]);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/rent/${rentId}`, formData);
      toast.success("Rent entry updated successfully!");
      navigate('/admin/rent');
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update entry.");
    }
  };

  if (loading) {
    // Replaced "Loading projects..." text with the Spinner component
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)]"> 
        <Spinner size="lg" type="logo" color="#2F3C7E" /> {/* Using your custom Spinner with 'logo' type */}
        <span className="ml-3 mt-4 text-lg text-gray-700">Loading...</span>
      </div>
    );
  }
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Edit Rent Entry</h2>
        <Link to="/admin/rent" className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
          <FaArrowLeft className="mr-2" /> Back to Rent Management
        </Link>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select name="site" value={formData.site} onChange={handleFormChange} className="p-2 border rounded-md" required>
            <option value="">Select Site*</option>
            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <input type="date" name="rentDate" value={formData.rentDate} onChange={handleFormChange} className="p-2 border rounded-md" required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input type="number" name="amount" placeholder="Amount (₹)*" value={formData.amount} onChange={handleFormChange} className="p-2 border rounded-md md:col-span-1" required />
          <textarea name="toolsDescription" placeholder="Tools Description*" value={formData.toolsDescription} onChange={handleFormChange} className="p-2 border rounded-md md:col-span-4" rows="1" required/>
        </div>
        <div className="flex justify-end pt-4">
            <button type="submit" className="p-2 px-6 bg-green-600 text-white rounded-md hover:bg-green-700">Save Changes</button>
        </div>
      </form>
    </div>
  );
};

export default EditRentPage;