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


test('all five overall statuses and three Applied progress filters are mutually consistent', () => {
  const statuses = [
    [{status:'Applied'}, 'Applied', 'Application'],
    [{status:'OA',interviewRound:'2'}, 'Applied', 'Assessment'],
    [{status:'Interview Round'}, 'Applied', 'Interview'],
    [{status:'OA',rejected:true}, 'Rejected'],
    [{status:'Interview Round',cancelled:true}, 'Withdrawn'],
    [{status:'Withdrawn'}, 'Withdrawn'],
    [{status:'Bookmarked'}, 'Bookmarked'],
    [{status:'Offer'}, 'Offer'],
  ];
  for (const [item, main, stage] of statuses) {
    assert.equal(matchesStatusFilter(item,'All'),true);
    for (const filter of ['Applied','Rejected','Withdrawn','Bookmarked','Offer','Application','Assessment','Interview']) {
      assert.equal(matchesStatusFilter(item,filter), filter === main || filter === stage, `${JSON.stringify(item)} in ${filter}`);
    }
  }
});
