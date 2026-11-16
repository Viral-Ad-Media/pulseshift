import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act,fireEvent,render,screen,waitFor,within } from '@testing-library/react';
import { ScheduleBoard } from '../components/ScheduleBoard';
import { api } from '../services/api';
import { minimumShiftCoverage,occursOn,pendingScheduleChanges,scheduleRange } from '../services/scheduling';
import { Role,ScheduleData,ScheduledShift,User } from '../types';
vi.mock('../services/api',async importOriginal=>{
  const original=await importOriginal<typeof import('../services/api')>();
  return {...original,api:{...original.api,post:vi.fn()}};
});
const user:User={id:'nurse',name:'Jane',role:Role.NURSE,avatar:''};
const shift:ScheduledShift={id:'shift',title:'Ward care',role:'Nurse',department:'Ward A',location:'Main',requiredCount:1,
  localStart:'2027-01-11T08:00',localEnd:'2027-01-11T16:00',startsAt:'2027-01-11T14:00:00Z',endsAt:'2027-01-11T22:00:00Z',
  assignments:[{userId:'nurse',breakMinutes:0,breakStartMinutes:0}],requiresAcknowledgement:true};
const data:ScheduleData={revision:2,timezone:'America/Chicago',shifts:[shift],published:[{...shift,publicationVersion:2}],
  profiles:[{userId:'nurse',roles:['Nurse'],minRestHours:0,maxWeeklyHours:0}],templates:[],issues:[],acknowledgements:[]};
const props={orgId:'org',data,users:[user],currentUser:user,isAdmin:true,currentDate:new Date(2027,0,11),timeView:'DAY' as const,
  scope:'TEAM' as const,requests:[],onRefresh:vi.fn(async()=>{})};
beforeEach(()=>{vi.clearAllMocks();vi.mocked(api.post).mockResolvedValue({revision:3});});
it('staff see timed published assignments and acknowledge the exact publication',async()=>{
  render(<ScheduleBoard {...props} isAdmin={false}/>);
  expect(screen.getByText('08:00 – 16:00')).toBeTruthy();
  expect(screen.queryByRole('button',{name:'Add shift'})).toBeNull();
  expect(screen.queryByRole('button',{name:/Draft ·/})).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Acknowledge assignment'}));
  await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/orgs/org/schedule/shift/acknowledge',{publicationVersion:2}));
  expect(props.onRefresh).toHaveBeenCalledTimes(1);
});
it('an empty published schedule does not turn available staff into assigned staff',()=>{
  render(<ScheduleBoard {...props} isAdmin={false} data={{...data,published:[]}}/>);
  expect(screen.getByText('No published shifts yet')).toBeTruthy();
  expect(screen.queryByText('Ward care')).toBeNull();
});
it('draft preview is distinct from the published assignment',()=>{
  render(<ScheduleBoard {...props} data={{...data,shifts:[{...shift,title:'Draft ward care'}]}}/>);
  expect(screen.getByText('Ward care')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:/Draft · 1 changes/}));
  expect(screen.getByText('Draft ward care')).toBeTruthy();
  expect(screen.queryByText('Ward care')).toBeNull();
});
it('failed save retains the editor, blocks concurrent submissions, and reuses the operation key after refresh',async()=>{
  let reject!:(e:Error)=>void;
  vi.mocked(api.post).mockImplementationOnce(()=>new Promise((_,r)=>{reject=r;}));
  const {rerender}=render(<ScheduleBoard {...props}/>);
  fireEvent.click(screen.getByRole('button',{name:/Draft ·/}));
  fireEvent.click(screen.getByRole('button',{name:'Edit draft shift'}));
  const dialog=screen.getByRole('dialog',{name:'Edit draft shift'});
  fireEvent.change(within(dialog).getByLabelText('title'),{target:{value:'Preserved draft'}});
  fireEvent.submit(within(dialog).getByRole('button',{name:'Save draft shift'}).closest('form')!);
  fireEvent.submit(within(dialog).getByRole('button',{name:'Saving…'}).closest('form')!);
  expect(api.post).toHaveBeenCalledTimes(1);
  await act(async()=>reject(new Error('Connection lost')));
  expect((within(dialog).getByLabelText('title') as HTMLInputElement).value).toBe('Preserved draft');
  const originalBody=vi.mocked(api.post).mock.calls[0][1] as Record<string,unknown>;
  rerender(<ScheduleBoard {...props} data={{...data,revision:3}}/>);
  fireEvent.click(within(dialog).getByRole('button',{name:'Save draft shift'}));
  await waitFor(()=>expect(api.post).toHaveBeenCalledTimes(2));
  const retryBody=vi.mocked(api.post).mock.calls[1][1] as Record<string,unknown>;
  expect(retryBody.operationId).toBe(originalBody.operationId);
  expect(retryBody.revision).toBe(originalBody.revision);
  await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
});
it('coverage gaps require an explicit choice before publication',async()=>{
  const draft={...shift,requiredCount:2};
  render(<ScheduleBoard {...props} data={{...data,shifts:[draft],issues:[{shiftId:'shift',code:'COVERAGE',message:'Minimum coverage 1/2.'}]}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Review & publish'}));
  const dialog=screen.getByRole('dialog',{name:'Review schedule publication'});
  expect((within(dialog).getByRole('button',{name:'Publish schedule'}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(within(dialog).getByRole('checkbox'));
  fireEvent.click(within(dialog).getByRole('button',{name:'Publish schedule'}));
  await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/orgs/org/schedule',expect.objectContaining({action:'PUBLISH',allowGaps:true})));
});
it('blocking schedule conflicts cannot be overridden in the publication dialog',()=>{
  render(<ScheduleBoard {...props} data={{...data,shifts:[{...shift,title:'Changed'}],issues:[{shiftId:'shift',code:'OVERLAP',message:'Overlapping assignment.'}]}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Review & publish'}));
  expect((within(screen.getByRole('dialog')).getByRole('button',{name:'Publish schedule'}) as HTMLButtonElement).disabled).toBe(true);
  expect(within(screen.getByRole('dialog')).queryByRole('checkbox')).toBeNull();
});
it('week/month ranges and overnight inclusion do not depend on UTC date conversion',()=>{
  expect(scheduleRange(new Date(2027,0,13),'WEEK').days).toHaveLength(7);
  expect(scheduleRange(new Date(2027,1,15),'MONTH').days).toHaveLength(28);
  expect(occursOn({...shift,localStart:'2027-01-11T20:00',localEnd:'2027-01-12T04:00'},'2027-01-12')).toBe(true);
  expect(occursOn({...shift,localEnd:'2027-01-12T00:00'},'2027-01-12')).toBe(false);
});
it('staffing coverage counts staggered breaks and change detection ignores assignment ordering',()=>{
  const a={userId:'a',breakMinutes:30,breakStartMinutes:120};
  const b={userId:'b',breakMinutes:30,breakStartMinutes:150};
  expect(minimumShiftCoverage({...shift,assignments:[a,b]})).toBe(1);
  expect(minimumShiftCoverage({...shift,assignments:[a,{...b,breakStartMinutes:140}]})).toBe(0);
  expect(pendingScheduleChanges([{...shift,assignments:[a,b]}],[{...shift,assignments:[b,a],publicationVersion:5}])).toBe(0);
});
