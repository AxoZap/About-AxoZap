import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, DollarSign, Globe, FileText, Calendar, Code2 } from 'lucide-react';
import { Internship, ApplicationStatus, applicationStatuses, WorkModel, TermSeason } from '../types/internship';
import { localDateString } from '../utils/date';

interface InternshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (internship: Omit<Internship, 'id' | 'updatedAt'>, id?: string) => Promise<void>;
  onSqlExecuted: () => Promise<void>;
  editingInternship?: Internship | null;
}

const workModels: WorkModel[] = ['Remote', 'Hybrid', 'On-site'];
const seasons: TermSeason[] = ['Summer 2027', 'Fall 2027', 'Spring 2028', 'Summer 2028', 'Full-Time', 'Off-Season'];

export const InternshipModal: React.FC<InternshipModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSqlExecuted,
  editingInternship,
}) => {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [workModel, setWorkModel] = useState<WorkModel>('Hybrid');
  const [season, setSeason] = useState<TermSeason>('Summer 2027');
  const [status, setStatus] = useState<ApplicationStatus>('Applied');
  const [interviewRound, setInterviewRound] = useState('');
  const [rejected, setRejected] = useState(false);
  const [dateApplied, setDateApplied] = useState('');
  const [salary, setSalary] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [portalUrl, setPortalUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [showSql, setShowSql] = useState(false);
  const [sql, setSql] = useState('');
  const [sqlRunning, setSqlRunning] = useState(false);
  const [sqlMessage, setSqlMessage] = useState('');
  const [sqlError, setSqlError] = useState('');
  const [sqlResults, setSqlResults] = useState('');

  useEffect(() => {
    setShowSql(false);
    setSql('');
    setSqlMessage('');
    setSqlError('');
    setSqlResults('');
    if (editingInternship) {
      setCompany(editingInternship.company);
      setRole(editingInternship.role);
      setLocation(editingInternship.location);
      setWorkModel(editingInternship.workModel);
      setSeason(editingInternship.season);
      setStatus(editingInternship.status);
      setInterviewRound(editingInternship.interviewRound || '');
      setRejected(Boolean(editingInternship.rejected));
      setDateApplied(editingInternship.dateApplied);
      setSalary(editingInternship.salary || '');
      setJobUrl(editingInternship.jobUrl || '');
      setPortalUrl(editingInternship.portalUrl || '');
      setNotes(editingInternship.notes || '');
    } else {
      setCompany('');
      setRole('Software Engineer Intern');
      setLocation('San Francisco, CA');
      setWorkModel('Hybrid');
      setSeason('Summer 2027');
      setStatus('Applied');
      setInterviewRound('');
      setRejected(false);
      setDateApplied(localDateString());
      setSalary('');
      setJobUrl('');
      setPortalUrl('');
      setNotes('');
    }
  }, [editingInternship, isOpen]);

  if (!isOpen) return null;

  const runSql = async () => {
    if (!sql.trim() || sqlRunning) return;
    setSqlRunning(true);
    setSqlError('');
    setSqlMessage('');
    setSqlResults('');
    try {
      const response = await fetch('/api/sql', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql }),
      });
      if (!response.headers.get('Content-Type')?.includes('application/json')) throw new Error('Reload to renew your Access session and try again.');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `SQL failed (${response.status}).`);
      setSqlMessage(`Ran ${result.statements} statement${result.statements === 1 ? '' : 's'} · ${result.changes} row${result.changes === 1 ? '' : 's'} changed${result.truncated ? ' · Results limited to 100 rows per statement' : ''}`);
      if (result.results.some((rows: unknown[]) => rows.length)) setSqlResults(JSON.stringify(result.results, null, 2));
      try { await onSqlExecuted(); }
      catch { setSqlError('SQL ran successfully, but the application list could not refresh. Reload to see your changes.'); }
    } catch (error) {
      setSqlError(error instanceof Error ? error.message : 'Could not run SQL.');
    } finally { setSqlRunning(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;

    try {
      await onSave(
        {
          company: company.trim(),
          role: role.trim(),
          location: location.trim() || 'Remote',
          workModel,
          season,
          status,
          interviewRound: status === 'Interview Round' ? interviewRound.trim() || undefined : undefined,
          rejected,
          dateApplied: dateApplied || localDateString(),
          salary: salary.trim() || undefined,
          jobUrl: jobUrl.trim() || undefined,
          portalUrl: portalUrl.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        editingInternship ? editingInternship.id : undefined
      );
      onClose();
    } catch {
      // Keep the form open so the user can retry after the error shown above.
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {editingInternship ? 'Edit Application' : 'Add New Application'}
              </h2>
              <p className="text-xs text-slate-400">Track and update application details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editingInternship && (
              <button type="button" onClick={() => setShowSql(value => !value)} disabled={sqlRunning}
                aria-expanded={showSql} aria-controls="application-sql-panel"
                className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-[10px] font-medium text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50">
                <Code2 className="w-3 h-3" /> SQL
              </button>
            )}
            <button type="button" onClick={onClose} disabled={sqlRunning} aria-label="Close"
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-sm">
          {showSql && !editingInternship && (
            <section id="application-sql-panel" className="rounded-xl border border-slate-700 bg-slate-950/60 p-3 space-y-2">
              <label htmlFor="application-sql" className="block text-xs font-semibold text-slate-300">Run SQL</label>
              <textarea id="application-sql" rows={5} value={sql} onChange={event => setSql(event.target.value)} disabled={sqlRunning}
                placeholder="Paste your SQL here…" spellCheck={false} maxLength={50_000} autoFocus
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 focus:outline-none focus:border-cyan-500 disabled:opacity-60" />
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-slate-500">Runs directly on your internship database.</span>
                <button type="button" onClick={runSql} disabled={sqlRunning || !sql.trim()}
                  className="shrink-0 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed">
                  {sqlRunning ? 'Running…' : 'Run SQL'}
                </button>
              </div>
              {sqlMessage && <p role="status" className="text-xs text-emerald-300">{sqlMessage}</p>}
              {sqlError && <p role="alert" className="text-xs text-rose-300">{sqlError}</p>}
              {sqlResults && <pre className="max-h-40 overflow-auto rounded-lg bg-slate-950 p-2 text-[10px] text-slate-300">{sqlResults}</pre>}
            </section>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Company Name *</label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Google, Stripe"
                className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Role / Position *</label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Software Engineer Intern"
                className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Application Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {applicationStatuses.map((s) => (
                  <option key={s} value={s} className="bg-slate-900">
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date Applied
              </label>
              <input
                type="date"
                value={dateApplied}
                onChange={(e) => setDateApplied(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {status === 'Interview Round' && (
            <div>
              <label htmlFor="interview-round" className="block text-xs font-semibold text-slate-300 mb-1.5">Interview Round</label>
              <input
                id="interview-round"
                type="text"
                value={interviewRound}
                onChange={(e) => setInterviewRound(e.target.value)}
                placeholder="e.g. Phone screen, Technical, Final"
                className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input type="checkbox" checked={rejected} onChange={(e) => setRejected(e.target.checked)} className="accent-rose-500" />
            Rejected (show beside the application stage)
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Season / Term</label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value as TermSeason)}
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 text-xs cursor-pointer"
              >
                {seasons.map((s) => (
                  <option key={s} value={s} className="bg-slate-900">
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Work Model</label>
              <select
                value={workModel}
                onChange={(e) => setWorkModel(e.target.value as WorkModel)}
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 text-xs cursor-pointer"
              >
                {workModels.map((m) => (
                  <option key={m} value={m} className="bg-slate-900">
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Seattle, WA"
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-400" />
                Salary / Rate
              </label>
              <input
                type="text"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="e.g. $55/hr"
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <Globe className="w-3 h-3 text-cyan-400" />
                Job Posting URL
              </label>
              <input
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <Globe className="w-3 h-3 text-purple-400" />
                Portal URL
              </label>
              <input
                type="url"
                value={portalUrl}
                onChange={(e) => setPortalUrl(e.target.value)}
                placeholder="Workday / Taleo link"
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              Notes & Interviews
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="OA details, interview schedule, recruiters contacted..."
              className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={sqlRunning}
              className="px-4 py-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sqlRunning}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
            >
              {editingInternship ? 'Update' : 'Add Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
