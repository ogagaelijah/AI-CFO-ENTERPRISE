// frontend/src/pages/Students.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import SummaryCards from '../components/Students/SummaryCards';
import StudentTable from '../components/Students/StudentTable';
import RecordStudentModal from '../components/Students/RecordStudentModal';
import EditStudentModal from '../components/Students/EditStudentModal';
import StudentDetailModal from '../components/Students/StudentDetailModal';
import ConfirmModal from '../components/Students/ConfirmModal';

const Students = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    withdrawn: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchStudents();
  }, [statusFilter]);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      setError('');
      const params = { limit: 200 };
      if (statusFilter) params.status = statusFilter;

      const response = await api.get('/students', { params });

      if (response.data?.success) {
        const list = response.data.students || [];
        setStudents(list);

        const total = response.data.pagination?.total ?? list.length;
        const active = list.filter((s) => s.status === 'ACTIVE').length;
        const withdrawn = list.filter((s) => s.status === 'WITHDRAWN').length;

        setSummary({ total, active, withdrawn });
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setError(error.response?.data?.message || 'Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentDetail = async (id) => {
    try {
      setIsLoadingDetail(true);
      setError('');
      const response = await api.get(`/students/${id}`);
      if (response.data?.success) {
        setSelectedStudent(response.data.student);
        setShowDetailModal(true);
      } else {
        setError('Failed to load student details');
      }
    } catch (error) {
      console.error('❌ Error fetching student detail:', error);
      setError(error.response?.data?.message || 'Failed to load student details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCreate = async (data) => {
    setError('');
    setSuccess('');
    try {
      const response = await api.post('/students', data);
      if (response.data?.success) {
        setShowModal(false);
        setSuccess(`✅ Student ${response.data.student?.fullName || ''} added (${response.data.student?.admissionNumber || ''})`);
        await fetchStudents();
      } else {
        setError(response.data?.message || 'Failed to create student');
      }
    } catch (error) {
      console.error('Error creating student:', error);
      setError(error.response?.data?.message || 'Failed to create student');
    }
  };

  const handleUpdate = async (data) => {
    setError('');
    setSuccess('');
    try {
      const response = await api.put(`/students/${selectedStudent.id}`, data);
      if (response.data?.success) {
        setShowEditModal(false);
        setSelectedStudent(null);
        setSuccess('✅ Student updated successfully!');
        await fetchStudents();
      } else {
        setError(response.data?.message || 'Failed to update student');
      }
    } catch (error) {
      console.error('Error updating student:', error);
      setError(error.response?.data?.message || 'Failed to update student');
    }
  };

  const handleDelete = async () => {
    if (!selectedStudent) return;
    setError('');
    setSuccess('');
    try {
      const response = await api.delete(`/students/${selectedStudent.id}`);
      if (response.data?.success) {
        setShowConfirmModal(false);
        setSelectedStudent(null);
        setSuccess(response.data.message || '✅ Student updated');
        await fetchStudents();
      } else {
        setError(response.data?.message || 'Failed to delete student');
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      setError(error.response?.data?.message || 'Failed to delete student');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        subtitle="Student records"
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
            <span>Add Student</span>
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
            <option value="WITHDRAWN">Withdrawn</option>
            <option value="GRADUATED">Graduated</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      <StudentTable
        students={students}
        onView={fetchStudentDetail}
        onEdit={(student) => {
          setSelectedStudent(student);
          setShowEditModal(true);
        }}
        onDelete={(student) => {
          setSelectedStudent(student);
          setShowConfirmModal(true);
        }}
      />

      <RecordStudentModal
        isOpen={showModal}
        onSubmit={handleCreate}
        onClose={() => setShowModal(false)}
        error={error}
        setError={setError}
      />

      <EditStudentModal
        isOpen={showEditModal}
        student={selectedStudent}
        onSubmit={handleUpdate}
        onClose={() => {
          setShowEditModal(false);
          setSelectedStudent(null);
        }}
        error={error}
        setError={setError}
      />

      <StudentDetailModal
        isOpen={showDetailModal}
        student={selectedStudent}
        isLoading={isLoadingDetail}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedStudent(null);
        }}
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        student={selectedStudent}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowConfirmModal(false);
          setSelectedStudent(null);
        }}
      />
    </div>
  );
};

export default Students;