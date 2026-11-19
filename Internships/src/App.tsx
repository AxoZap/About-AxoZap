import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Internship } from './types/internship';
import { StatsHeader } from './components/StatsHeader';
import { FilterBar } from './components/FilterBar';
import { InternshipTable } from './components/InternshipTable';
import { InternshipModal } from './components/InternshipModal';
import { ApplicationFlowModal } from './components/ApplicationFlowModal';
import { matchesStatusFilter, hasRounds, overallStatus, compareInternships, type StatusChange } from './utils/internship';
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
  const [statusFilter, setStatusFilter] = useState('Applied');
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

  const handleStatusChange = async (id: string, change: StatusChange) => {
    const target = internships.find(item => item.id === id);
    if (!target) return;
    if (target.status === change.status && (target.interviewRound || '') === (change.interviewRound || '') &&
      Boolean(target.rejected) === Boolean(change.rejected) && Boolean(target.cancelled) === Boolean(change.cancelled)) return;
    await saveQuickChange({ ...target, ...change, updatedAt: localDateString() });
  };

  const handleRoundChange = async (id: string, round: string) => {
    const target = internships.find(item => item.id === id);
    if (!target || overallStatus(target) !== 'Applied' || !hasRounds(target.status)) return;
    await saveQuickChange({ ...target, interviewRound: round.trim() || undefined, updatedAt: localDateString() });
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest<{ success: boolean }>(`${API_URL}/${id}`, { method: 'DELETE' });
      setInternships(prev => prev.filter(item => item.id !== id));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the application.');
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('Applied');
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

        if (!matchesStatusFilter(item, statusFilter)) return false;

        if (seasonFilter !== 'All' && item.season !== seasonFilter) {
          return false;
        }

        if (workModelFilter !== 'All' && item.workModel !== workModelFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => compareInternships(a, b, sortBy, sortOrder));
  }, [internships, searchQuery, statusFilter, seasonFilter, workModelFilter, sortBy, sortOrder]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-10">
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
          onRoundChange={handleRoundChange}
          onDelete={handleDelete}
          onEdit={(internship) => {
            setEditingInternship(internship);
            setIsModalOpen(true);
          }}
        />
      </div>

      {/* Add / Edit Modal */}
      {isFlowOpen && <ApplicationFlowModal internships={internships} initialTimeFrame={seasonFilter} onClose={closeFlow} />}
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
