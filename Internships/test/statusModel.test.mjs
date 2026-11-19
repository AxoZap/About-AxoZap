import test from 'node:test';
import assert from 'node:assert/strict';
import { changeOverallStatus, changeProgressStage, overallStatus, progressStage, statusCounts, applicationsInTimeFrame, flowTimeFrames, compareInternships } from '../src/utils/internship.ts';
import { buildApplicationFlow } from '../src/utils/applicationFlow.ts';

test('outcome changes preserve the stage and round and resume without advancing', () => {
  const initial = {status:'OA', interviewRound:'2'};
  for (const outcome of ['Rejected','Withdrawn','Bookmarked','Offer']) {
    const changed = {...initial, ...changeOverallStatus(initial, outcome), statusHistory:[{...initial}]};
    assert.equal(overallStatus(changed), outcome);
    const resumed = {...changed, ...changeOverallStatus(changed, 'Applied')};
    assert.equal(overallStatus(resumed), 'Applied');
    assert.equal(progressStage(resumed), 'Assessment');
    assert.equal(resumed.interviewRound, '2');
    assert.equal(buildApplicationFlow([resumed]).nodes.filter(n=>n.kind==='root').length,1);
  }
});

test('legacy withdrawals resume from their last saved stage and restore round', () => {
  const initial = {status:'Withdrawn', statusHistory:[{status:'Applied'},{status:'Interview Round',interviewRound:'3'},{status:'Withdrawn'}]};
  assert.deepEqual(changeOverallStatus(initial,'Applied'), {status:'Interview Round',interviewRound:'3',rejected:false,cancelled:false});
});

test('choosing a stage preserves its saved number and clears terminal flags', () => {
  const initial = {status:'OA', interviewRound:'2', rejected:true, statusHistory:[{status:'Interview Round',interviewRound:'1'}]};
  assert.deepEqual(changeProgressStage(initial,'Assessment'), {status:'OA',interviewRound:'2',rejected:false,cancelled:false});
  assert.equal(changeProgressStage(initial,'Interview').interviewRound,'1');
});

test('summary categories partition the entire tracker including legacy outcomes', () => {
  const records = [{status:'Applied'},{status:'OA'},{status:'Interview Round'},{status:'Offer'},{status:'Bookmarked'},{status:'OA',rejected:true},{status:'Withdrawn'},{status:'Interview Round',cancelled:true}];
  const counts = statusCounts(records);
  assert.deepEqual(counts,{Applied:3,Rejected:1,Withdrawn:2,Bookmarked:1,Offer:1});
  assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),records.length);
});

test('overall and each time frame use every status regardless of table filter', () => {
  const records = [{status:'Applied',season:'Summer 2027'},{status:'OA',rejected:true,season:'Summer 2027'},{status:'Interview Round',cancelled:true,season:'Winter 2026-2027'},{status:'Bookmarked',season:'Winter 2026-2027'}];
  assert.deepEqual(flowTimeFrames(records),['Winter 2026-2027','Summer 2027']);
  assert.equal(buildApplicationFlow(applicationsInTimeFrame(records,'All')).total,3);
  const summer = buildApplicationFlow(applicationsInTimeFrame(records,'Summer 2027'));
  assert.equal(summer.total,2);
  assert.equal(summer.nodes.find(n=>n.label==='Rejected').count,1);
  const winter = buildApplicationFlow(applicationsInTimeFrame(records,'Winter 2026-2027'));
  assert.equal(winter.total,1);
  assert.equal(winter.bookmarked,1);
  assert.equal(winter.nodes.find(n=>n.label==='Withdrawn').count,1);
  assert.equal(buildApplicationFlow(applicationsInTimeFrame(records,'Fall 2027')).total,0);
});

test('term chronology stays primary while the selected field and direction sort within terms', () => {
  const records = [
    {id:'summer-old',season:'Summer 2027',dateApplied:'2026-11-01',company:'Alpha'},
    {id:'fall',season:'Fall 2027',dateApplied:'2026-12-01',company:'Beta'},
    {id:'winter',season:'Winter 2026-2027',dateApplied:'2026-10-01',company:'Zebra'},
    {id:'summer-new',season:'Summer 2027',dateApplied:'2026-11-18',company:'Gamma'},
    {id:'spring',season:'Spring 2028',dateApplied:'2026-12-02',company:'Delta'},
  ];
  assert.deepEqual([...records].sort((a,b)=>compareInternships(a,b,'dateApplied','desc')).map(i=>i.id), ['winter','summer-new','summer-old','fall','spring']);
  assert.deepEqual([...records].sort((a,b)=>compareInternships(a,b,'company','asc')).map(i=>i.id), ['winter','summer-old','summer-new','fall','spring']);
});
