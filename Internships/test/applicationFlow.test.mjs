import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApplicationFlow, layoutApplicationFlow } from '../src/utils/applicationFlow.ts';

function application(path, rejected = false) {
  return { status: path.at(-1), rejected, statusHistory: path.map(status => ({ status, rejected: false, baseline: false, recordedAt: '2026-10-27T12:00:00Z' })) };
}
function edges(flow) {
  const labels = new Map(flow.nodes.map(node => [node.key, node.label]));
  return flow.links.map(link => [labels.get(link.source), labels.get(link.target), link.count]);
}

test('connects assessment from Applied and connects skipped stages directly', () => {
  const flow = buildApplicationFlow([
    application(['Applied', 'OA', 'Interview Round']),
    application(['Applied', 'Interview Round']),
    application(['Applied', 'Offer']),
  ]);
  const paths = edges(flow);
  assert.equal(flow.total, 3);
  assert.equal(flow.baseline, 0);
  assert.equal(flow.nodes.filter(node => node.kind === 'stage' && node.label === 'Interview').length, 1);
  assert.equal(flow.nodes.find(node => node.kind === 'stage' && node.label === 'Interview').count, 2);
  assert.ok(paths.some(edge => JSON.stringify(edge) === JSON.stringify(['Applied', 'Online assessment', 1])));
  assert.ok(paths.some(edge => JSON.stringify(edge) === JSON.stringify(['Applied', 'Interview', 1])));
  assert.ok(paths.some(edge => JSON.stringify(edge) === JSON.stringify(['Applied', 'Offer', 1])));
  assert.ok(!paths.some(edge => edge[0] === 'Online assessment' && edge[1] === 'Offer'));
});

test('all rejection routes merge at one endpoint without adding visits for rejection toggles', () => {
  const records = [application(['Applied'], true), application(['Applied', 'OA'], true), application(['Applied', 'Interview Round'], true)];
  records[1].statusHistory.push({ ...records[1].statusHistory.at(-1), rejected: true });
  const flow = buildApplicationFlow(records);
  const endpoint = flow.nodes.filter(node => node.label === 'Rejected');
  assert.equal(endpoint.length, 1);
  assert.equal(endpoint[0].count, 3);
  assert.equal(flow.links.filter(link => link.target === endpoint[0].key).length, 3);
  assert.equal(flow.nodes.filter(node => node.label === 'Online assessment').length, 1);
});

test('baseline snapshots start at the known stage without inventing an application or assessment visit', () => {
  const record = application(['Interview Round']);
  record.statusHistory[0].baseline = true;
  const flow = buildApplicationFlow([record, { status: 'OA' }]);
  assert.equal(flow.baseline, 2);
  assert.ok(!flow.nodes.some(node => node.label === 'Applied'));
  assert.deepEqual(edges(flow).filter(edge => edge[0] === 'Applications'), [['Applications', 'Interview', 1], ['Applications', 'Online assessment', 1]]);
});

test('retains revisited stages and interview rounds with acyclic, balanced flows', () => {
  const record = application(['Applied', 'OA', 'Applied', 'Interview Round', 'Interview Round']);
  record.statusHistory[3].interviewRound = '1';
  record.statusHistory[4].interviewRound = 'Final';
  record.interviewRound = 'Final';
  const flow = buildApplicationFlow([record]);
  assert.equal(flow.nodes.filter(node => node.label === 'Applied').length, 2);
  assert.ok(edges(flow).some(edge => edge[0] === 'Interview · 1' && edge[1] === 'Interview · Final'));
  const layout = layoutApplicationFlow(flow);
  for (const link of layout.links) {
    assert.ok(link.sourceNode.layer < link.targetNode.layer);
    for (const value of [link.sourceY, link.targetY, link.height]) assert.ok(Number.isFinite(value));
  }
  for (const node of flow.nodes) {
    const incoming = flow.links.filter(link => link.target === node.key).reduce((sum, link) => sum + link.count, 0);
    const outgoing = flow.links.filter(link => link.source === node.key).reduce((sum, link) => sum + link.count, 0);
    if (node.kind !== 'root') assert.equal(incoming, node.count);
    if (node.kind !== 'outcome') assert.equal(outgoing, node.count);
  }
});

test('counts withdrawals once and excludes bookmarks including bookmarked history', () => {
  const flow = buildApplicationFlow([application(['Applied', 'Withdrawn']), application(['Bookmarked', 'Applied']), { status: 'Bookmarked' }]);
  assert.equal(flow.total, 2);
  assert.equal(flow.bookmarked, 1);
  assert.equal(flow.nodes.filter(node => node.kind === 'outcome').reduce((sum, node) => sum + node.count, 0), 2);
  assert.ok(!flow.nodes.some(node => node.label === 'Bookmarked'));
});

test('handles empty and entirely bookmarked trackers', () => {
  assert.deepEqual(buildApplicationFlow([]), { nodes: [], links: [], total: 0, baseline: 0, bookmarked: 0 });
  assert.equal(buildApplicationFlow([{ status: 'Bookmarked' }]).total, 0);
  assert.ok(Number.isFinite(layoutApplicationFlow(buildApplicationFlow([])).height));
});
