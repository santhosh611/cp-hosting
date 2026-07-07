// construction/frontend/src/pages/Admin/ManageProjects.js
import React, { useEffect, useState, useContext } from 'react';
import API from '../../api/axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Modal from '../../components/common/Modal';
import ProjectForm from '../../components/admin/ProjectForm';
import { FaPlus, FaEdit, FaTrash, FaBuilding, FaMapMarkerAlt, FaCalendarAlt, FaHardHat, FaArrowRight } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import Spinner from '../../components/common/Spinner'; 
import { AuthContext } from '../../context/AuthContext';
import { useDemoData } from '../../context/DemoDataContext';

const ManageProjects = () => {
  const { user } = useContext(AuthContext);
  const demoData = useDemoData();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const navigate = useNavigate(); // Initialize useNavigate

  const fetchProjects = async () => {
    // DEMO MODE
    if (user?.isDemo) {
      setProjects(demoData.projects);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await API.get('/projects'); // Admin fetches all projects
      setProjects(res.data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to fetch projects.';
      setError(msg);
      toast.error('Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleAddProject = () => {
    setSelectedProject(null);
    setIsModalOpen(true);
  };

  const handleEditProject = (project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleDeleteProject = async (id) => {
    if (user?.isDemo) {
      toast.info('Deleting projects is disabled in Demo Mode.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this project? This will also delete all associated attendance, material, activity, advance, and salary logs for this project.')) {
      try {
        await API.delete(`/projects/${id}`);
        toast.success('Project deleted successfully!');
        fetchProjects();
      } catch (error) {
        toast.error(`Failed to delete project: ${error.response?.data?.message || error.message}`);
        console.error('Error deleting project:', error);
      }
    }
  };

  const handleSaveProject = () => {
    fetchProjects();
    setIsModalOpen(false);
  };

  // Handler for clicking a project card - now navigates to ProjectDetailsPage
  const handleProjectClick = (projectId) => {
    navigate(`/admin/projects/${projectId}`); // Navigate to the new ProjectDetailsPage route
  };


  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Manage Projects</h2>

      <div className="flex flex-col sm:flex-row justify-end items-center mb-4 sm:mb-6 space-y-2 sm:space-y-0 sm:space-x-2">
        <button
            onClick={handleAddProject}
            className="flex items-center px-3 sm:px-4 py-2 rounded-md shadow bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <FaPlus className="mr-2" /> Add New Project
          </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] py-12"> 
          <Spinner size="lg" type="logo" color="#2F3C7E" />
          <span className="ml-3 mt-4 text-sm text-gray-500">Loading projects...</span>
        </div>
      ) : error ? (
        <div className="p-4 text-center text-red-600">Error: {error}</div>
      ) : projects.length === 0 ? (
        <div className="p-4 text-center text-gray-600">No projects found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {projects.map(project => (
            <div
              key={project._id}
               className="bg-gray-50 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 hover:shadow-lg hover:border-indigo-400 transition-all duration-200 cursor-pointer flex flex-col justify-between"
              onClick={() => handleProjectClick(project._id)} // Make the card clickable
            >
              <div>
                <div className="flex items-center mb-4">
                  <FaBuilding className="mr-3 text-indigo-600" size={28} />
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800 truncate">
                    {project.name}
                  </h3>
                </div>
                <div className="space-y-2 text-gray-700 text-xs sm:text-sm mb-4">
                  <p className="flex items-center"><FaMapMarkerAlt className="mr-2 text-gray-500" /> {project.location}</p>
                  <p className="flex items-center"><FaCalendarAlt className="mr-2 text-gray-500" /> Start Date: {new Date(project.startDate).toLocaleDateString('en-GB')}</p>
                  <p className="flex items-center"><FaHardHat className="mr-2 text-gray-500" /> Workers Assigned: {project.assignedWorkers.length}</p>
                </div>
              </div>
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 flex justify-between items-center">
                  <div className="flex space-x-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit Project"
                    >
                      <FaEdit size={18} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteProject(project._id); }}
                      className="text-red-600 hover:text-red-800"
                      title="Delete Project"
                    >
                      <FaTrash size={18} />
                    </button>
                  </div>
                <span className="flex items-center text-indigo-600 font-medium group">
                  View Details <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedProject ? 'Edit Project' : 'Add New Project'}
        size="lg"
      >
        <ProjectForm
          project={selectedProject}
          onSave={handleSaveProject}
          onClose={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default ManageProjects;