import { useEffect, useMemo, useRef } from 'react';
import { Download, X } from 'lucide-react';
import type { Internship } from '../types/internship';
import { buildApplicationFlow, layoutApplicationFlow } from '../utils/applicationFlow';

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

  const layout = useMemo(() => layoutApplicationFlow(flow), [flow]);

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
            <p id="application-flow-description" className="mt-1 text-xs leading-relaxed text-slate-400">Recorded stage changes, including skipped stages and rejections.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {flow.total > 0 && <button onClick={downloadSvg} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800"><Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">Download SVG</span><span className="sr-only sm:hidden">Download SVG</span></button>}
            <button ref={closeRef} onClick={onClose} aria-label="Close application flow" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
        </div>
        {flow.total > 0 ? <div className="mx-3 overflow-x-auto rounded-xl bg-white sm:mx-5">
          <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${layout.width} ${layout.height}`} width={layout.width} height={layout.height} role="img" aria-labelledby="flow-svg-title flow-svg-description" style={{ width: '100%', minWidth: Math.max(800, layout.width * 0.75), height: 'auto', fontFamily: 'Arial, sans-serif' }}>
            <title id="flow-svg-title">Internship application flow: {flow.total} applications</title>
            <desc id="flow-svg-description">Recorded application paths. {layout.links.map(link => `${link.sourceNode.label} to ${link.targetNode.label}: ${link.count}`).join('. ')}. {flow.baseline} applications have unknown earlier history. {flow.bookmarked} bookmarks excluded.</desc>
            <rect width={layout.width} height={layout.height} fill="white" />
            <g fill="#64748b" fontSize="11" letterSpacing="1.5">
              <text x="24" y="32">APPLICATIONS</text>
              <text x="400" y="32">RECORDED PROGRESS</text>
              <text x={layout.width - 270} y="32">OUTCOME</text>
            </g>
            {layout.links.map(link => <path
              key={JSON.stringify([link.source, link.target])}
              d={ribbon(link.sourceNode.x + 14, link.sourceY, link.targetNode.x, link.targetY, link.height)}
              fill={link.sourceNode.kind === 'root' ? link.targetNode.color : link.sourceNode.color} fillOpacity="0.35"
            ><title>{link.sourceNode.label} → {link.targetNode.label}: {link.count}</title></path>)}
            {layout.nodes.map(node => <rect key={node.key} x={node.x} y={node.y} width="14" height={node.height} fill={node.color} />)}
            <g fill="#1e293b" fontSize="14" stroke="white" strokeWidth="4" paintOrder="stroke" strokeLinejoin="round">
              {layout.nodes.map(node => node.kind === 'root' ? <g key={node.key}>
                <text x="24" y={node.y + node.height / 2 - 3}>Applications</text>
                <text x="24" y={node.y + node.height / 2 + 18} fontWeight="bold">{flow.total}</text>
              </g> : <text key={node.key} x={node.x + 26} y={node.y + node.height / 2 + 5}>
                <title>{node.label} ({node.count})</title>{node.label.length > 25 ? `${node.label.slice(0, 24)}…` : node.label} ({node.count})
              </text>)}
            </g>
          </svg>
        </div> : <div className="mx-5 rounded-xl border border-dashed border-slate-700 p-12 text-center text-sm text-slate-400">Add an application to generate a diagram.</div>}
        <p className="px-5 py-4 text-xs leading-relaxed text-slate-400">{flow.bookmarked > 0 ? `${flow.bookmarked} bookmarked ${flow.bookmarked === 1 ? 'position' : 'positions'} excluded. ` : ''}Band widths show counts. Skipped stages connect directly; all rejections join one endpoint. Hover a band for details.{flow.baseline > 0 && ` Earlier stages for ${flow.baseline} existing ${flow.baseline === 1 ? 'application were' : 'applications were'} not saved; ${flow.baseline === 1 ? 'its path starts' : 'their paths start'} at the first recorded status.`}</p>
      </div>
    </div>
  );
}
