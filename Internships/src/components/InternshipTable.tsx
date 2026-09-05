import React from 'react';
import { 
  Building2, 
  MapPin, 
  ExternalLink, 
  Trash2, 
  Edit3, 
  Calendar,
} from 'lucide-react';
import { Internship, ApplicationStatus } from '../types/internship';
import { StatusDropdown } from './StatusDropdown';

interface InternshipTableProps {
  internships: Internship[];
  onStatusChange: (id: string, newStatus: ApplicationStatus) => void;
  onEdit: (internship: Internship) => void;
  onDelete: (id: string) => void;
}

export const InternshipTable: React.FC<InternshipTableProps> = ({
  internships,
  onStatusChange,
  onEdit,
  onDelete,
}) => {
  if (internships.length === 0) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center">
        <Building2 className="w-10 h-10 text-slate-500 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-slate-200">No applications match your criteria</h3>
        <p className="text-xs text-slate-400 mt-1">Try clearing filters or add an internship.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl shadow-sm">
      <div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Company & Role</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Term & Model</th>
              <th className="py-3 px-4">Date Applied</th>
              <th className="py-3 px-4">Pay</th>
              <th className="py-3 px-4">Notes & Links</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {internships.map((item) => (
              <tr 
                key={item.id} 
                className="hover:bg-slate-800/40 transition-colors"
              >
                {/* Company & Role */}
                <td className="py-3.5 px-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 shrink-0 text-xs">
                      {item.company.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5 leading-snug">
                        {item.company}
                        {item.jobUrl && (
                          <a
                            href={item.jobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-indigo-400 transition-colors"
                            title="Job Listing"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">{item.role}</div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{item.location}</span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Status Dropdown inside the badge */}
                <td className="py-3.5 px-4">
                  <StatusDropdown
                    status={item.status}
                    onChange={(newStatus) => onStatusChange(item.id, newStatus)}
                  />
                </td>

                {/* Term & Model */}
                <td className="py-3.5 px-4">
                  <div className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60 mb-0.5">
                    {item.season}
                  </div>
                  <div className="text-xs text-slate-400">
                    {item.workModel}
                  </div>
                </td>

                {/* Date Applied */}
                <td className="py-3.5 px-4 text-xs font-mono text-slate-300 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{item.dateApplied || '—'}</span>
                  </div>
                </td>

                {/* Pay */}
                <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                  {item.salary ? (
                    <span className="font-medium text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                      {item.salary}
                    </span>
                  ) : (
                    <span className="text-slate-500 font-mono">—</span>
                  )}
                </td>

                {/* Notes & Links */}
                <td className="py-3.5 px-4 text-xs max-w-xs">
                  {item.notes ? (
                    <p className="text-slate-300 line-clamp-2 text-xs">
                      {item.notes}
                    </p>
                  ) : (
                    <span className="text-slate-500 font-mono text-xs">—</span>
                  )}
                  {item.portalUrl && (
                    <div className="mt-1">
                      <a
                        href={item.portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-1"
                      >
                        Portal Link <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  )}
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${item.company}?`)) {
                          onDelete(item.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
