import { ScheduledShift } from "../types";
import { TimeEntry, WorkforceData } from "./workforce";
import { monthBounds } from "./dashboard";

export interface AttendanceRow {
  id: string;
  userId: string;
  shift: ScheduledShift | null;
  records: TimeEntry[];
  response: "ACCEPTED" | "DECLINED" | "AWAITING" | "UNKNOWN";
  historical?: boolean;
  responseVersion?: number;
  previousResponse?: { decision: string; version: number };
}

// An assignment exists before attendance does. Keep both, including time records
// whose original assignment has since been removed from the published schedule.
export function attendanceRows(
  shifts: ScheduledShift[],
  data: WorkforceData,
  month: string,
  timezone: string,
): AttendanceRow[] {
  const bounds = monthBounds(month, timezone);
  const allowed = (department: string) =>
    data.permissions.admin || data.permissions.departments.includes(department);
  const overlaps = (start: string, end: string | null) =>
    Date.parse(start) < bounds.end &&
    Date.parse(end || new Date().toISOString()) > bounds.start;
  const records = data.timesheets.filter((t) => allowed(t.department));
  const linked = new Set<string>();
  const rows: AttendanceRow[] = [];
  for (const shift of shifts.filter((s) => allowed(s.department))) {
    for (const assignment of shift.assignments) {
      const ownRecords = records.filter(
        (t) => t.shiftId === shift.id && t.userId === assignment.userId,
      );
      if (
        !overlaps(shift.startsAt, shift.endsAt) &&
        !ownRecords.some((t) => overlaps(t.clockIn, t.clockOut))
      )
        continue;
      ownRecords.forEach((t) => linked.add(t.id));
      const response = data.assignmentResponses.find(
        (r) =>
          r.shiftId === shift.id &&
          r.userId === assignment.userId &&
          r.publicationVersion === shift.publicationVersion,
      );
      rows.push({
        id: `${shift.id}:${assignment.userId}`,
        userId: assignment.userId,
        shift,
        records: ownRecords,
        previousResponse: !response
          ? (() => {
              const previous = data.assignmentResponses
                .filter(
                  (r) =>
                    r.shiftId === shift.id &&
                    r.userId === assignment.userId &&
                    r.publicationVersion !== shift.publicationVersion,
                )
                .sort((a, b) => b.publicationVersion - a.publicationVersion)[0];
              return previous
                ? {
                    decision: previous.decision,
                    version: previous.publicationVersion,
                  }
                : undefined;
            })()
          : undefined,
        response:
          response?.decision === "ACCEPT"
            ? "ACCEPTED"
            : response?.decision === "DECLINE"
              ? "DECLINED"
              : "AWAITING",
      });
    }
  }
  // A replacement search, removal or swap can remove someone from the live
  // assignment list. Their saved response must remain visible as history.
  for (const shift of shifts.filter((s) => allowed(s.department))) {
    const latest = new Map<
      string,
      WorkforceData["assignmentResponses"][number]
    >();
    for (const response of data.assignmentResponses.filter(
      (r) => r.shiftId === shift.id,
    )) {
      if (shift.assignments.some((a) => a.userId === response.userId)) continue;
      const previous = latest.get(response.userId);
      if (
        !previous ||
        response.publicationVersion > previous.publicationVersion
      )
        latest.set(response.userId, response);
    }
    for (const response of latest.values()) {
      const ownRecords = records.filter(
        (t) =>
          !linked.has(t.id) &&
          t.shiftId === shift.id &&
          t.userId === response.userId,
      );
      if (
        !overlaps(shift.startsAt, shift.endsAt) &&
        !ownRecords.some((t) => overlaps(t.clockIn, t.clockOut))
      )
        continue;
      ownRecords.forEach((t) => linked.add(t.id));
      rows.push({
        id: `history:${shift.id}:${response.userId}`,
        userId: response.userId,
        shift,
        records: ownRecords,
        historical: true,
        responseVersion: response.publicationVersion,
        response:
          response.decision === "ACCEPT"
            ? "ACCEPTED"
            : response.decision === "DECLINE"
              ? "DECLINED"
              : "UNKNOWN",
      });
    }
  }
  for (const record of records.filter(
    (t) => !linked.has(t.id) && overlaps(t.clockIn, t.clockOut),
  )) {
    const id = `record:${record.shiftId}:${record.userId}`;
    const existing = rows.find((r) => r.id === id);
    if (existing) existing.records.push(record);
    else
      rows.push({
        id,
        userId: record.userId,
        shift: null,
        records: [record],
        response: "UNKNOWN",
      });
  }
  return rows.sort(
    (a, b) =>
      (a.shift?.startsAt || a.records[0].clockIn).localeCompare(
        b.shift?.startsAt || b.records[0].clockIn,
      ) || a.userId.localeCompare(b.userId),
  );
}

export function recordedHours(record: TimeEntry): number | null {
  if (!record.clockOut) return null;
  const duration = Date.parse(record.clockOut) - Date.parse(record.clockIn);
  const breaks = record.breaks.reduce(
    (sum, b) => sum + (b.end ? Date.parse(b.end) - Date.parse(b.start) : 0),
    0,
  );
  return Math.max(0, duration - breaks) / 3600000;
}
