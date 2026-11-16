import { ScheduledShift, TimeView } from '../types';
import { dateFromKey, formatDateKey } from './dates';
export const addDays = (key: string, count: number) => {
  const d = dateFromKey(key); d.setDate(d.getDate() + count); return formatDateKey(d);
};
export function scheduleRange(date: Date, view: TimeView) {
  let start = formatDateKey(date);
  if (view === 'WEEK') start = addDays(start, -((date.getDay() + 6) % 7));
  if (view === 'MONTH') start = `${start.slice(0, 7)}-01`;
  const end = view === 'MONTH'
    ? formatDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 1))
    : addDays(start, view === 'WEEK' ? 7 : 1);
  const days: string[] = [];
  for (let d = start; d < end; d = addDays(d, 1)) days.push(d);
  return { start, end, days };
}
export function occursOn(shift: ScheduledShift, day: string) {
  // Local wall-clock boundaries prevent browser timezone from moving shifts to another day.
  return shift.localStart < `${addDays(day, 1)}T00:00` && shift.localEnd > `${day}T00:00`;
}
export function minimumShiftCoverage(shift: ScheduledShift) {
  const duration = (Date.parse(shift.endsAt) - Date.parse(shift.startsAt)) / 60000;
  const points = [0, ...shift.assignments.filter(a => a.breakMinutes).flatMap(a => [a.breakStartMinutes, a.breakStartMinutes + a.breakMinutes])].filter(p => p < duration);
  return Math.min(shift.assignments.length, ...points.map(t => shift.assignments.filter(a => !a.breakMinutes || t < a.breakStartMinutes || t >= a.breakStartMinutes + a.breakMinutes).length));
}
export const shiftTimeLabel = (shift: ScheduledShift) => `${shift.localStart.slice(11)} – ${shift.localEnd.slice(11)}${shift.localStart.slice(0, 10) !== shift.localEnd.slice(0, 10) ? ' (+1 day)' : ''}`;
export const shiftFingerprint = (shift: ScheduledShift) => JSON.stringify([
  shift.title, shift.department, shift.location, shift.role, shift.requiredCount,
  shift.localStart, shift.localEnd, shift.requiresAcknowledgement,
  [...shift.assignments].sort((a,b)=>a.userId.localeCompare(b.userId)).map(a=>[a.userId,a.breakStartMinutes,a.breakMinutes]),
]);
export function pendingScheduleChanges(draft: ScheduledShift[], published: ScheduledShift[]) {
  return draft.filter(s => !published.some(p => p.id === s.id && shiftFingerprint(s) === shiftFingerprint(p))).length + published.filter(p => !draft.some(s => s.id === p.id)).length;
}
