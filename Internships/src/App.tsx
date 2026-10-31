import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Internship, ApplicationStatus } from './types/internship';
import { StatsHeader } from './components/StatsHeader';
import { FilterBar } from './components/FilterBar';
import { InternshipTable } from './components/InternshipTable';
import { InternshipModal } from './components/InternshipModal';
import { ApplicationFlowModal } from './components/ApplicationFlowModal';
import { isRejected } from './utils/internship';
import { localDateString } from './utils/date';

const API_URL = '/api/internships';

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(response.status === 401 ? 'Your Access session has expired. Reload to sign in again.' : body?.error || `Request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export default function App() {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [seasonFilter, setSeasonFilter] = useState('All');
  const [workModelFilter, setWorkModelFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'dateApplied' | 'company' | 'status' | 'updatedAt'>('dateApplied');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFlowOpen, setIsFlowOpen] = useState(false);
  const closeFlow = useCallback(() => setIsFlowOpen(false), []);
  const [editingInternship, setEditingInternship] = useState<Internship | null>(null);

  // Load from backend on mount
  useEffect(() => {
    async function loadData() {
      try {
        const data = await apiRequest<Internship[]>(API_URL);
        if (!Array.isArray(data)) throw new Error('Unexpected response from the server.');
        setInternships(data);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load applications.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const updateInternship = async (internship: Internship) => {
    const saved = await apiRequest<Internship>(`${API_URL}/${internship.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ internship }),
    });
    setInternships((prev) => prev.map((item) => item.id === saved.id ? saved : item));
    setError('');
  };

  const refreshAfterSql = async () => {
    const data = await apiRequest<Internship[]>(API_URL);
    if (!Array.isArray(data)) throw new Error('Unexpected response from the server.');
    setInternships(data);
    setError('');
  };

  const saveQuickChange = async (internship: Internship) => {
    try {
      await updateInternship(internship);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the change.');
    }
  };

  // Handle create or edit
  const handleSaveInternship = async (
    data: Omit<Internship, 'id' | 'updatedAt'>,
    id?: string
  ) => {
    const now = localDateString();
    try {
      if (id) {
        await updateInternship({ ...data, id, updatedAt: now });
      } else {
        const internship = { ...data, id: crypto.randomUUID(), updatedAt: now };
        const saved = await apiRequest<Internship>(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ internship }),
        });
        setInternships((prev) => [saved, ...prev]);
        setError('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the application.');
      throw err;
    }
  };

  // Quick inline status change
  const handleStatusChange = async (id: string, newStatus: ApplicationStatus) => {
    const now = localDateString();
    const target = internships.find((i) => i.id === id);
    if (!target) return;

    const updated = {
      ...target,
      status: newStatus,
      interviewRound: newStatus === 'Interview Round' ? target.interviewRound : undefined,
      updatedAt: now,
    };
    await saveQuickChange(updated);
  };

  const handleInterviewRoundChange = async (id: string, round: string) => {
    const target = internships.find((item) => item.id === id);
    if (!target || target.status !== 'Interview Round') return;

    const updated = {
      ...target,
      interviewRound: round.trim() || undefined,
      updatedAt: localDateString(),
    };
    await saveQuickChange(updated);
  };

  const handleRejectedChange = async (id: string) => {
    const target = internships.find((item) => item.id === id);
    if (!target) return;

    const updated = {
      ...target,
      rejected: !isRejected(target),
      updatedAt: localDateString(),
    };
    await saveQuickChange(updated);
  };

  // Delete
  const handleDelete = async (id: string) => {
    try {
      await apiRequest<{ success: boolean }>(`${API_URL}/${id}`, {
        method: 'DELETE',
      });
      setInternships((prev) => prev.filter((item) => item.id !== id));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the application.');
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setSeasonFilter('All');
    setWorkModelFilter('All');
    setSortBy('dateApplied');
    setSortOrder('desc');
  };

  // Filter & sort list
  const filteredInternships = useMemo(() => {
    return internships
      .filter((item) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            item.company.toLowerCase().includes(q) ||
            item.role.toLowerCase().includes(q) ||
            item.location.toLowerCase().includes(q) ||
            (item.notes && item.notes.toLowerCase().includes(q));
          if (!match) return false;
        }

        if (item.status === 'Withdrawn') {
          if (statusFilter !== 'Withdrawn') return false;
        } else if (statusFilter === 'Rejected') {
          if (!isRejected(item)) return false;
        } else if (isRejected(item) || (statusFilter !== 'All' && item.status !== statusFilter)) {
          return false;
        }

        if (seasonFilter !== 'All' && item.season !== seasonFilter) {
          return false;
        }

        if (workModelFilter !== 'All' && item.workModel !== workModelFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'company') {
          cmp = a.company.localeCompare(b.company);
        } else if (sortBy === 'status') {
          cmp = a.status.localeCompare(b.status);
        } else if (sortBy === 'updatedAt') {
          cmp = (a.updatedAt || '').localeCompare(b.updatedAt || '');
        } else {
          cmp = (a.dateApplied || '').localeCompare(b.dateApplied || '');
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [internships, searchQuery, statusFilter, seasonFilter, workModelFilter, sortBy, sortOrder]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10">
        {/* Clean Header */}
        <header className="flex items-center justify-between gap-4 pb-6 mb-4 border-b border-slate-800">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Internship Tracker
            </h1>
          </div>

          <button
            onClick={() => {
              setEditingInternship(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Application</span>
          </button>
        </header>

        {error && <div role="alert" className="mb-4 rounded-lg border border-rose-700 bg-rose-950/50 p-3 text-sm text-rose-200">{error}</div>}
        {loading && <p className="mb-4 text-sm text-slate-400">Loading applications…</p>}

        {/* Natural Stats Bar */}
        <StatsHeader internships={internships} onShowFlow={() => setIsFlowOpen(true)} flowDisabled={loading || Boolean(error)} />

        {/* Filters */}
        <FilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          seasonFilter={seasonFilter}
          setSeasonFilter={setSeasonFilter}
          workModelFilter={workModelFilter}
          setWorkModelFilter={setWorkModelFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          onResetFilters={handleResetFilters}
        />

        {/* Table */}
        <InternshipTable
          internships={filteredInternships}
          onStatusChange={handleStatusChange}
          onInterviewRoundChange={handleInterviewRoundChange}
          onRejectedChange={handleRejectedChange}
          onEdit={(internship) => {
            setEditingInternship(internship);
            setIsModalOpen(true);
          }}
          onDelete={handleDelete}
        />
      </div>

      {/* Add / Edit Modal */}
      {isFlowOpen && <ApplicationFlowModal internships={internships} onClose={closeFlow} />}
      <InternshipModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingInternship(null);
        }}
        onSave={handleSaveInternship}
        onSqlExecuted={refreshAfterSql}
        editingInternship={editingInternship}
      />
    </div>
  );
}
