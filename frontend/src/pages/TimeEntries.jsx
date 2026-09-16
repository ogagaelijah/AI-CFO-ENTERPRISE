// frontend/src/pages/TimeEntries.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import SummaryCards from '../components/TimeEntries/SummaryCards';
import WeeklySummary from '../components/TimeEntries/WeeklySummary';
import TimeEntryTable from '../components/TimeEntries/TimeEntryTable';
import RecordTimeEntryModal from '../components/TimeEntries/RecordTimeEntryModal';
import EditTimeEntryModal from '../components/TimeEntries/EditTimeEntryModal';
import ConfirmModal from '../components/TimeEntries/ConfirmModal';

const TimeEntries = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({
    totalHours: 0,
    billableHours: 0,
    nonBillableHours: 0,
    invoicedHours: 0,
    uninvoicedHours: 0,
    totalEntries: 0,
  });
  const [weeklyEntries, setWeeklyEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await api.get('/time-entries', {
        params: {
          businessId: user?.businessId || user?.id,
          limit: 200,
        },
      });

      if (response.data?.success) {
        setEntries(response.data.timeEntries || []);
        setSummary(response.data.summary || {
          totalHours: 0,
          billableHours: 0,
          nonBillableHours: 0,
          invoicedHours: 0,
          uninvoicedHours: 0,
          totalEntries: 0,
        });

        // Pull this week's entries for the weekly summary panel.
        const { start, end } = getWeekRange();
        const weekResponse = await api.get('/time-entries', {
          params: {
            businessId: user?.businessId || user?.id,
            fromDate: start,
            toDate: end,
            limit: 100,
          },
        });
        if (weekResponse.data?.success) {
          setWeeklyEntries(weekResponse.data.timeEntries || []);
        }
      }
    } catch (error) {
      console.error('Error fetching time entries:', error);
      setError(error.response?.data?.message || 'Failed to load time entries');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (data) => {
    setError('');
    setSuccess('');
    try {
      const response = await api.post('/time-entries', {
        ...data,
        businessId: user?.businessId || user?.id,
      });

      if (response.data?.success) {
        setShowModal(false);
        setSuccess('✅ Time entry logged successfully!');
        await fetchEntries();
      } else {
        setError(response.data?.message || 'Failed to log time entry');
      }
    } catch (error) {
      console.error('Error logging time entry:', error);
      setError(error.response?.data?.message || 'Failed to log time entry');
    }
  };

  const handleUpdate = async (data) => {
    setError('');
    setSuccess('');
    try {
      const response = await api.put(`/time-entries/${selectedEntry.id}`, {
        ...data,
        businessId: user?.businessId || user?.id,
      });

      if (response.data?.success) {
        setShowEditModal(false);
        setSelectedEntry(null);
        setSuccess('✅ Time entry updated successfully!');
        await fetchEntries();
      } else {
        setError(response.data?.message || 'Failed to update time entry');
      }
    } catch (error) {
      console.error('Error updating time entry:', error);
      setError(error.response?.data?.message || 'Failed to update time entry');
    }
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;
    setError('');
    setSuccess('');
    try {
      const response = await api.delete(`/time-entries/${selectedEntry.id}`, {
        params: { businessId: user?.businessId || user?.id },
      });

      if (response.data?.success) {
        setShowConfirmModal(false);
        setSelectedEntry(null);
        setSuccess('✅ Time entry deleted successfully!');
        await fetchEntries();
      } else {
        setError(response.data?.message || 'Failed to delete time entry');
      }
    } catch (error) {
      console.error('Error deleting time entry:', error);
      setError(error.response?.data?.message || 'Failed to delete time entry');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading time entries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hours"
        subtitle="Billable time tracking"
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
            <span>Log Hours</span>
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

      <WeeklySummary entries={weeklyEntries} />

      <TimeEntryTable
        entries={entries}
        onEdit={(entry) => {
          setSelectedEntry(entry);
          setShowEditModal(true);
        }}
        onDelete={(entry) => {
          setSelectedEntry(entry);
          setShowConfirmModal(true);
        }}
      />

      <RecordTimeEntryModal
        isOpen={showModal}
        onSubmit={handleCreate}
        onClose={() => setShowModal(false)}
        error={error}
        setError={setError}
      />

      <EditTimeEntryModal
        isOpen={showEditModal}
        entry={selectedEntry}
        onSubmit={handleUpdate}
        onClose={() => {
          setShowEditModal(false);
          setSelectedEntry(null);
        }}
        error={error}
        setError={setError}
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        entry={selectedEntry}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowConfirmModal(false);
          setSelectedEntry(null);
        }}
      />
    </div>
  );
};

// ── helpers ──
function getWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun..6=Sat
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday-start week
  const monday = new Date(now.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const toIso = (d) => d.toISOString().slice(0, 10);
  return { start: toIso(monday), end: toIso(sunday) };
}

export default TimeEntries;