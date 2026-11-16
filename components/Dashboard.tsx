import React, { useMemo, useRef, useState, useEffect } from "react";
import { api } from "../services/api";
import {
  InboxNotification,
  ScheduleData,
  User,
  ShiftRequest,
  RequestStatus,
} from "../types";
import { dateFromKey, formatDateKey, workspaceToday } from "../services/dates";
import {
  occursOn,
  shiftTimeLabel,
  minimumShiftCoverage,
} from "../services/scheduling";
import {
  monthlyHours,
  saveScheduleSnapshot,
  offlineHTML,
} from "../services/dashboard";
import {
  WorkforceData,
  workforceAction,
  downloadAuthenticated,
} from "../services/workforce";
const button =
  "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50";
interface Props {
  orgId: string;
  orgName: string;
  timezone: string;
  user: User;
  users: User[];
  schedule: ScheduleData;
  workforce: WorkforceData | null;
  requests: ShiftRequest[];
  date: Date;
  onDateChange: (date: Date) => void;
  onRefresh: () => Promise<void>;
  onNavigate: (
    view: "SCHEDULE" | "LIST" | "ACTIVITY" | "DISPATCH" | "WORKFORCE",
  ) => void;
  onManageTeam: () => void;
}
export function Dashboard({
  orgId,
  orgName,
  timezone,
  user,
  users,
  schedule,
  workforce,
  requests,
  date,
  onDateChange,
  onRefresh,
  onNavigate,
  onManageTeam,
}: Props) {
  const [scope, setScope] = useState<"MY" | "TEAM">("TEAM");
  const [selected, setSelected] = useState(formatDateKey(date));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const guard = useRef(false);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const [updates, setUpdates] = useState<InboxNotification[] | null>(null);
  useEffect(() => {
    let active = true;
    api
      .get(`/orgs/${orgId}/notifications`)
      .then((result) => {
        if (active) setUpdates(result.notifications || []);
      })
      .catch(() => {
        if (active) setUpdates(null);
      });
    return () => {
      active = false;
    };
  }, [orgId, workforce?.revision, schedule.revision, requests]);
  const month = formatDateKey(date).slice(0, 7);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    setSelected((previous) =>
      previous.startsWith(month) ? previous : month + "-01",
    );
  }, [month]);
  const today = workspaceToday(timezone);
  const totals = useMemo(
    () =>
      monthlyHours(
        schedule.published,
        user.id,
        month,
        timezone,
        workforce,
        now,
      ),
    [schedule, workforce, user.id, month, timezone, now],
  );
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const offset = (monthStart.getDay() + 6) % 7;
  const shifts =
    scope === "TEAM"
      ? schedule.published
      : schedule.published.filter((s) =>
          s.assignments.some((a) => a.userId === user.id),
        );
  const mine = schedule.published
    .filter(
      (s) =>
        s.assignments.some((a) => a.userId === user.id) &&
        Date.parse(s.endsAt) > Date.now(),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const pending = mine.filter(
    (s) =>
      !workforce?.assignmentResponses.some(
        (r) =>
          r.shiftId === s.id &&
          r.userId === user.id &&
          r.publicationVersion === s.publicationVersion &&
          r.decision === "ACCEPT",
      ),
  );
  const pendingRequests = requests.filter(
    (r) => r.userId === user.id && r.status === RequestStatus.PENDING,
  ).length;
  const send = async (payload: Record<string, unknown>) => {
    if (guard.current || !workforce) return;
    guard.current = true;
    setBusy(true);
    setError("");
    try {
      await workforceAction(orgId, workforce, {
        scheduleRevision: schedule.revision,
        ...payload,
      });
      await onRefresh();
      setNotice("Your response has been saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      guard.current = false;
      setBusy(false);
    }
  };
  const respond = (
    id: string,
    version: number | undefined,
    decision: string,
  ) => {
    if (
      decision === "DECLINE" &&
      !window.confirm(
        "Decline this assignment? Your manager will be notified and a replacement vacancy will open.",
      )
    )
      return;
    void send({
      action: "RESPOND_ASSIGNMENT",
      shiftId: id,
      publicationVersion: version,
      decision,
    });
  };
  const shiftControls = (s: (typeof mine)[number]) => {
    const accepted = workforce?.assignmentResponses.some(
      (r) =>
        r.shiftId === s.id &&
        r.userId === user.id &&
        r.publicationVersion === s.publicationVersion &&
        r.decision === "ACCEPT",
    );
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {accepted ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            Accepted
          </span>
        ) : (
          <button
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={busy || !online || !workforce}
            onClick={() => respond(s.id, s.publicationVersion, "ACCEPT")}
          >
            Accept assignment
          </button>
        )}
        <button
          className={`${button} text-rose-700`}
          disabled={busy || !online || !workforce}
          onClick={() => respond(s.id, s.publicationVersion, "DECLINE")}
        >
          Decline assignment
        </button>
      </div>
    );
  };
  const saveOffline = async () => {
    setError("");
    try {
      const snapshot = saveScheduleSnapshot(
        user.id,
        orgId,
        orgName,
        timezone,
        schedule.published,
        Object.fromEntries(users.map((u) => [u.id, u.name])),
      );
      const url = URL.createObjectURL(
        new Blob([offlineHTML(snapshot)], { type: "text/html" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "pulseshift-offline-schedule.html";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (import.meta.env.PROD && "serviceWorker" in navigator)
        await navigator.serviceWorker.register("/sw.js");
      setNotice(
        "Schedule downloaded as a read-only offline file and saved in this browser. Signing out clears the browser copy; keep the downloaded file private.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to download schedule");
    }
  };
  return (
    <section className="space-y-6 p-4 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
            Your working day, in one place
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-950 md:text-3xl">
            Monthly overview
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Hello {user.name.split(" ")[0]} · {orgName} · {timezone}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={button} onClick={() => void saveOffline()}>
            Download offline schedule
          </button>
          <button
            className={button}
            onClick={() =>
              void downloadAuthenticated(
                `/orgs/${orgId}/workforce/calendar`,
                "pulseshift.ics",
              ).catch((e) => setError(e.message))
            }
          >
            Export my calendar
          </button>
        </div>
      </div>
      {!online && (
        <p
          role="status"
          className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
        >
          You are offline. Displayed data may be outdated. Reconnect to accept,
          decline or save changes.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {notice}
        </p>
      )}
      {mine[0] && (
        <section className="rounded-2xl bg-slate-950 p-5 text-white xl:hidden">
          <p className="text-xs font-bold uppercase tracking-widest text-sky-300">
            Your next assignment
          </p>
          <h2 className="mt-3 text-lg font-bold">{mine[0].title}</h2>
          <p className="mt-2 text-sm text-slate-300">
            {mine[0].localStart.slice(0, 10)} · {shiftTimeLabel(mine[0])}
          </p>
          {shiftControls(mine[0])}
        </section>
      )}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          [
            "Planned this month",
            totals.planned,
            "All published assignment hours, less scheduled breaks.",
          ],
          [
            "Accepted this month",
            totals.confirmed,
            "Assignments you explicitly accepted.",
          ],
          [
            "Estimated hours to date",
            totals.estimatedToDate,
            "Scheduled time elapsed so far; this is not actual attendance.",
          ],
          [
            "Recorded working hours",
            totals.recorded,
            "Clock-in records less actual breaks; approval may still be pending.",
          ],
        ].map(([label, value, help]) => (
          <div
            key={String(label)}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-950">
              {value === null ? "Unknown" : `${Number(value).toFixed(1)}h`}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{help}</p>
          </div>
        ))}
      </div>
      {user.role === "ADMIN" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left"
            onClick={() => onNavigate("LIST")}
          >
            <p className="text-xl font-bold">
              {
                requests.filter((r) => r.status === RequestStatus.PENDING)
                  .length
              }
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Team requests awaiting a decision
            </p>
          </button>
          <button
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left"
            onClick={() => onNavigate("SCHEDULE")}
          >
            <p className="text-xl font-bold">
              {
                schedule.published.filter(
                  (s) =>
                    s.localStart.startsWith(month) &&
                    minimumShiftCoverage(s) < s.requiredCount,
                ).length
              }
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Published shifts with coverage gaps this month
            </p>
          </button>
          <button
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left"
            onClick={() => onNavigate("WORKFORCE")}
          >
            <p className="text-xl font-bold">
              {workforce
                ? workforce.vacancies.filter((v) => v.status === "OPEN").length
                : "Unknown"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Open replacement searches
            </p>
          </button>
        </div>
      )}
      {user.role === "ADMIN" && !schedule.published.length && (
        <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <h2 className="font-bold text-sky-950">
            Set up your first working week
          </h2>
          <p className="mt-2 text-sm text-sky-900">
            Invite staff, set their eligible roles, create draft shifts, then
            review and publish. The checklist follows your actual workspace
            records.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {[
              ["Invite your team", users.length > 1, onManageTeam],
              [
                "Set staff eligibility",
                schedule.profiles.length > 0,
                () => onNavigate("SCHEDULE"),
              ],
              [
                "Create draft shifts",
                schedule.shifts.length > 0,
                () => onNavigate("SCHEDULE"),
              ],
              [
                "Review and publish",
                schedule.published.length > 0,
                () => onNavigate("SCHEDULE"),
              ],
            ].map(([label, done, go]) => (
              <button
                key={String(label)}
                className="rounded-xl border border-sky-200 bg-white p-3 text-left text-sm font-semibold"
                onClick={go as () => void}
              >
                {done ? "✓ " : ""}
                {String(label)} →
              </button>
            ))}
          </div>
        </section>
      )}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                aria-label="Previous calendar month"
                className={button}
                onClick={() =>
                  onDateChange(
                    new Date(date.getFullYear(), date.getMonth() - 1, 1),
                  )
                }
              >
                ←
              </button>
              <h2 className="text-lg font-bold">
                {date.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <button
                aria-label="Next calendar month"
                className={button}
                onClick={() =>
                  onDateChange(
                    new Date(date.getFullYear(), date.getMonth() + 1, 1),
                  )
                }
              >
                →
              </button>
            </div>
            <div className="flex gap-2">
              {(["MY", "TEAM"] as const).map((s) => (
                <button
                  key={s}
                  aria-pressed={scope === s}
                  className={`${button} ${scope === s ? "border-sky-400 bg-sky-50 text-sky-800" : ""}`}
                  onClick={() => setScope(s)}
                >
                  {s === "MY" ? "My assignments" : "Whole team"}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <div className="min-w-0">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div
                    key={d}
                    className="p-3 text-center text-xs font-bold text-slate-500"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: offset }).map((_, i) => (
                  <div
                    key={`blank${i}`}
                    className="min-h-28 border-b border-r border-slate-200 bg-slate-50/50"
                  />
                ))}
                {Array.from({ length: count }, (_, i) => i + 1).map((day) => {
                  const key = `${month}-${String(day).padStart(2, "0")}`;
                  const daily = shifts.filter((s) => occursOn(s, key));
                  return (
                    <button
                      key={key}
                      aria-label={`View assignments ${key}`}
                      aria-pressed={selected === key}
                      onClick={() => {
                        setSelected(key);
                        onDateChange(dateFromKey(key));
                      }}
                      className={`min-h-28 min-w-0 border-b border-r border-slate-200 p-2 text-left align-top transition hover:bg-sky-50 ${selected === key ? "bg-sky-50 ring-2 ring-inset ring-sky-400" : ""}`}
                    >
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${key === today ? "bg-slate-950 text-white" : "text-slate-700"}`}
                      >
                        {day}
                      </span>
                      <div className="mt-2 space-y-1">
                        {daily.slice(0, 3).map((s) => (
                          <span
                            key={s.id}
                            className={`block truncate rounded-md px-1.5 py-1 text-[10px] ${s.assignments.some((a) => a.userId === user.id) ? "bg-sky-100 text-sky-900" : "bg-slate-100 text-slate-700"}`}
                          >
                            {s.localStart.slice(11)} ·{" "}
                            {s.assignments
                              .map(
                                (a) =>
                                  users
                                    .find((u) => u.id === a.userId)
                                    ?.name.split(" ")[0] || "Staff",
                              )
                              .join(", ") || "Open shift"}
                          </span>
                        ))}
                        {daily.length > 3 && (
                          <span className="text-[10px] text-slate-500">
                            +{daily.length - 3} more
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="font-bold">
              Assignments ·{" "}
              {dateFromKey(selected).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h2>
            <div className="mt-4 space-y-3">
              {shifts
                .filter((s) => occursOn(s, selected))
                .map((s) => (
                  <article
                    key={s.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <h3 className="font-bold">{s.title}</h3>
                      <span className="text-sm font-semibold text-sky-800">
                        {shiftTimeLabel(s)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {s.department} · {s.location} · {s.role}
                    </p>
                    <p className="mt-2 text-sm">
                      {s.assignments
                        .map(
                          (a) =>
                            users.find((u) => u.id === a.userId)?.name ||
                            "Former member",
                        )
                        .join(", ") || "No staff assigned"}{" "}
                      · {s.assignments.length}/{s.requiredCount} required
                    </p>
                    {s.assignments.some((a) => a.userId === user.id) &&
                      Date.parse(s.endsAt) > Date.now() &&
                      shiftControls(s)}
                  </article>
                ))}
              {!shifts.some((s) => occursOn(s, selected)) && (
                <p className="text-sm text-slate-500">
                  No published assignments on this day.
                </p>
              )}
            </div>
          </div>
        </div>
        <aside className="space-y-4">
          <section className="rounded-2xl bg-slate-950 p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-300">
              Your next assignment
            </p>
            {mine[0] ? (
              <>
                <h2 className="mt-3 text-xl font-bold">{mine[0].title}</h2>
                <p className="mt-2 text-sm text-slate-300">
                  {mine[0].localStart.slice(0, 10)} · {shiftTimeLabel(mine[0])}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {mine[0].location} · {mine[0].department}
                </p>
                {shiftControls(mine[0])}
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-300">
                No upcoming assignment yet.
              </p>
            )}
          </section>
          <div className="grid grid-cols-2 gap-3">
            <button
              className="rounded-2xl border border-slate-200 bg-white p-4 text-left"
              onClick={() => {
                if (pending[0]) {
                  const day = pending[0].localStart.slice(0, 10);
                  setSelected(day);
                  onDateChange(dateFromKey(day));
                } else onNavigate("SCHEDULE");
              }}
            >
              <span className="text-2xl font-bold">
                {workforce ? pending.length : "—"}
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                Assignments to respond to
              </span>
            </button>
            <button
              className="rounded-2xl border border-slate-200 bg-white p-4 text-left"
              onClick={() => onNavigate("LIST")}
            >
              <span className="text-2xl font-bold">{pendingRequests}</span>
              <span className="mt-1 block text-xs text-slate-500">
                Your pending requests
              </span>
            </button>
          </div>
          <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-bold">Quick actions</h2>
            {[
              ["Plan or review shifts", "SCHEDULE"],
              ["Inbox & history", "ACTIVITY"],
              ["Time, swaps & open shifts", "WORKFORCE"],
              ["Team availability", "DISPATCH"],
            ].map(([label, view]) => (
              <button
                key={view}
                className={`${button} w-full text-left`}
                onClick={() =>
                  onNavigate(view as Parameters<Props["onNavigate"]>[0])
                }
              >
                {label} →
              </button>
            ))}
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="font-bold">Recent updates</h2>
            {updates === null ? (
              <p className="mt-3 text-xs text-slate-500">
                Updates could not be loaded. Open the inbox to retry.
              </p>
            ) : updates.length ? (
              updates.slice(0, 3).map((n) => (
                <button
                  key={n.id}
                  className="mt-3 block w-full border-t border-slate-200 pt-3 text-left text-xs leading-5 text-slate-600"
                  onClick={() => onNavigate("ACTIVITY")}
                >
                  {n.message}
                </button>
              ))
            ) : (
              <p className="mt-3 text-xs text-slate-500">No recent updates.</p>
            )}
          </section>
          {workforce && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="font-bold">Your credentials</h2>
              {workforce.credentials
                .filter((c) => c.userId === user.id)
                .map((c) => (
                  <p
                    key={c.id}
                    className={`mt-3 text-xs ${c.expiresOn < today ? "text-rose-700" : "text-slate-500"}`}
                  >
                    {c.type} · {c.status} · Expires {c.expiresOn}
                  </p>
                ))}
              {!workforce.credentials.some((c) => c.userId === user.id) && (
                <p className="mt-3 text-xs text-slate-500">
                  No credentials submitted yet.
                </p>
              )}
              <button
                className="mt-3 text-xs font-semibold text-sky-800"
                onClick={() => onNavigate("WORKFORCE")}
              >
                Manage credentials →
              </button>
            </section>
          )}
          <section className="rounded-2xl border border-slate-200 bg-sky-50 p-4">
            <h2 className="font-bold text-sky-950">Working hours explained</h2>
            <p className="mt-2 text-xs leading-6 text-sky-900">
              Estimated hours grow as scheduled time passes. Recorded hours come
              from clocking in and out. Approved recorded hours this month:{" "}
              {totals.approved === null
                ? "unknown"
                : `${totals.approved.toFixed(1)}h`}
              .
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}
