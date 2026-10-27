import type { ApplicationStatus, Internship } from '../types/internship';

const stages: { status: ApplicationStatus; label: string; pending: string; color: string }[] = [
  { status: 'Applied', label: 'Applied', pending: 'Awaiting response', color: '#d99b35' },
  { status: 'OA', label: 'Online assessment', pending: 'Assessment stage', color: '#5695c8' },
  { status: 'Interview Round', label: 'Interview', pending: 'Interviewing', color: '#8b78d2' },
  { status: 'Offer', label: 'Offer', pending: 'Offer received', color: '#41a584' },
  { status: 'Withdrawn', label: 'Withdrawn', pending: 'Withdrawn', color: '#8493a6' },
];

export interface FlowNode {
  key: string;
  label: string;
  color: string;
  count: number;
  layer: number;
  order: number;
  kind: 'root' | 'stage' | 'outcome';
}

export interface FlowLink {
  source: string;
  target: string;
  count: number;
}

export function buildApplicationFlow(internships: Internship[]) {
  const nodes = new Map<string, FlowNode>();
  const links = new Map<string, FlowLink>();
  let total = 0;
  let baseline = 0;
  const root: FlowNode = { key: 'applied', label: 'Applied', color: '#d99b35', count: 0, layer: 0, order: 0, kind: 'root' };
  nodes.set(root.key, root);

  function visit(node: FlowNode) {
    const previous = nodes.get(node.key);
    if (previous) previous.count += 1;
    else nodes.set(node.key, { ...node, count: 1 });
  }
  function connect(source: string, target: string) {
    const key = JSON.stringify([source, target]);
    const previous = links.get(key);
    if (previous) previous.count += 1;
    else links.set(key, { source, target, count: 1 });
  }

  function reaches(start: string, target: string): boolean {
    const pending = [start];
    const seen = new Set<string>();
    while (pending.length) {
      const key = pending.pop()!;
      if (key === target) return true;
      if (seen.has(key)) continue;
      seen.add(key);
      for (const link of links.values()) if (link.source === key) pending.push(link.target);
    }
    return false;
  }

  for (const internship of internships) {
    if (internship.status === 'Bookmarked') continue;
    const currentStage = stages.find(stage => stage.status === internship.status);
    if (!currentStage) continue;
    total += 1;
    if (!internship.statusHistory?.length || internship.statusHistory[0].baseline) baseline += 1;

    // Rejection toggles and unrelated edits do not create duplicate stage visits.
    // Applied is always the starting stage, including imported and legacy records.
    const path: { status: ApplicationStatus; round: string }[] = [{ status: 'Applied', round: '' }];
    const entries = [...(internship.statusHistory ?? []), internship];
    for (const entry of entries) {
      if (entry.status === 'Applied' || entry.status === 'Withdrawn' || !stages.some(stage => stage.status === entry.status)) continue;
      const round = entry.status === 'Interview Round' ? entry.interviewRound?.trim() || '' : '';
      const previous = path[path.length - 1];
      if (previous?.status !== entry.status || previous.round !== round) path.push({ status: entry.status, round });
    }
    let previousKey = root.key;
    path.slice(1).forEach((entry, index) => {
      const order = stages.findIndex(stage => stage.status === entry.status);
      const stage = stages[order];
      // Share a stage across paths, including paths that skipped an earlier stage.
      // Only a return that would create a cycle needs another visible visit.
      const baseKey = JSON.stringify(['stage', entry.status, entry.round]);
      let key = baseKey;
      let attempt = 0;
      while (reaches(key, previousKey)) {
        key = JSON.stringify(['return', path.slice(0, index + 1), attempt++]);
      }
      visit({ key, label: entry.round ? `${stage.label} · ${entry.round}` : stage.label, color: stage.color, layer: index + 1, order, kind: 'stage', count: 0 });
      connect(previousKey, key);
      previousKey = key;
    });
    const key = internship.rejected ? 'outcome:rejected' : `outcome:${internship.status}`;
    visit({
      key, label: internship.rejected ? 'Rejected' : currentStage.pending,
      color: internship.rejected ? '#d46d7e' : currentStage.color,
      layer: 0, order: internship.rejected ? -1 : stages.indexOf(currentStage), kind: 'outcome', count: 0,
    });
    connect(previousKey, key);
  }
  root.count = total;
  const resultNodes = total ? [...nodes.values()] : [];
  // Longest-path layering places shared stages after all their recorded inputs.
  const indegrees = new Map(resultNodes.map(node => [node.key, 0]));
  for (const link of links.values()) indegrees.set(link.target, indegrees.get(link.target)! + 1);
  const ready = resultNodes.filter(node => indegrees.get(node.key) === 0);
  for (const node of resultNodes) node.layer = node.kind === 'stage' ? node.order + 1 : 0;
  while (ready.length) {
    const node = ready.shift()!;
    for (const link of links.values()) {
      if (link.source !== node.key) continue;
      const target = nodes.get(link.target)!;
      target.layer = Math.max(target.layer, node.layer + 1);
      indegrees.set(target.key, indegrees.get(target.key)! - 1);
      if (indegrees.get(target.key) === 0) ready.push(target);
    }
  }
  const depth = Math.max(0, ...resultNodes.filter(node => node.kind === 'stage').map(node => node.layer));
  for (const node of resultNodes) if (node.kind === 'outcome') node.layer = depth + 1;
  const usedLayers = [...new Set(resultNodes.map(node => node.layer))].sort((a, b) => a - b);
  for (const node of resultNodes) node.layer = usedLayers.indexOf(node.layer);
  return {
    nodes: resultNodes,
    links: [...links.values()],
    total,
    baseline,
    bookmarked: internships.filter(item => item.status === 'Bookmarked').length,
  };
}

