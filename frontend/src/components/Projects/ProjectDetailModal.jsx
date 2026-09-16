// frontend/src/components/Projects/ProjectDetailModal.jsx

import { X } from 'lucide-react';

const STATUS_STYLES = {
  ACTIVE:    'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  COMPLETED: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  ON_HOLD:   'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  CANCELLED: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
};

const formatCurrency = (v) => `₦${(Number(v) || 0).toLocaleString('en-NG')}`;
const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const Row = ({ label, value }) => (
  <div className="grid grid-cols-3 gap-4 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
    <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
    <div className="col-span-2 text-sm text-gray-900 dark:text-gray-100">{value}</div>
  </div>
);

const ProjectDetailModal = ({ isOpen, project, isLoading, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Project Details</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !project ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No project loaded.</p>
          ) : (
            <>
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {project.name}
                </h3>
                <span
                  className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[project.status] || STATUS_STYLES.ACTIVE}`}
                >
                  {project.status || 'ACTIVE'}
                </span>
              </div>

              <Row label="Description" value={project.description || '—'} />
              <Row label="Budget" value={formatCurrency(project.budget)} />
              <Row label="Start Date" value={formatDate(project.startDate)} />
              <Row label="End Date" value={formatDate(project.endDate)} />
              <Row label="Notes" value={project.notes || '—'} />
              <Row label="Created" value={formatDate(project.createdAt)} />
              <Row label="Updated" value={formatDate(project.updatedAt)} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailModal;