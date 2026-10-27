import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApplicationFlow } from '../src/utils/applicationFlow.ts';

test('counts rejected applications at their recorded stage without inventing earlier stages', () => {
  const result = buildApplicationFlow([
    { status: 'Applied' }, { status: 'Applied', rejected: true },
    { status: 'OA', rejected: true },
    { status: 'Interview Round', rejected: true, interviewRound: 'Final' },
    { status: 'Offer' },
  ]);
  assert.equal(result.total, 5);
  assert.deepEqual(result.groups.map(group => [group.status, group.count]), [
    ['Applied', 2], ['OA', 1], ['Interview Round', 1], ['Offer', 1],
  ]);
  assert.deepEqual(result.groups[2].outcomes.map(outcome => [outcome.label, outcome.count]), [['Rejected', 1]]);
  assert.deepEqual(result.groups[3].outcomes.map(outcome => [outcome.label, outcome.count]), [['Offer received', 1]]);
  assert.equal(result.outcomes.filter(outcome => outcome.key === 'rejected').length, 1);
  assert.equal(result.outcomes.find(outcome => outcome.key === 'rejected').count, 3);
});

test('excludes bookmarks and preserves withdrawals as a separate status', () => {
  const result = buildApplicationFlow([
    { status: 'Bookmarked' }, { status: 'Bookmarked', rejected: true },
    { status: 'Withdrawn' }, { status: 'Withdrawn', rejected: true },
  ]);
  assert.equal(result.bookmarked, 2);
  assert.equal(result.total, 2);
  assert.deepEqual(result.groups.map(group => group.status), ['Withdrawn']);
  assert.deepEqual(result.groups[0].outcomes.map(outcome => [outcome.label, outcome.count]), [['Rejected', 1], ['Withdrawn', 1]]);
});

test('every application contributes exactly once to stage and outcome totals', () => {
  const statuses = ['Applied', 'OA', 'Interview Round', 'Offer', 'Withdrawn', 'Bookmarked'];
  const records = Array.from({ length: 217 }, (_, index) => ({
    status: statuses[index % statuses.length], rejected: index % 3 === 0,
  }));
  const result = buildApplicationFlow(records);
  assert.equal(result.total + result.bookmarked, records.length);
  assert.equal(result.outcomes.reduce((total, outcome) => total + outcome.count, 0), result.total);
  for (const group of result.groups) {
    assert.equal(group.count, group.outcomes.reduce((total, outcome) => total + outcome.count, 0));
    assert.ok(group.outcomes.every(outcome => outcome.count > 0));
  }
});

test('handles empty and entirely bookmarked trackers', () => {
  assert.deepEqual(buildApplicationFlow([]), { groups: [], outcomes: [], total: 0, bookmarked: 0 });
  assert.deepEqual(buildApplicationFlow([{ status: 'Bookmarked' }]), { groups: [], outcomes: [], total: 0, bookmarked: 1 });
});
