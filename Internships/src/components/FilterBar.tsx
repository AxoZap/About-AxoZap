import React from 'react';
import { Search, ArrowUpDown, X } from 'lucide-react';
import { ApplicationStatus, TermSeason, WorkModel } from '../types/internship';

interface FilterBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  seasonFilter: string;
  setSeasonFilter: (season: string) => void;
  workModelFilter: string;
  setWorkModelFilter: (model: string) => void;
  sortBy: 'dateApplied' | 'company' | 'status' | 'updatedAt';
  setSortBy: (field: 'dateApplied' | 'company' | 'status' | 'updatedAt') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  onResetFilters: () => void;
}

const statusOptions: ('All' | ApplicationStatus)[] = [
  'All',
  'Bookmarked',
  'Applied',
  'OA Received',
  'OA Completed',
  'Interview Scheduled',
  'Final Round',
  'Offer',
  'Rejected',
  'Withdrawn',
];

const seasonOptions: ('All' | TermSeason)[] = [
  'All',
  'Summer 2026',
  'Spring 2026',
  'Fall 2025',
  'Summer 2025',
  'Full-Time',
  'Off-Season',
];

const workModelOptions: ('All' | WorkModel)[] = ['All', 'Remote', 'Hybrid', 'On-site'];

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  seasonFilter,
  setSeasonFilter,
  workModelFilter,
  setWorkModelFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  onResetFilters,
}) => {
  const isFiltered =
    searchQuery !== '' ||
    statusFilter !== 'All' ||
    seasonFilter !== 'All' ||
    workModelFilter !== 'All';

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-4">
      {/* Search Input */}
      <div className="relative w-full md:w-80">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Filter applications..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-7 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-600 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Filters & Sorters */}
      <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end text-xs">
        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-slate-600 cursor-pointer font-medium"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s} className="bg-slate-900">
              {s === 'All' ? 'All Statuses' : s}
            </option>
          ))}
        </select>

        {/* Season */}
        <select
          value={seasonFilter}
          onChange={(e) => setSeasonFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-slate-600 cursor-pointer font-medium"
        >
          {seasonOptions.map((s) => (
            <option key={s} value={s} className="bg-slate-900">
              {s === 'All' ? 'All Terms' : s}
            </option>
          ))}
        </select>

        {/* Work Model */}
        <select
          value={workModelFilter}
          onChange={(e) => setWorkModelFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-slate-600 cursor-pointer font-medium"
        >
          {workModelOptions.map((m) => (
            <option key={m} value={m} className="bg-slate-900">
              {m === 'All' ? 'All Locations' : m}
            </option>
          ))}
        </select>

        {/* Sort */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-300">
          <ArrowUpDown className="w-3 h-3 text-slate-400 mr-1.5" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="dateApplied" className="bg-slate-900">Date Applied</option>
            <option value="company" className="bg-slate-900">Company</option>
            <option value="status" className="bg-slate-900">Status</option>
            <option value="updatedAt" className="bg-slate-900">Last Updated</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="ml-1 text-[11px] font-mono text-slate-400 hover:text-white px-1"
            title="Toggle sort direction"
          >
            {sortOrder.toUpperCase()}
          </button>
        </div>

        {isFiltered && (
          <button
            onClick={onResetFilters}
            className="text-xs text-slate-400 hover:text-white bg-slate-800 px-2 py-1.5 rounded-lg transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
};
