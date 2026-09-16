// frontend/src/pages/Projects.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import SummaryCards from '../components/Projects/SummaryCards';
import ProjectTable from '../components/Projects/ProjectTable';
import RecordProjectModal from '../components/Projects/RecordProjectModal';
import EditProjectModal from '../components/Projects/EditProjectModal';
import ProjectDetailModal from '../components/Projects/ProjectDetailModal';
import ConfirmModal from '../components/Projects/ConfirmModal';

const Projects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await api.get('/projects', {
        params: {
          businessId: user?.businessId || user?.id,
          limit: 100,
        },
      });

      if (response.data?.success) {
        const projectsData = response.data.projects || [];
        setProjects(projectsData);

        const total = response.data.pagination?.total ?? projectsData.length;
        const active = projectsData.filter((p) => p.status === 'ACTIVE').length;

        setSummary({ total, active });
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectDetail = async (id) => {
    try {
      setIsLoadingDetail(true);
      setError('');
      const response = await api.get(`/projects/${id}`, {
        params: { businessId: user?.businessId || user?.id },
      });
      if (response.data?.success) {
        setSelectedProject(response.data.project);
        setShowDetailModal(true);
      } else {
        setError('Failed to load project details');
      }
    } catch (error) {
      console.error('❌ Error fetching project detail:', error);
      setError(error.response?.data?.message || 'Failed to load project details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCreate = async (data) => {
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/projects', {
        ...data,
        businessId: user?.businessId || user?.id,
      });

      if (response.data?.success) {
        setShowModal(false);
        setSuccess('✅ Project created successfully!');
        await fetchProjects();
      } else {
        setError(response.data?.message || 'Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setError(error.response?.data?.message || 'Failed to create project');
    }
  };

  const handleUpdate = async (data) => {
    setError('');
    setSuccess('');

    try {
      const response = await api.put(`/projects/${selectedProject.id}`, {
        ...data,
        businessId: user?.businessId || user?.id,
      });

      if (response.data?.success) {
        setShowEditModal(false);
        setSelectedProject(null);
        setSuccess('✅ Project updated successfully!');
        await fetchProjects();
      } else {
        setError(response.data?.message || 'Failed to update project');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      setError(error.response?.data?.message || 'Failed to update project');
    }
  };

  const handleDelete = async () => {
    if (!selectedProject) return;

    setError('');
    setSuccess('');

    try {
      const response = await api.delete(`/projects/${selectedProject.id}`, {
        params: { businessId: user?.businessId || user?.id },
      });

      if (response.data?.success) {
        setShowConfirmModal(false);
        setSelectedProject(null);
        setSuccess('✅ Project deleted successfully!');
        await fetchProjects();
      } else {
        setError(response.data?.message || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      setError(error.response?.data?.message || 'Failed to delete project');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        subtitle="Your project records"
        actions={
          <button
            onClick={() => {
              setShowModal(true);
              setError('');
              setSuccess('');
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            <span>Add Project</span>
          </button>
        }
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-500 hover:text-green-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <SummaryCards summary={summary} />

      <ProjectTable
        projects={projects}
        onView={fetchProjectDetail}
        onEdit={(project) => {
          setSelectedProject(project);
          setShowEditModal(true);
        }}
        onDelete={(project) => {
          setSelectedProject(project);
          setShowConfirmModal(true);
        }}
      />

      <RecordProjectModal
        isOpen={showModal}
        onSubmit={handleCreate}
        onClose={() => setShowModal(false)}
        error={error}
        setError={setError}
      />

      <EditProjectModal
        isOpen={showEditModal}
        project={selectedProject}
        onSubmit={handleUpdate}
        onClose={() => {
          setShowEditModal(false);
          setSelectedProject(null);
        }}
        error={error}
        setError={setError}
      />

      <ProjectDetailModal
        isOpen={showDetailModal}
        project={selectedProject}
        isLoading={isLoadingDetail}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedProject(null);
        }}
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        project={selectedProject}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowConfirmModal(false);
          setSelectedProject(null);
        }}
      />
    </div>
  );
};

export default Projects;