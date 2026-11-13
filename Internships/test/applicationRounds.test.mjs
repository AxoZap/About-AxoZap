import test from 'node:test';
import assert from 'node:assert/strict';
import { savedStageRound, matchesStatusFilter } from '../src/utils/internship.ts';

test('reselecting OA or Interview keeps the saved number unchanged', () => {
  for (const status of ['OA', 'Interview Round']) {
    const item = {status, interviewRound:'2'};
    assert.equal(savedStageRound(item,status),'2');
    assert.equal(savedStageRound({status},status),'');
  }
});

test('restores a previous stage round without inventing a count', () => {
  const item = {status:'Interview Round',interviewRound:'3',statusHistory:[{status:'OA',interviewRound:'2'},{status:'Interview Round',interviewRound:'3'}]};
  assert.equal(savedStageRound(item,'OA'),'2');
  assert.equal(savedStageRound(item,'Applied'),'');
  assert.equal(savedStageRound({status:'Applied'},'Interview Round'),'');
});


test('cancelled applications only appear in their own filter, regardless of stored stage', () => {
  for (const status of ['Applied', 'OA', 'Interview Round', 'Offer', 'Withdrawn', 'Bookmarked']) {
    const item = { status, cancelled: true };
    for (const filter of ['All', 'Applied', 'OA', 'Interview Round', 'Offer', 'Rejected', 'Withdrawn', 'Bookmarked']) {
      assert.equal(matchesStatusFilter(item, filter), false, `${status} in ${filter}`);
    }
    assert.equal(matchesStatusFilter(item, 'Cancelled'), true);
    assert.equal(matchesStatusFilter({ ...item, cancelled: false }, 'Cancelled'), false);
  }
  assert.equal(matchesStatusFilter({status: 'OA', cancelled: false}, 'All'), true);
  assert.equal(matchesStatusFilter({status: 'OA', cancelled: false}, 'OA'), true);
  assert.equal(matchesStatusFilter({status: 'OA', rejected: true}, 'Rejected'), true);
  assert.equal(matchesStatusFilter({status: 'OA', rejected: true}, 'All'), false);
});
