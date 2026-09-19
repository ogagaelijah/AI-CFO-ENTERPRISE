// frontend/src/pages/Enrollments.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import EnrollmentTable from '../components/Enrollments/EnrollmentTable';
import EnrollStudentModal from '../components/Enrollments/EnrollStudentModal';
import EnrollmentConfirmModal from '../components/Enrollments/EnrollmentConfirmModal';

const Enrollments = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionFilter, setSessionFilter] = useState('');
  const [termFilter, setTermFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchEnrollments();
  }, [sessionFilter, termFilter, statusFilter]);

  const fetchEnrollments = async () => {
    try {
      setIsLoading(true);
      setError('');
      const params = { limit: 200 };
      if (sessionFilter) params.session = sessionFilter;
      if (termFilter) params.term = termFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await api.get('/enrollments', { params });
      if (response.data?.success) {
        setEnrollments(response.data.enrollments || []);
      }
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      setError(error.response?.data?.message || 'Failed to load enrollments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnroll = async (data) => {
    setError('');
    setSuccess('');
    try {
      const response = await api.post('/enrollments', data);
      if (response.data?.success) {
        setShowModal(false);
        setSuccess('✅ Student enrolled');
        await fetchEnrollments();
      } else {
        setError(response.data?.message || 'Failed to enroll student');
      }
    } catch (error) {
      console.error('Error enrolling student:', error);
      setError(error.response?.data?.message || 'Failed to enroll student');
    }
  };

  const handleConfirmUnenroll = async () => {
    if (!selectedEnrollment) return;
    setError('');
    setSuccess('');
    try {
      const response = await api.post(`/enrollments/${selectedEnrollment.id}/unenroll`, {
        reason: 'Admin unenrolled',
      });
      if (response.data?.success) {
        setShowConfirmModal(false);
        setSelectedEnrollment(null);
        setSuccess('✅ Student unenrolled');
        await fetchEnrollments();
      } else {
        setError(response.data?.message || 'Failed to unenroll');
      }
    } catch (error) {
      console.error('Error unenrolling:', error);
      setError(error.response?.data?.message || 'Failed to unenroll');
      setShowConfirmModal(false);
      setSelectedEnrollment(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading enrollments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enrollments"
        subtitle="Students assigned to classes"
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
            <span>Enroll Student</span>
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

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={sessionFilter}
          onChange={(e) => setSessionFilter(e.target.value)}
          placeholder="Filter by session (e.g. 2025/2026)"
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <input
          type="text"
          value={termFilter}
          onChange={(e) => setTermFilter(e.target.value)}
          placeholder="Filter by term (e.g. Term 1)"
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="WITHDRAWN">Withdrawn</option>
        </select>
      </div>

      <EnrollmentTable
        enrollments={enrollments}
        onUnenroll={(enrollment) => {
          setSelectedEnrollment(enrollment);
          setShowConfirmModal(true);
        }}
      />

      <EnrollStudentModal
        isOpen={showModal}
        onSubmit={handleEnroll}
        onClose={() => setShowModal(false)}
        error={error}
        setError={setError}
      />

      <EnrollmentConfirmModal
        isOpen={showConfirmModal}
        enrollment={selectedEnrollment}
        onConfirm={handleConfirmUnenroll}
        onCancel={() => {
          setShowConfirmModal(false);
          setSelectedEnrollment(null);
        }}
      />
    </div>
  );
};

export default Enrollments;