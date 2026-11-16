import { ScheduledShift } from "../types";
import { TimeEntry, WorkforceData } from "./workforce";
const localDate = (ms: number, zone: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
export function monthBounds(month: string, zone: string) {
  const [y, m] = month.split("-").map(Number);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const first = month + "-01";
  const midnight = (day: string) => {
    const utc = Date.parse(day + "T00:00Z");
    let low = utc - 2 * 86400000,
      high = utc + 2 * 86400000;
    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      if (localDate(mid, zone) < day) low = mid + 1;
      else high = mid;
    }
    return localDate(low, zone) >= day ? low : high;
  };
  return { start: midnight(first), end: midnight(next) };
}
export function intervalHours(
  start: number,
  end: number,
  breaks: Array<{ start: number; end: number }>,
  from: number,
  to: number,
) {
  const left = Math.max(start, from),
    right = Math.min(end, to);
  if (right <= left) return 0;
  const stopped = breaks.reduce(
    (sum, b) =>
      sum + Math.max(0, Math.min(right, b.end) - Math.max(left, b.start)),
    0,
  );
  return Math.max(0, right - left - stopped) / 3600000;
}
export function monthlyHours(
  shifts: ScheduledShift[],
  userId: string,
  month: string,
  zone: string,
  wf: WorkforceData | null,
  now = Date.now(),
) {
  const bounds = monthBounds(month, zone);
  let planned = 0,
    confirmed = 0,
    estimatedToDate = 0,
    recorded = 0,
    approved = 0;
  for (const s of shifts) {
    const a = s.assignments.find((a) => a.userId === userId);
    if (!a) continue;
    const start = Date.parse(s.startsAt),
      end = Date.parse(s.endsAt);
    const breaks = a.breakMinutes
      ? [
          {
            start: start + a.breakStartMinutes * 60000,
            end: start + (a.breakStartMinutes + a.breakMinutes) * 60000,
          },
        ]
      : [];
    const hours = intervalHours(start, end, breaks, bounds.start, bounds.end);
    planned += hours;
    estimatedToDate += intervalHours(
      start,
      end,
      breaks,
      bounds.start,
      Math.min(bounds.end, now),
    );
    if (
      wf?.assignmentResponses.some(
        (r) =>
          r.shiftId === s.id &&
          r.userId === userId &&
          r.publicationVersion === s.publicationVersion &&
          r.decision === "ACCEPT",
      )
    )
      confirmed += hours;
  }
  for (const t of wf?.timesheets.filter((t) => t.userId === userId) || []) {
    const end = t.clockOut ? Date.parse(t.clockOut) : now;
    const breaks = t.breaks.map((b) => ({
      start: Date.parse(b.start),
      end: b.end ? Date.parse(b.end) : now,
    }));
    const hours = intervalHours(
      Date.parse(t.clockIn),
      end,
      breaks,
      bounds.start,
      bounds.end,
    );
    recorded += hours;
    if (t.status === "APPROVED") approved += hours;
  }
  return {
    planned,
    confirmed: wf ? confirmed : null,
    estimatedToDate,
    recorded: wf ? recorded : null,
    approved: wf ? approved : null,
  };
}
export const offlineKey = (user: string, org: string) =>
  `pulseshift-offline:${user}:${org}`;
export function saveScheduleSnapshot(
  userId: string,
  orgId: string,
  orgName: string,
  timezone: string,
  shifts: ScheduledShift[],
  names: Record<string, string>,
) {
  const snapshot = {
    userId,
    orgId,
    orgName,
    timezone,
    savedAt: new Date().toISOString(),
    shifts,
    names,
  };
  localStorage.setItem(offlineKey(userId, orgId), JSON.stringify(snapshot));
  localStorage.setItem("pulseshift-offline-last", offlineKey(userId, orgId));
  return snapshot;
}
export function clearScheduleSnapshots() {
  for (const key of Object.keys(localStorage))
    if (key.startsWith("pulseshift-offline")) localStorage.removeItem(key);
}

export function offlineHTML(snapshot: ReturnType<typeof saveScheduleSnapshot>) {
  const esc = (value: unknown) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  const shifts = snapshot.shifts
    .map(
      (s) =>
        `<article><h2>${esc(s.title)}</h2><p>${esc(s.localStart.replace("T", " "))} – ${esc(s.localEnd.replace("T", " "))} (${esc(snapshot.timezone)})</p><p>${esc(s.department)} · ${esc(s.location)}</p><p>${s.assignments.map((a) => esc(snapshot.names[a.userId] || "Staff")).join(", ") || "Open shift"}</p></article>`,
    )
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>PulseShift offline schedule</title><style>body{font:16px system-ui;margin:0;background:#f8fafc;color:#0f172a}main{max-width:850px;margin:auto;padding:24px}article{background:white;border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin:14px 0}h2{font-size:18px}aside{padding:16px;background:#fef3c7;border-radius:12px;line-height:1.6}</style></head><body><main><h1>${esc(snapshot.orgName)} · Offline schedule</h1><aside>Read-only snapshot, saved ${esc(new Date(snapshot.savedAt).toLocaleString())}. This file may be outdated. Open PulseShift online before accepting, declining or changing an assignment. Keep this file private; signing out cannot remove a downloaded file.</aside>${shifts || "<p>No published shifts were included.</p>"}</main></body></html>`;
}
