// frontend/src/components/Enrollments/EnrollStudentModal.jsx

import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const COMMON_TERMS = ['Term 1', 'Term 2', 'Term 3'];

const EnrollStudentModal = ({ isOpen, onSubmit, onClose, error, setError }) => {
  const [form, setForm] = useState({
    studentId: '',
    classId: '',
    session: '',
    term: '',
  });
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setForm({ studentId: '', classId: '', session: '', term: '' });
    setLocalError('');

    // Load active students
    api.get('/students', { params: { status: 'ACTIVE', limit: 500 } })
      .then((res) => {
        if (res.data?.success) setStudents(res.data.students || []);
      })
      .catch(() => {});

    // Load active classes
    api.get('/classes', { params: { status: 'ACTIVE', limit: 500 } })
      .then((res) => {
        if (res.data?.success) setClasses(res.data.classes || []);
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (localError) setLocalError('');
    if (error && setError) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!form.studentId) {
      setLocalError('Please select a student');
      return;
    }
    if (!form.classId) {
      setLocalError('Please select a class');
      return;
    }
    if (!form.session.trim()) {
      setLocalError('Session is required (e.g. 2025/2026)');
      return;
    }
    if (!form.term.trim()) {
      setLocalError('Term is required (e.g. Term 1)');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        studentId: Number(form.studentId),
        classId: Number(form.classId),
        session: form.session.trim(),
        term: form.term.trim(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Enroll Student</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {displayError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded flex items-center space-x-2 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Student <span className="text-red-500">*</span>
            </label>
            <select
              value={form.studentId}
              onChange={(e) => handleChange('studentId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">— Select student —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.admissionNumber})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Class <span className="text-red-500">*</span>
            </label>
            <select
              value={form.classId}
              onChange={(e) => handleChange('classId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">— Select class —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.level ? `(${c.level})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Session <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.session}
                onChange={(e) => handleChange('session', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="2025/2026"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Term <span className="text-red-500">*</span>
              </label>
              <select
                value={form.term}
                onChange={(e) => handleChange('term', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="">— Select term —</option>
                {COMMON_TERMS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white rounded-lg transition"
            >
              {isSubmitting ? 'Enrolling...' : 'Enroll Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnrollStudentModal;