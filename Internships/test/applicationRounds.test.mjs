import test from 'node:test';
import assert from 'node:assert/strict';
import { savedStageRound } from '../src/utils/internship.ts';

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
