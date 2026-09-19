// frontend/src/pages/Classes.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import SummaryCards from '../components/Classes/SummaryCards';
import ClassTable from '../components/Classes/ClassTable';
import RecordClassModal from '../components/Classes/RecordClassModal';
import EditClassModal from '../components/Classes/EditClassModal';
import ConfirmModal from '../components/Classes/ConfirmModal';

const Classes = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    archived: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchClasses();
  }, [statusFilter]);

  const fetchClasses = async () => {
    try {
      setIsLoading(true);
      setError('');
      const params = { limit: 200 };
      if (statusFilter) params.status = statusFilter;

      const response = await api.get('/classes', { params });

      if (response.data?.success) {
        const list = response.data.classes || [];
        setClasses(list);

        const total = response.data.pagination?.total ?? list.length;
        const active = list.filter((c) => c.status === 'ACTIVE').length;
        const archived = list.filter((c) => c.status === 'ARCHIVED').length;

        setSummary({ total, active, archived });
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      setError(error.response?.data?.message || 'Failed to load classes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (data) => {
    setError('');
    setSuccess('');
    try {
      const response = await api.post('/classes', data);
      if (response.data?.success) {
        setShowModal(false);
        setSuccess(`✅ Class "${response.data.class?.name || ''}" created`);
        await fetchClasses();
      } else {
        setError(response.data?.message || 'Failed to create class');
      }
    } catch (error) {
      console.error('Error creating class:', error);
      setError(error.response?.data?.message || 'Failed to create class');
    }
  };

  const handleUpdate = async (data) => {
    setError('');
    setSuccess('');
    try {
      const response = await api.put(`/classes/${selectedClass.id}`, data);
      if (response.data?.success) {
        setShowEditModal(false);
        setSelectedClass(null);
        setSuccess('✅ Class updated successfully!');
        await fetchClasses();
      } else {
        setError(response.data?.message || 'Failed to update class');
      }
    } catch (error) {
      console.error('Error updating class:', error);
      setError(error.response?.data?.message || 'Failed to update class');
    }
  };

  const handleDelete = async () => {
    if (!selectedClass) return;
    setError('');
    setSuccess('');
    try {
      const response = await api.delete(`/classes/${selectedClass.id}`);
      if (response.data?.success) {
        setShowConfirmModal(false);
        setSelectedClass(null);
        setSuccess(response.data.message || '✅ Class deleted');
        await fetchClasses();
      } else {
        setError(response.data?.message || 'Failed to delete class');
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      setError(error.response?.data?.message || 'Failed to delete class');
      setShowConfirmModal(false);
    }
  };

  const handleArchive = async (klass) => {
    setError('');
    setSuccess('');
    try {
      const response = await api.put(`/classes/${klass.id}`, { status: 'ARCHIVED' });
      if (response.data?.success) {
        setSuccess(`✅ Class "${klass.name}" archived`);
        await fetchClasses();
      } else {
        setError(response.data?.message || 'Failed to archive class');
      }
    } catch (error) {
      console.error('Error archiving class:', error);
      setError(error.response?.data?.message || 'Failed to archive class');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        subtitle="Class groups and cohorts"
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
            <span>Add Class</span>
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      <ClassTable
        classes={classes}
        onEdit={(klass) => {
          setSelectedClass(klass);
          setShowEditModal(true);
        }}
        onDelete={(klass) => {
          setSelectedClass(klass);
          setShowConfirmModal(true);
        }}
        onArchive={handleArchive}
      />

      <RecordClassModal
        isOpen={showModal}
        onSubmit={handleCreate}
        onClose={() => setShowModal(false)}
        error={error}
        setError={setError}
      />

      <EditClassModal
        isOpen={showEditModal}
        klass={selectedClass}
        onSubmit={handleUpdate}
        onClose={() => {
          setShowEditModal(false);
          setSelectedClass(null);
        }}
        error={error}
        setError={setError}
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        klass={selectedClass}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowConfirmModal(false);
          setSelectedClass(null);
        }}
      />
    </div>
  );
};

export default Classes;