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

test('legacy and imported snapshots always start at Applied without inventing skipped assessments', () => {
  const record = application(['Interview Round']);
  record.statusHistory[0].baseline = true;
  const flow = buildApplicationFlow([record, { status: 'OA' }]);
  assert.equal(flow.baseline, 2);
  assert.equal(flow.nodes.filter(node => node.label === 'Applied').length, 1);
  assert.equal(flow.nodes.find(node => node.label === 'Applied').count, 2);
  assert.ok(!flow.nodes.some(node => node.label === 'Applications'));
  assert.ok(edges(flow).some(edge => edge[0] === 'Applied' && edge[1] === 'Interview'));
  assert.ok(edges(flow).some(edge => edge[0] === 'Applied' && edge[1] === 'Online assessment'));
});

test('ignores late Applied corrections and retains interview rounds with balanced flows', () => {
  const record = application(['Applied', 'OA', 'Applied', 'Interview Round', 'Interview Round']);
  record.statusHistory[3].interviewRound = '1';
  record.statusHistory[4].interviewRound = 'Final';
  record.interviewRound = 'Final';
  const flow = buildApplicationFlow([record]);
  assert.equal(flow.nodes.filter(node => node.label === 'Applied').length, 1);
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

test('repairs OA to Applied to OA into a single Applied to OA path', () => {
  const flow = buildApplicationFlow([application(['OA', 'Applied', 'OA'])]);
  assert.deepEqual(edges(flow), [
    ['Applied', 'Online assessment', 1], ['Online assessment', 'Assessment stage', 1],
  ]);
  const applied = flow.nodes.find(node => node.label === 'Applied');
  assert.ok(!flow.links.some(link => link.target === applied.key));
});

test('routes the pending band around OA instead of through its node', () => {
  const flow = buildApplicationFlow([
    ...Array.from({length:22}, () => application(['Applied'])),
    application(['Applied'], true), application(['Applied', 'OA']),
  ]);
  const layout = layoutApplicationFlow(flow);
  const applied = layout.nodes.find(node => node.label === 'Applied');
  const assessment = layout.nodes.find(node => node.label === 'Online assessment');
  assert.equal(applied.layer, 0);
  assert.equal(applied.count, 24);
  const pendingAtAssessment = layout.links.find(link => link.label === 'Applied → Awaiting response: 22' && link.targetNode.layer === assessment.layer);
  assert.ok(pendingAtAssessment);
  assert.ok(assessment.y >= pendingAtAssessment.targetY + pendingAtAssessment.height + 18);
  assert.equal(layout.nodes.filter(node => node.kind === 'root').length, 1);
});


test('retains repeated OA rounds without duplicating visits for rejection toggles', () => {
  const record = application(['Applied', 'OA', 'OA', 'OA']);
  record.statusHistory[1].interviewRound = '1';
  record.statusHistory[2].interviewRound = '2';
  record.statusHistory[3].interviewRound = '2';
  record.statusHistory[3].rejected = true;
  record.interviewRound = '2';
  const flow = buildApplicationFlow([record]);
  assert.ok(edges(flow).some(edge => edge[0] === 'Online assessment · 1' && edge[1] === 'Online assessment · 2'));
  assert.equal(flow.nodes.filter(node => node.kind === 'stage').length, 2);
});


test('cancellations merge separately from rejections and preserve stage and round paths', () => {
  const cancelled = [application(['Applied']), application(['Applied', 'OA']), application(['Applied', 'Interview Round'])];
  cancelled.forEach(record => { record.cancelled = true; });
  cancelled[2].interviewRound = 'Final';
  cancelled[2].statusHistory.at(-1).interviewRound = 'Final';
  cancelled[2].statusHistory.push({ ...cancelled[2].statusHistory.at(-1), cancelled: true });
  const flow = buildApplicationFlow([...cancelled, application(['Applied', 'OA'], true), { status: 'Bookmarked', cancelled: true }]);
  assert.equal(flow.total, 4);
  assert.equal(flow.nodes.find(node => node.label === 'Cancelled').count, 3);
  assert.equal(flow.nodes.find(node => node.label === 'Rejected').count, 1);
  assert.equal(flow.nodes.filter(node => node.label === 'Interview · Final').length, 1);
  assert.ok(edges(flow).some(([source, target]) => source === 'Interview · Final' && target === 'Cancelled'));
  const layout = layoutApplicationFlow(flow);
  assert.equal(layout.nodes.find(node => node.label === 'Cancelled').count, 3);
  for (const link of layout.links) assert.ok(link.sourceNode.layer < link.targetNode.layer);
});

test('undoing cancellation restores the current stage outcome without adding stage visits', () => {
  const record = application(['Applied', 'OA']);
  record.statusHistory.push({ ...record.statusHistory.at(-1), cancelled: true });
  record.statusHistory.push({ ...record.statusHistory.at(-1), cancelled: false });
  record.cancelled = false;
  const flow = buildApplicationFlow([record]);
  assert.ok(!flow.nodes.some(node => node.label === 'Cancelled'));
  assert.equal(flow.nodes.filter(node => node.label === 'Online assessment').length, 1);
  assert.ok(edges(flow).some(([source, target]) => source === 'Online assessment' && target === 'Assessment stage'));
});