export function layoutApplicationFlow(flow: ReturnType<typeof buildApplicationFlow>) {
  const unit = flow.total ? Math.min(6, 200 / flow.total) : 0;
  const maxLayer = Math.max(0, ...flow.nodes.map(node => node.layer));
  const width = Math.max(1050, 430 + maxLayer * 230);
  const originalNodes = new Map(flow.nodes.map(node => [node.key, node]));
  const expandedNodes = flow.nodes.map(node => ({
    ...node, virtual: false, slotOrder: node.kind === 'stage' ? node.order - 0.5 : node.order,
  }));
  const segments: (FlowLink & { color: string; label: string })[] = [];

  // Long bands reserve space in every column they cross. Invisible waypoints
  // keep a pending/outcome band from running through an assessment or interview.
  flow.links.forEach((link, linkIndex) => {
    const source = originalNodes.get(link.source)!;
    const target = originalNodes.get(link.target)!;
    const color = source.kind === 'root' ? target.color : source.color;
    const label = `${source.label} → ${target.label}: ${link.count}`;
    let previous = source.key;
    for (let layer = source.layer + 1; layer < target.layer; layer += 1) {
      const key = JSON.stringify(['waypoint', linkIndex, layer]);
      expandedNodes.push({
        ...target, key, layer, count: link.count, virtual: true,
        slotOrder: target.kind === 'stage' ? target.order - 0.5 : target.order,
      });
      segments.push({ source: previous, target: key, count: link.count, color, label });
      previous = key;
    }
    segments.push({ source: previous, target: target.key, count: link.count, color, label });
  });

  const columns = Array.from({ length: maxLayer + 1 }, (_, layer) => {
    const nodes = expandedNodes.filter(node => node.layer === layer).sort((a, b) =>
      a.slotOrder - b.slotOrder || a.label.localeCompare(b.label) || a.key.localeCompare(b.key));
    const slots = nodes.map(node => Math.max(24, node.count * unit));
    const span = slots.reduce((total, slot) => total + slot, 0) + Math.max(0, nodes.length - 1) * 18;
    return { nodes, slots, span };
  });
  const span = Math.max(200, ...columns.map(column => column.span));
  const positionedNodes = columns.flatMap((column, layer) => {
    let cursor = 60 + (span - column.span) / 2;
    return column.nodes.map((node, index) => {
      const height = node.count * unit;
      const result = { ...node, x: 160 + (maxLayer ? layer * (width - 430) / maxLayer : 0), y: cursor + (column.slots[index] - height) / 2, height };
      cursor += column.slots[index] + 18;
      return result;
    });
  });
  const nodeMap = new Map(positionedNodes.map(node => [node.key, node]));
  const sourceOffsets = new Map<typeof segments[number], number>();
  const targetOffsets = new Map<typeof segments[number], number>();
  for (const node of positionedNodes) {
    let sourceY = node.y;
    const outgoing = segments.filter(link => link.source === node.key).sort((a, b) => nodeMap.get(a.target)!.y - nodeMap.get(b.target)!.y);
    for (const link of outgoing) { sourceOffsets.set(link, sourceY); sourceY += link.count * unit; }
    let targetY = node.y;
    const incoming = segments.filter(link => link.target === node.key).sort((a, b) => nodeMap.get(a.source)!.y - nodeMap.get(b.source)!.y);
    for (const link of incoming) { targetOffsets.set(link, targetY); targetY += link.count * unit; }
  }
  const links = segments.map(link => ({
    ...link, sourceNode: nodeMap.get(link.source)!, targetNode: nodeMap.get(link.target)!,
    sourceY: sourceOffsets.get(link)!, targetY: targetOffsets.get(link)!, height: link.count * unit,
  }));
  return { nodes: positionedNodes.filter(node => !node.virtual), links, width, height: span + 100 };
}
