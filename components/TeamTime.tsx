import React, { useState } from "react";
import { ScheduleData, User } from "../types";
import { WorkforceData } from "../services/workforce";
import {
  AttendanceRow,
  attendanceRows,
  recordedHours,
} from "../services/attendance";
import { workspaceToday } from "../services/dates";

const responseLabels = {
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  AWAITING: "Awaiting response",
  UNKNOWN: "Not available for the current plan",
};
const button =
  "rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50";
export function TeamTime({
  data,
  schedule,
  users,
  currentUserId,
  busy,
  onAction,
  onRefresh,
}: {
  data: WorkforceData;
  schedule: ScheduleData;
  users: User[];
  currentUserId: string;
  busy: boolean;
  onAction: (payload: Record<string, unknown>) => Promise<unknown>;
  onRefresh: () => Promise<void>;
}) {
  const [month, setMonth] = useState(() =>
    workspaceToday(schedule.timezone).slice(0, 7),
  );
  const [member, setMember] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const name = (id: string) =>
    users.find((u) => u.id === id)?.name || "Staff member";
  const rows = attendanceRows(
    schedule.published,
    data,
    month,
    schedule.timezone,
  );
  const awaiting = (row: AttendanceRow) =>
    row.records.some(
      (t) => t.clockOut && (t.status === "PENDING" || t.correction),
    );
  const approved = (row: AttendanceRow) =>
    row.records.some((t) => t.status === "APPROVED");
  const filtered = rows.filter(
    (r) =>
      (!member || r.userId === member) &&
      (filter === "ALL" ||
        (filter === "ACCEPTED" &&
          (r.response === "ACCEPTED" ||
            r.previousResponse?.decision === "ACCEPT")) ||
        (filter === "MISSING" && !r.records.length) ||
        (filter === "REVIEW" && awaiting(r)) ||
        (filter === "APPROVED" && approved(r))),
  );
  const timestamp = (value: string, timezone = schedule.timezone) =>
    new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  return (
    <section className="space-y-5" aria-label="Team attendance overview">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            Assignment & attendance tracking
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Follow each assignment from acceptance to clock-in, clock-out, and
            time approval. Acceptance confirms the plan; attendance comes from
            recorded time.
          </p>
        </div>
        <button
          className={button}
          disabled={busy || refreshing}
          onClick={async () => {
            setError("");
            setRefreshing(true);
            try {
              await onRefresh();
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Could not refresh attendance.",
              );
            } finally {
              setRefreshing(false);
            }
          }}
        >
          {refreshing ? "Refreshing…" : "Refresh attendance"}
        </button>
      </div>
      <div className="flex flex-wrap gap-3 rounded-2xl bg-slate-50 p-4">
        <label className="text-xs font-semibold text-slate-600">
          Attendance month
          <input
            aria-label="Attendance month"
            className="mt-2 block rounded-xl border bg-white p-2.5 text-sm"
            type="month"
            value={month}
            onChange={(e) => {
              if (/^\d{4}-\d{2}$/.test(e.target.value))
                setMonth(e.target.value);
            }}
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Team member
          <select
            aria-label="Attendance team member"
            className="mt-2 block rounded-xl border bg-white p-2.5 text-sm"
            value={member}
            onChange={(e) => setMember(e.target.value)}
          >
            <option value="">All team members</option>
            {[...new Set(rows.map((r) => r.userId))].map((id) => (
              <option key={id} value={id}>
                {name(id)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Show
          <select
            aria-label="Attendance status"
            className="mt-2 block rounded-xl border bg-white p-2.5 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="ALL">All assignments & records</option>
            <option value="ACCEPTED">Accepted (current or earlier)</option>
            <option value="MISSING">No attendance recorded</option>
            <option value="REVIEW">Awaiting approval</option>
            <option value="APPROVED">Has approved time</option>
          </select>
        </label>
      </div>
      <p className="text-xs text-slate-500">
        Schedule times use {schedule.timezone}; each time record shows its own
        timezone. Overnight assignments appear when they overlap the selected
        month. Hours below cover the full time record.
      </p>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          {error}
        </p>
      )}
      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed p-7 text-center">
          <h3 className="font-semibold">
            No matching assignments or time records
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Choose another month, team member, or status. Published assignments
            appear here even before a clock-in is recorded.
          </p>
        </div>
      )}
      {filtered.map((row) => (
        <article
          key={row.id}
          aria-label={`${name(row.userId)} · ${row.shift?.title || "Historical time record"}`}
          className="space-y-4 rounded-2xl border bg-white p-4 md:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">
                {name(row.userId)} ·{" "}
                {row.shift?.title || "Historical time record"}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {row.shift
                  ? `${row.shift.department} · ${row.shift.location}`
                  : `${row.records[0].department} · Original assignment is no longer in the published plan`}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${row.response === "ACCEPTED" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
            >
              {row.historical
                ? row.response === "ACCEPTED"
                  ? "Accepted earlier version"
                  : row.response === "DECLINED"
                    ? "Declined earlier version"
                    : "Historical response"
                : responseLabels[row.response]}
            </span>
          </div>
          {row.historical && (
            <div className="rounded-xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900">
              <strong>Removed from current assignment.</strong> This response
              belongs to published version {row.responseVersion}. The staff
              member is no longer assigned on the current published plan. The
              schedule details below show the latest published shift; no
              attendance is inferred from the earlier acceptance.
            </div>
          )}
          {row.previousResponse && (
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              Earlier response:{" "}
              {row.previousResponse.decision === "ACCEPT"
                ? "Accepted"
                : row.previousResponse.decision === "DECLINE"
                  ? "Declined"
                  : row.previousResponse.decision}{" "}
              (published version {row.previousResponse.version}). The current
              published version still needs a response.
            </p>
          )}
          {row.shift && (
            <p className="text-sm text-slate-600">
              <strong>Scheduled:</strong> {timestamp(row.shift.startsAt)} →{" "}
              {timestamp(row.shift.endsAt)}
            </p>
          )}
          {row.records.length === 0 ? (
            <>
              <dl className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-xs text-slate-500">Clock-in</dt>
                  <dd className="mt-1 text-sm font-semibold">Not recorded</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-xs text-slate-500">Clock-out</dt>
                  <dd className="mt-1 text-sm font-semibold">Not recorded</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-xs text-slate-500">Time approval</dt>
                  <dd className="mt-1 text-sm font-semibold">
                    No time submitted
                  </dd>
                </div>
              </dl>
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                <strong>No attendance recorded.</strong>{" "}
                {row.shift && Date.parse(row.shift.endsAt) < Date.now()
                  ? "This shift has ended without a clock-in record. Attendance needs confirmation; this does not automatically mean the person was absent."
                  : "No clock-in has been recorded for this assignment yet."}
              </p>
            </>
          ) : (
            row.records.map((t) => (
              <section
                key={t.id}
                aria-label={`Time record ${t.id}`}
                className="space-y-3 rounded-xl border p-4"
              >
                <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <dt className="text-xs text-slate-500">Clock-in</dt>
                    <dd className="mt-1 text-sm font-semibold">
                      {timestamp(t.clockIn, t.timezone)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Clock-out</dt>
                    <dd className="mt-1 text-sm font-semibold">
                      {t.clockOut
                        ? timestamp(t.clockOut, t.timezone)
                        : "Still clocked in"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Recorded hours</dt>
                    <dd className="mt-1 text-sm font-semibold">
                      {t.clockOut
                        ? `${recordedHours(t)!.toFixed(2)}h`
                        : "In progress"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Time approval</dt>
                    <dd
                      className={`mt-1 text-sm font-semibold ${t.status === "APPROVED" ? "text-emerald-700" : "text-slate-700"}`}
                    >
                      {t.status === "APPROVED"
                        ? "Approved"
                        : t.status === "REJECTED"
                          ? "Rejected"
                          : t.clockOut
                            ? "Awaiting approval"
                            : "Awaiting clock-out"}
                    </dd>
                  </div>
                </dl>
                <p className="text-xs text-slate-500">
                  Record timezone: {t.timezone}. Recorded hours exclude actual
                  recorded breaks.
                </p>
                {t.status === "APPROVED" && (
                  <p className="text-sm text-emerald-800">
                    Approved recorded hours:{" "}
                    {recordedHours(t)?.toFixed(2) ?? "Unknown"}h
                    {t.approvedBy ? ` · Reviewed by ${name(t.approvedBy)}` : ""}
                    {t.approvedAt
                      ? ` · ${timestamp(t.approvedAt, t.timezone)}`
                      : ""}
                  </p>
                )}
                {t.correction && (
                  <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                    Correction awaiting review: {t.correction.reason}. Any
                    approved hours shown are the existing approved record until
                    this correction is approved.
                  </p>
                )}
                {t.clockOut && (t.status === "PENDING" || t.correction) && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                      disabled={busy || t.userId === currentUserId}
                      onClick={() =>
                        void onAction({
                          action: "APPROVE_TIME",
                          timesheetId: t.id,
                          version: t.version,
                        })
                      }
                    >
                      Approve recorded time
                    </button>
                    <button
                      className={button}
                      disabled={busy || t.userId === currentUserId}
                      onClick={() =>
                        void onAction({
                          action: "REJECT_TIME",
                          timesheetId: t.id,
                          version: t.version,
                        })
                      }
                    >
                      Reject submission
                    </button>
                    {t.userId === currentUserId && (
                      <p className="self-center text-xs text-slate-500">
                        Another manager must review your time.
                      </p>
                    )}
                  </div>
                )}
              </section>
            ))
          )}
        </article>
      ))}
    </section>
  );
}
