import { useEffect, useMemo, useRef } from 'react';
import { Download, X } from 'lucide-react';
import type { Internship } from '../types/internship';
import { buildApplicationFlow } from '../utils/applicationFlow';

interface ApplicationFlowModalProps {
  internships: Internship[];
  onClose: () => void;
}

// Every band uses the same scale, including very small outcomes.
function ribbon(x1: number, y1: number, x2: number, y2: number, height: number) {
  const middle = (x1 + x2) / 2;
  return `M${x1},${y1} C${middle},${y1} ${middle},${y2} ${x2},${y2} L${x2},${y2 + height} C${middle},${y2 + height} ${middle},${y1 + height} ${x1},${y1 + height} Z`;
}

export function ApplicationFlowModal({ internships, onClose }: ApplicationFlowModalProps) {
  const flow = useMemo(() => buildApplicationFlow(internships), [internships]);
  const svgRef = useRef<SVGSVGElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  const unit = flow.total ? Math.min(6, 200 / flow.total) : 0;
  function column<T extends { count: number }>(items: T[]) {
    const slots = items.map(item => Math.max(24, item.count * unit));
    const span = slots.reduce((total, slot) => total + slot, 0) + Math.max(0, items.length - 1) * 18;
    return { slots, span };
  }
  const stageColumn = column(flow.groups);
  const outcomeColumn = column(flow.outcomes);
  const span = Math.max(200, stageColumn.span, outcomeColumn.span);
  function position<T extends { count: number }>(items: T[], layout: { slots: number[]; span: number }) {
    let cursor = 60 + (span - layout.span) / 2;
    return items.map((item, index) => {
      const height = item.count * unit;
      const y = cursor + (layout.slots[index] - height) / 2;
      cursor += layout.slots[index] + 18;
      return { ...item, y, height };
    });
  }
  const groups = position(flow.groups, stageColumn);
  const outcomes = position(flow.outcomes, outcomeColumn);
  const targets = new Map(outcomes.map(outcome => [outcome.key, outcome.y]));
  const height = span + 100;
  const rootHeight = flow.total * unit;
  const rootY = 60 + (span - rootHeight) / 2;
  let rootOffset = rootY;

  function downloadSvg() {
    if (!svgRef.current) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svgRef.current)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'internship-application-flow.svg';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="application-flow-title" aria-describedby="application-flow-description" className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-3 p-5">
          <div>
            <h2 id="application-flow-title" className="text-lg font-semibold text-white">Application flow</h2>
            <p id="application-flow-description" className="mt-1 text-xs leading-relaxed text-slate-400">All applications, including rejections. Status shows the furthest recorded stage.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {flow.total > 0 && <button onClick={downloadSvg} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800"><Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">Download SVG</span><span className="sr-only sm:hidden">Download SVG</span></button>}
            <button ref={closeRef} onClick={onClose} aria-label="Close application flow" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
        </div>
        {flow.total > 0 ? <div className="mx-3 overflow-x-auto rounded-xl bg-white sm:mx-5">
          <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 1050 ${height}`} width="1050" height={height} role="img" aria-labelledby="flow-svg-title flow-svg-description" style={{ width: '100%', minWidth: 800, height: 'auto', fontFamily: 'Arial, sans-serif' }}>
            <title id="flow-svg-title">Internship application flow: {flow.total} applications</title>
            <desc id="flow-svg-description">Applications grouped by furthest recorded stage, then rejection outcome. {flow.groups.map(group => `${group.label}: ${group.count}; ${group.outcomes.map(outcome => `${outcome.label}: ${outcome.count}`).join(', ')}`).join('. ')}. {flow.bookmarked} bookmarks excluded.</desc>
            <rect width="1050" height={height} fill="white" />
            <g fill="#64748b" fontSize="11" letterSpacing="1.5">
              <text x="24" y="32">APPLICATIONS</text>
              <text x="450" y="32">FURTHEST STAGE</text>
              <text x="730" y="32">OUTCOME</text>
            </g>
            {groups.map(group => {
              const sourceY = rootOffset;
              rootOffset += group.height;
              let stageOffset = group.y;
              return <g key={group.status}>
                <path d={ribbon(174, sourceY, 450, group.y, group.height)} fill={group.color} fillOpacity="0.35"><title>{group.label}: {group.count}</title></path>
                {group.outcomes.map(outcome => {
                  const start = stageOffset;
                  const bandHeight = outcome.count * unit;
                  stageOffset = start + bandHeight;
                  const targetY = targets.get(outcome.key)!;
                  targets.set(outcome.key, targetY + bandHeight);
                  return <path key={outcome.key} d={ribbon(464, start, 730, targetY, bandHeight)} fill={group.color} fillOpacity="0.35"><title>{group.label} → {outcome.label}: {outcome.count}</title></path>;
                })}
                <rect x="450" y={group.y} width="14" height={group.height} fill={group.color} />
              </g>;
            })}
            {outcomes.map(outcome => <rect key={outcome.key} x="730" y={outcome.y} width="14" height={outcome.height} fill={outcome.color} />)}
            <rect x="160" y={rootY} width="14" height={rootHeight} fill="#94a3b8" />
            <g fill="#1e293b" fontSize="14" stroke="white" strokeWidth="4" paintOrder="stroke" strokeLinejoin="round">
              <text x="24" y={rootY + rootHeight / 2 - 3}>Applications</text>
              <text x="24" y={rootY + rootHeight / 2 + 18} fontWeight="bold">{flow.total}</text>
              {groups.map(group => <text key={group.status} x="476" y={group.y + group.height / 2 + 5}>{group.label} ({group.count})</text>)}
              {outcomes.map(outcome => <text key={outcome.key} x="756" y={outcome.y + outcome.height / 2 + 5}>{outcome.label} ({outcome.count})</text>)}
            </g>
          </svg>
        </div> : <div className="mx-5 rounded-xl border border-dashed border-slate-700 p-12 text-center text-sm text-slate-400">Add an application to generate a diagram.</div>}
        <p className="px-5 py-4 text-xs leading-relaxed text-slate-400">{flow.bookmarked > 0 ? `${flow.bookmarked} bookmarked ${flow.bookmarked === 1 ? 'position' : 'positions'} excluded. ` : ''}Band widths show application counts. Rejections from every stage join one endpoint; hover a band for its count.</p>
      </div>
    </div>
  );
}
