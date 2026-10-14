// frontend/src/pages/Enrollments.jsx
// v1.2.0-prod — Uses isInitialLoading so filter changes don't unmount the table.
// v1.1.0-prod — Uses usePaginatedApi hook + Pagination. Filters synced to URL.

import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Pagination from '../components/common/Pagination';
import usePaginatedApi from '../hooks/usePaginatedApi';
import EnrollmentTable from '../components/Enrollments/EnrollmentTable';
import EnrollStudentModal from '../components/Enrollments/EnrollStudentModal';
import EnrollmentConfirmModal from '../components/Enrollments/EnrollmentConfirmModal';

const Enrollments = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const sessionFilter = searchParams.get('session') || '';
  const termFilter = searchParams.get('term') || '';
  const statusFilter = searchParams.get('status') || '';

  const hookParams = useMemo(() => {
    const p = {};
    if (sessionFilter) p.session = sessionFilter;
    if (termFilter) p.term = termFilter;
    if (statusFilter) p.status = statusFilter;
    return p;
  }, [sessionFilter, termFilter, statusFilter]);

  const {
    items: enrollments,
    pagination,
    isInitialLoading,
    error: loadError,
    goToPage,
    refresh,
  } = usePaginatedApi('/enrollments', {
    itemKey: 'enrollments',
    params: hookParams,
  });

  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const setFilter = (key, value) => {
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        if (value) sp.set(key, value);
        else sp.delete(key);
        sp.delete('page');
        return sp;
      },
      { replace: true }
    );
  };

  const handleEnroll = async (data) => {
    setError('');
    setSuccess('');
    try {
      const response = await api.post('/enrollments', data);
      if (response.data?.success) {
        setShowModal(false);
        setSuccess('✅ Student enrolled');
        refresh();
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
        refresh();
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

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading enrollments...</p>
        </div>
      </div>
    );
  }

  const displayError = error || loadError;

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

      {displayError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{displayError}</span>
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
          onChange={(e) => setFilter('session', e.target.value)}
          placeholder="Filter by session (e.g. 2025/2026)"
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <input
          type="text"
          value={termFilter}
          onChange={(e) => setFilter('term', e.target.value)}
          placeholder="Filter by term (e.g. Term 1)"
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <select
          value={statusFilter}
          onChange={(e) => setFilter('status', e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="WITHDRAWN">Withdrawn</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <EnrollmentTable
          enrollments={enrollments}
          onUnenroll={(enrollment) => {
            setSelectedEnrollment(enrollment);
            setShowConfirmModal(true);
          }}
        />
        <Pagination pagination={pagination} onPageChange={goToPage} />
      </div>

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