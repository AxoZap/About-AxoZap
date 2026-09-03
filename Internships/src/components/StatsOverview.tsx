import React from 'react';
import { Internship } from '../types/internship';
import { Briefcase, Users, Trophy, XCircle, Clock } from 'lucide-react';

interface StatsOverviewProps {
  internships: Internship[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ internships }) => {
  const total = internships.length;
  const applied = internships.filter(i => i.status !== 'Bookmarked').length;
  const interviews = internships.filter(i => ['Interview Scheduled', 'Final Round'].includes(i.status)).length;
  const offers = internships.filter(i => i.status === 'Offer').length;
  const rejected = internships.filter(i => i.status === 'Rejected').length;
  const pending = internships.filter(i => ['Applied', 'OA Received', 'OA Completed'].includes(i.status)).length;

  const responseRate = applied > 0 ? Math.round(((interviews + offers + rejected) / applied) * 100) : 0;
  const interviewRate = applied > 0 ? Math.round(((interviews + offers) / applied) * 100) : 0;

  const statCards = [
    {
      label: 'Total Applications',
      value: applied,
      subtext: `${total} tracked total`,
      icon: Briefcase,
      color: 'from-blue-500/20 to-cyan-500/20 border-cyan-500/30 text-cyan-400',
    },
    {
      label: 'In Progress / Pending',
      value: pending,
      subtext: 'Awaiting response/OA',
      icon: Clock,
      color: 'from-purple-500/20 to-indigo-500/20 border-indigo-500/30 text-indigo-400',
    },
    {
      label: 'Interviews & Loops',
      value: interviews,
      subtext: `${interviewRate}% interview rate`,
      icon: Users,
      color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
    },
    {
      label: 'Offers Received',
      value: offers,
      subtext: 'Accepted / Under Review',
      icon: Trophy,
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
    },
    {
      label: 'Rejections',
      value: rejected,
      subtext: `${responseRate}% response rate`,
      icon: XCircle,
      color: 'from-rose-500/20 to-pink-500/20 border-rose-500/30 text-rose-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-8">
      {statCards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br bg-slate-900/60 p-4 border backdrop-blur-md transition-all hover:translate-y-[-2px] hover:shadow-lg ${c.color}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{c.label}</span>
              <Icon className="w-4 h-4 opacity-80" />
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight">{c.value}</div>
            <div className="text-[11px] text-slate-400 font-medium mt-1 truncate">{c.subtext}</div>
          </div>
        );
      })}
    </div>
  );
};
