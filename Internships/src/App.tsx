import { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Internship, ApplicationStatus } from './types/internship';
import { initialInternships } from './data/mockData';
import { StatsHeader } from './components/StatsHeader';
import { FilterBar } from './components/FilterBar';
import { InternshipTable } from './components/InternshipTable';
import { InternshipModal } from './components/InternshipModal';

const API_URL = "https://axozap-internships-backend.peteystillwell.workers.dev/api/internships";
const STORAGE_KEY = 'axozap_internships_data';

export default function App() {
  const [internships, setInternships] = useState<Internship[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse local storage data', e);
      }
    }
    return initialInternships;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [seasonFilter, setSeasonFilter] = useState('All');
  const [workModelFilter, setWorkModelFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'dateApplied' | 'company' | 'status' | 'updatedAt'>('dateApplied');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInternship, setEditingInternship] = useState<Internship | null>(null);

  // Load from backend on mount
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(API_URL);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setInternships(data);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          }
        }
      } catch (err) {
        console.error('Error loading internships from backend:', err);
      }
    }
    loadData();
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(internships));
  }, [internships]);

  // Handle create or edit
  const handleSaveInternship = async (
    data: Omit<Internship, 'id' | 'updatedAt'>,
    id?: string
  ) => {
    const now = new Date().toISOString().split('T')[0];
    if (id) {
      // Optimistic update
      const updated = { ...data, id, updatedAt: now };
      setInternships((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );

      try {
        await fetch(`${API_URL}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ internship: updated }),
        });
      } catch (e) {
        console.error('Failed to update on backend', e);
      }
    } else {
      const newEntry: Internship = {
        ...data,
        id: 'app-' + Date.now(),
        updatedAt: now,
      };
      setInternships((prev) => [newEntry, ...prev]);

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ internship: newEntry }),
        });
        if (res.ok) {
          const serverEntry = await res.json();
          setInternships((prev) =>
            prev.map((item) => (item.id === newEntry.id ? serverEntry : item))
          );
        }
      } catch (e) {
        console.error('Failed to save to backend', e);
      }
    }
  };

  // Quick inline status change
  const handleStatusChange = async (id: string, newStatus: ApplicationStatus) => {
    const now = new Date().toISOString().split('T')[0];
    const target = internships.find((i) => i.id === id);
    if (!target) return;

    const updated = { ...target, status: newStatus, updatedAt: now };
    setInternships((prev) =>
      prev.map((item) => (item.id === id ? updated : item))
    );

    try {
      await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internship: updated }),
      });
    } catch (e) {
      console.error('Failed to update status on backend', e);
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    setInternships((prev) => prev.filter((item) => item.id !== id));

    try {
      await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      console.error('Failed to delete on backend', e);
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

        if (statusFilter !== 'All' && item.status !== statusFilter) {
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

        {/* Natural Stats Bar */}
        <StatsHeader internships={internships} />

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
          onEdit={(internship) => {
            setEditingInternship(internship);
            setIsModalOpen(true);
          }}
          onDelete={handleDelete}
        />
      </div>

      {/* Add / Edit Modal */}
      <InternshipModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingInternship(null);
        }}
        onSave={handleSaveInternship}
        editingInternship={editingInternship}
      />
    </div>
  );
}
