import React, { useRef, useState } from "react";
import { api, ApiError } from "../services/api";
import {
  addDays,
  minimumShiftCoverage,
  occursOn,
  pendingScheduleChanges,
  scheduleRange,
  shiftFingerprint,
  shiftTimeLabel,
} from "../services/scheduling";
import { formatDateKey, dateFromKey } from "../services/dates";
import {
  ScheduleData,
  ScheduledShift,
  SchedulingProfile,
  ShiftRequest,
  RequestStatus,
  RequestType,
  TimeView,
  User,
} from "../types";
import { Modal } from "./Modal";

const field =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100";
const button =
  "rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const primary =
  "rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50";

type Mutation = Record<string, unknown>;
interface Props {
  orgId: string;
  data: ScheduleData | null;
  users: User[];
  currentUser: User;
  isAdmin: boolean;
  currentDate: Date;
  timeView: TimeView;
  scope: "MY" | "TEAM";
  requests: ShiftRequest[];
  onRefresh: () => Promise<void>;
  onRespond?: (shift: ScheduledShift) => void;
}
export function ScheduleBoard({
  orgId,
  data,
  users,
  currentUser,
  isAdmin,
  currentDate,
  timeView,
  scope,
  requests,
  onRefresh,
  onRespond,
}: Props) {
  const [mode, setMode] = useState<"DRAFT" | "PUBLISHED">("PUBLISHED");
  const [editing, setEditing] = useState<ScheduledShift | "NEW" | null>(null);
  const [settings, setSettings] = useState(false);
  const [templates, setTemplates] = useState(false);
  const [publishReview, setPublishReview] = useState(false);
  const [allowGaps, setAllowGaps] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  // A transport retry uses the same key until the payload/revision changes.
  const pendingOperation = useRef<{
    fingerprint: string;
    id: string;
    revision: number;
  } | null>(null);
  const mutate = async (payload: Mutation) => {
    if (inFlight.current || !data) return false;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    const fingerprint = JSON.stringify(payload);
    if (pendingOperation.current?.fingerprint !== fingerprint)
      pendingOperation.current = {
        fingerprint,
        id: crypto.randomUUID(),
        revision: data.revision,
      };
    let committed = false;
    try {
      await api.post(`/orgs/${orgId}/schedule`, {
        revision: pendingOperation.current.revision,
        operationId: pendingOperation.current.id,
        ...payload,
      });
      committed = true;
      await onRefresh();
      pendingOperation.current = null;
      setMessage(
        payload.action === "PUBLISH"
          ? "Schedule published. Assignment updates are in staff inboxes."
          : "Draft saved. Staff continue to see the published schedule.",
      );
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 409)
        pendingOperation.current = null;
      setError(
        `${e instanceof Error ? e.message : "Unable to save."}${committed ? " The change was saved, but refreshing failed. Refresh before making another change." : ""}`,
      );
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const acknowledge = async (s: ScheduledShift) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await api.post(`/orgs/${orgId}/schedule/${s.id}/acknowledge`, {
        publicationVersion: s.publicationVersion,
      });
      await onRefresh();
      setMessage("Assignment acknowledged.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to acknowledge.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  if (!data)
    return (
      <p role="status" className="p-8">
        Loading the schedule…
      </p>
    );
  const range = scheduleRange(currentDate, timeView);
  const isDraft = isAdmin && mode === "DRAFT";
  const source = isDraft ? data.shifts : data.published;
  const shifts = source.filter(
    (s) =>
      scope === "TEAM" ||
      s.assignments.some((a) => a.userId === currentUser.id),
  );
  const changes = pendingScheduleChanges(data.shifts, data.published);
  const gaps = data.issues.filter((i) => i.code === "COVERAGE");
  const blockers = data.issues.filter((i) => i.code !== "COVERAGE");
  const periodShifts = shifts.filter((s) =>
    range.days.some((d) => occursOn(s, d)),
  );
  const coverageGaps = periodShifts.filter(
    (s) => minimumShiftCoverage(s) < s.requiredCount,
  ).length;
  const assigned = new Set(
    periodShifts.flatMap((s) => s.assignments.map((a) => a.userId)),
  ).size;
  return (
    <section className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
            Staffing planner
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-950">
            A clear plan for every shift
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {range.start} – {addDays(range.end, -1)} · All times in{" "}
            {data.timezone}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={button}
            disabled={busy}
            onClick={() => void onRefresh().catch((e) => setError(e.message))}
          >
            Refresh schedule
          </button>
          {isAdmin && (
            <>
              <button
                className={button}
                disabled={busy}
                onClick={() => setSettings(true)}
              >
                Staff eligibility & limits
              </button>
              <button
                className={button}
                disabled={busy}
                onClick={() => setTemplates(true)}
              >
                Templates & repeats
              </button>
              <button
                className={primary}
                disabled={busy}
                onClick={() => {
                  setMode("DRAFT");
                  setEditing("NEW");
                }}
              >
                Add shift
              </button>
            </>
          )}
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {message}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Shifts in view", periodShifts.length],
          ["Staff assigned", assigned],
          ["Shifts with coverage gaps", coverageGaps],
          ["Schedule", isDraft ? "Private draft" : "Published"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <p className="text-xs text-slate-600">{label}</p>
            <p className="mt-1 text-xl font-bold text-slate-950">{value}</p>
          </div>
        ))}
      </div>
      {isAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex gap-2" aria-label="Schedule visibility">
            <button
              aria-pressed={!isDraft}
              className={!isDraft ? primary : button}
              disabled={busy}
              onClick={() => setMode("PUBLISHED")}
            >
              Published
            </button>
            <button
              aria-pressed={isDraft}
              className={isDraft ? primary : button}
              disabled={busy}
              onClick={() => setMode("DRAFT")}
            >
              Draft · {changes} changes
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-600">
              Draft changes stay private until published.
            </span>
            <button
              className={button}
              disabled={busy || !changes}
              onClick={() => {
                if (window.confirm("Discard all unpublished shift changes?"))
                  void mutate({ action: "DISCARD" });
              }}
            >
              Discard changes
            </button>
            <button
              className={primary}
              disabled={busy || !changes}
              onClick={() => {
                setAllowGaps(false);
                setPublishReview(true);
              }}
            >
              Review & publish
            </button>
          </div>
        </div>
      )}
      {isDraft && data.issues.length > 0 && (
        <details
          className="rounded-xl border border-amber-200 bg-amber-50 p-4"
          open
        >
          <summary className="cursor-pointer text-sm font-bold text-amber-900">
            {blockers.length} blocking conflicts · {gaps.length} coverage gaps
          </summary>
          <ul className="mt-3 space-y-2 text-sm text-amber-900">
            {data.issues.map((i, n) => (
              <li key={`${i.shiftId}-${n}`}>{i.message}</li>
            ))}
          </ul>
        </details>
      )}
      {!isDraft && !source.length && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <h2 className="font-bold">No published shifts yet</h2>
          <p className="mt-2 text-sm text-slate-600">
            {isAdmin
              ? "Add shifts to the draft, set staff eligibility, and review before publishing."
              : "Your manager will publish assignments here. Availability requests do not create assignments."}
          </p>
        </div>
      )}
      <div
        className={
          timeView === "DAY"
            ? "space-y-4"
            : "grid gap-3 md:grid-cols-2 xl:grid-cols-3"
        }
      >
        {range.days.map((day) => {
          const daily = shifts
            .filter((s) => occursOn(s, day))
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
          const availability = requests.filter(
            (r) =>
              r.date === day &&
              r.status === RequestStatus.APPROVED &&
              r.type === RequestType.WORK,
          );
          const leave = requests.filter(
            (r) =>
              r.date === day &&
              r.status === RequestStatus.APPROVED &&
              r.type !== RequestType.WORK,
          );
          return (
            <section
              key={day}
              className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/60 p-3"
              aria-label={`Schedule ${day}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold text-slate-800">
                  {dateFromKey(day).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </h2>
                {isDraft && (
                  <button
                    aria-label={`Add shift on ${day}`}
                    className="rounded-lg px-2 py-1 text-sm font-semibold text-sky-800 hover:bg-sky-100"
                    disabled={busy}
                    onClick={() =>
                      setEditing({
                        localStart: day + "T08:00",
                        localEnd: day + "T16:00",
                      } as ScheduledShift)
                    }
                  >
                    + Add
                  </button>
                )}
              </div>
              <p className="mb-3 text-xs text-slate-500">
                {availability.length} available · {leave.length} on leave ·
                availability is not an assignment
              </p>
              {!daily.length && (
                <p className="py-4 text-sm text-slate-500">
                  No {isDraft ? "draft" : "published"} shifts.
                </p>
              )}
              <div className="space-y-3">
                {daily.map((s) => {
                  const minimum = minimumShiftCoverage(s);
                  const old = data.published.find((p) => p.id === s.id);
                  const changed =
                    isDraft &&
                    (!old || shiftFingerprint(old) !== shiftFingerprint(s));
                  return (
                    <article
                      key={s.id}
                      className={`rounded-xl border bg-white p-4 shadow-sm ${minimum < s.requiredCount ? "border-amber-300" : "border-slate-200"}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="font-bold text-slate-950">{s.title}</h3>
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-bold ${isDraft ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-800"}`}
                        >
                          {isDraft
                            ? changed
                              ? "Draft change"
                              : "Unchanged"
                            : "Published assignment"}
                        </span>
                      </div>
                      <p className="mt-2 font-semibold text-sky-900">
                        {shiftTimeLabel(s)}
                      </p>
                      {s.localStart.slice(0, 10) !== day && (
                        <p className="text-xs text-slate-600">
                          Continues from {s.localStart.slice(0, 10)}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-slate-600">
                        {s.department} · {s.location}
                      </p>
                      <p
                        className={`mt-3 text-sm font-semibold ${minimum < s.requiredCount ? "text-amber-800" : "text-emerald-800"}`}
                      >
                        {s.assignments.length} assigned / {s.requiredCount}{" "}
                        required {s.role}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Minimum coverage including breaks: {minimum}/
                        {s.requiredCount}
                      </p>
                      <ul className="mt-3 space-y-2 text-sm">
                        {s.assignments.map((a) => {
                          const acknowledged = data.acknowledgements.some(
                            (ack) =>
                              ack.shiftId === s.id &&
                              ack.userId === a.userId &&
                              ack.publicationVersion === s.publicationVersion,
                          );
                          return (
                            <li
                              key={a.userId}
                              className="rounded-lg bg-slate-50 px-3 py-2"
                            >
                              <span className="font-semibold">
                                {users.find((u) => u.id === a.userId)?.name ||
                                  "Former team member"}
                              </span>
                              {a.breakMinutes > 0 && (
                                <span className="block text-xs text-slate-600">
                                  {a.breakMinutes}-minute break,{" "}
                                  {a.breakStartMinutes} minutes after start
                                </span>
                              )}
                              {!isDraft &&
                                s.requiresAcknowledgement &&
                                (isAdmin || a.userId === currentUser.id) && (
                                  <span
                                    className={`block text-xs ${acknowledged ? "text-emerald-700" : "text-amber-800"}`}
                                  >
                                    {acknowledged
                                      ? "Acknowledged"
                                      : "Awaiting acknowledgement"}
                                  </span>
                                )}
                            </li>
                          );
                        })}
                      </ul>
                      {isDraft ? (
                        <button
                          className={`${button} mt-3 w-full`}
                          disabled={busy}
                          onClick={() => setEditing(s)}
                        >
                          Edit draft shift
                        </button>
                      ) : (
                        s.requiresAcknowledgement &&
                        s.assignments.some(
                          (a) => a.userId === currentUser.id,
                        ) &&
                        !data.acknowledgements.some(
                          (a) =>
                            a.shiftId === s.id &&
                            a.userId === currentUser.id &&
                            a.publicationVersion === s.publicationVersion,
                        ) && (
                          <button
                            className={`${primary} mt-3 w-full`}
                            disabled={busy}
                            onClick={() =>
                              onRespond ? onRespond(s) : void acknowledge(s)
                            }
                          >
                            {onRespond
                              ? "Accept or decline on dashboard"
                              : "Acknowledge assignment"}
                          </button>
                        )
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      {editing && (
        <ShiftEditor
          initial={editing === "NEW" ? undefined : editing}
          date={formatDateKey(currentDate)}
          users={users}
          profiles={data.profiles}
          requests={requests}
          timezone={data.timezone}
          busy={busy}
          error={error}
          onClose={() => {
            if (!busy) setEditing(null);
          }}
          onSave={async (shift) => {
            if (
              await mutate({
                action: "SAVE_SHIFT",
                shiftId: editing !== "NEW" ? editing.id : undefined,
                shift,
              })
            )
              setEditing(null);
          }}
          onDelete={
            typeof editing === "object" && editing.id
              ? async () => {
                  if (
                    window.confirm(
                      "Remove this shift from the draft? Published assignments remain until you publish.",
                    )
                  )
                    if (
                      await mutate({
                        action: "DELETE_SHIFT",
                        shiftId: editing.id,
                      })
                    )
                      setEditing(null);
                }
              : undefined
          }
        />
      )}
      {settings && (
        <ProfileEditor
          users={users}
          profiles={data.profiles}
          busy={busy}
          error={error}
          onClose={() => {
            if (!busy) setSettings(false);
          }}
          onSave={async (profile) => {
            if (await mutate({ action: "SAVE_PROFILE", profile }))
              setMessage("Staff eligibility and scheduling limits saved.");
          }}
        />
      )}
      {templates && (
        <TemplateEditor
          data={data}
          date={range.start}
          busy={busy}
          error={error}
          onClose={() => {
            if (!busy) setTemplates(false);
          }}
          onAction={async (payload) => {
            const ok = await mutate(payload);
            if (ok) setMode("DRAFT");
            return ok;
          }}
        />
      )}
      {publishReview && (
        <Modal
          label="Review schedule publication"
          onClose={() => {
            if (!busy) setPublishReview(false);
          }}
        >
          <div className="mx-auto w-full max-w-xl rounded-3xl bg-white p-6">
            <h2 className="text-xl font-bold">Review schedule publication</h2>
            <p className="mt-3 text-sm text-slate-600">
              Publish all {changes} shift changes across the workspace. Staff
              see assignments only after publication; changed assignments need a
              new acknowledgement.
            </p>
            <p className="mt-3 text-sm font-semibold">
              {blockers.length} blocking conflicts · {gaps.length} coverage gaps
            </p>
            <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm text-amber-900">
              {data.issues.map((i, n) => (
                <li key={n}>{i.message}</li>
              ))}
            </ul>
            {gaps.length > 0 && (
              <label className="mt-4 flex items-start gap-3 text-sm">
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={allowGaps}
                  onChange={(e) => setAllowGaps(e.target.checked)}
                  disabled={busy}
                />
                I understand these shifts have coverage gaps and want to publish
                them for staffing follow-up.
              </label>
            )}
            {error && (
              <p role="alert" className="mt-3 text-sm text-rose-800">
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                className={button}
                disabled={busy}
                onClick={() => setPublishReview(false)}
              >
                Keep editing
              </button>
              <button
                className={primary}
                disabled={
                  busy || blockers.length > 0 || (gaps.length > 0 && !allowGaps)
                }
                onClick={async () => {
                  if (await mutate({ action: "PUBLISH", allowGaps })) {
                    setPublishReview(false);
                    setMode("PUBLISHED");
                  }
                }}
              >
                {busy ? "Publishing…" : "Publish schedule"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

function ShiftEditor({
  initial,
  date,
  users,
  profiles,
  requests,
  timezone,
  busy,
  error,
  onClose,
  onSave,
  onDelete,
}: {
  initial?: ScheduledShift;
  date: string;
  users: User[];
  profiles: SchedulingProfile[];
  requests: ShiftRequest[];
  timezone: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (shift: Partial<ScheduledShift>) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<ScheduledShift>>(() => ({
    title: "",
    department: "",
    location: "",
    role: "",
    requiredCount: 1,
    localStart: date + "T08:00",
    localEnd: date + "T16:00",
    assignments: [],
    requiresAcknowledgement: true,
    ...initial,
  }));
  const update = <K extends keyof ScheduledShift>(
    key: K,
    value: ScheduledShift[K],
  ) => setForm((f) => ({ ...f, [key]: value }));
  const assignments = form.assignments || [];
  return (
    <Modal
      label={initial?.id ? "Edit draft shift" : "Create draft shift"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSave(form);
        }}
        className="mx-auto w-full max-w-3xl rounded-3xl bg-white p-5 md:p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">
              {initial?.id ? "Edit draft shift" : "Create draft shift"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Times use {timezone}. Overnight shifts must have an end date on
              the next day.
            </p>
          </div>
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <fieldset disabled={busy} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {(["title", "department", "location", "role"] as const).map(
              (key) => (
                <label key={key} className="text-sm font-semibold capitalize">
                  {key === "role" ? "Required staff role" : key}
                  <input
                    className={field}
                    required
                    maxLength={key === "title" ? 100 : 80}
                    value={form[key] || ""}
                    onChange={(e) => update(key, e.target.value)}
                  />
                </label>
              ),
            )}
            <label className="text-sm font-semibold">
              Starts
              <input
                type="datetime-local"
                className={field}
                required
                value={form.localStart}
                onChange={(e) => update("localStart", e.target.value)}
              />
            </label>
            <label className="text-sm font-semibold">
              Ends
              <input
                type="datetime-local"
                className={field}
                required
                value={form.localEnd}
                onChange={(e) => update("localEnd", e.target.value)}
              />
            </label>
            <label className="text-sm font-semibold">
              Minimum staff throughout shift
              <input
                type="number"
                min="1"
                max="100"
                required
                className={field}
                value={form.requiredCount}
                onChange={(e) =>
                  update("requiredCount", Number(e.target.value))
                }
              />
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={form.requiresAcknowledgement}
                onChange={(e) =>
                  update("requiresAcknowledgement", e.target.checked)
                }
              />
              Require staff acknowledgement after publishing
            </label>
          </div>
          <div>
            <h3 className="font-bold">Assign staff and stagger breaks</h3>
            <p className="mt-1 text-xs text-slate-600">
              Availability is advisory. Eligibility, leave, overlaps, and
              configured limits are checked before publishing. Breaks reduce
              coverage during their actual interval.
            </p>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {users.map((user) => {
                const a = assignments.find((a) => a.userId === user.id);
                const eligible = profiles
                  .find((p) => p.userId === user.id)
                  ?.roles.some(
                    (r) => r.toLowerCase() === (form.role || "").toLowerCase(),
                  );
                const availability = requests.find(
                  (r) =>
                    r.userId === user.id &&
                    r.date === form.localStart?.slice(0, 10) &&
                    r.status === RequestStatus.APPROVED,
                );
                return (
                  <div
                    key={user.id}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <label className="flex items-center gap-3 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={!!a}
                        onChange={(e) =>
                          update(
                            "assignments",
                            e.target.checked
                              ? [
                                  ...assignments,
                                  {
                                    userId: user.id,
                                    breakMinutes: 0,
                                    breakStartMinutes: 0,
                                  },
                                ]
                              : assignments.filter((a) => a.userId !== user.id),
                          )
                        }
                      />
                      {user.name}
                    </label>
                    <p className="ml-7 mt-1 text-xs text-slate-600">
                      {eligible ? "Eligible role" : "Role eligibility not set"}{" "}
                      ·{" "}
                      {availability
                        ? availability.type === RequestType.WORK
                          ? "Available (not assigned)"
                          : `${availability.type} approved`
                        : "Availability unknown"}
                    </p>
                    {a && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <label className="text-xs">
                          {user.name}: break length (minutes)
                          <input
                            type="number"
                            min="0"
                            max="240"
                            required
                            className={field}
                            value={a.breakMinutes}
                            onChange={(e) =>
                              update(
                                "assignments",
                                assignments.map((x) =>
                                  x.userId === user.id
                                    ? {
                                        ...x,
                                        breakMinutes: Number(e.target.value),
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                        <label className="text-xs">
                          {user.name}: break starts after (minutes)
                          <input
                            type="number"
                            min="0"
                            max="1440"
                            required
                            disabled={!a.breakMinutes}
                            className={field}
                            value={a.breakStartMinutes}
                            onChange={(e) =>
                              update(
                                "assignments",
                                assignments.map((x) =>
                                  x.userId === user.id
                                    ? {
                                        ...x,
                                        breakStartMinutes: Number(
                                          e.target.value,
                                        ),
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="mt-4 text-sm text-rose-800">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {onDelete && (
            <button
              type="button"
              className={`${button} mr-auto text-rose-700`}
              disabled={busy}
              onClick={() => void onDelete()}
            >
              Remove from draft
            </button>
          )}
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className={primary} disabled={busy}>
            {busy ? "Saving…" : "Save draft shift"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function ProfileEditor({
  users,
  profiles,
  busy,
  error,
  onClose,
  onSave,
}: {
  users: User[];
  profiles: SchedulingProfile[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (p: SchedulingProfile) => Promise<void>;
}) {
  const [userId, setUserId] = useState(users[0]?.id || "");
  return (
    <Modal label="Staff eligibility and scheduling limits" onClose={onClose}>
      <div className="mx-auto w-full max-w-xl rounded-3xl bg-white p-6">
        <h2 className="text-xl font-bold">
          Staff eligibility & scheduling limits
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Managers maintain eligible roles. These entries are not independent
          license verification. Limits are your organization’s settings, not a
          legal compliance guarantee. Zero means no configured limit.
        </p>
        <label className="mt-4 block text-sm font-semibold">
          Team member
          <select
            className={field}
            value={userId}
            disabled={busy}
            onChange={(e) => setUserId(e.target.value)}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <ProfileFields
          key={userId}
          userId={userId}
          profile={profiles.find((p) => p.userId === userId)}
          busy={busy}
          onSave={onSave}
        />
        {error && (
          <p role="alert" className="mt-4 text-sm text-rose-800">
            {error}
          </p>
        )}
        <button className={`${button} mt-4`} disabled={busy} onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}
function ProfileFields({
  userId,
  profile,
  busy,
  onSave,
}: {
  userId: string;
  profile?: SchedulingProfile;
  busy: boolean;
  onSave: (p: SchedulingProfile) => Promise<void>;
}) {
  const [roles, setRoles] = useState(profile?.roles.join(", ") || "");
  const [rest, setRest] = useState(profile?.minRestHours || 0);
  const [hours, setHours] = useState(profile?.maxWeeklyHours || 0);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({
          userId,
          roles: roles
            .split(",")
            .map((r) => r.trim())
            .filter(Boolean),
          minRestHours: rest,
          maxWeeklyHours: hours,
        });
      }}
    >
      <fieldset disabled={busy} className="mt-4 space-y-4">
        <label className="block text-sm font-semibold">
          Eligible roles, separated by commas
          <input
            className={field}
            value={roles}
            onChange={(e) => setRoles(e.target.value)}
            placeholder="Registered nurse, Supervisor"
          />
        </label>
        <label className="block text-sm font-semibold">
          Minimum rest between shifts (hours)
          <input
            type="number"
            min="0"
            max="72"
            required
            className={field}
            value={rest}
            onChange={(e) => setRest(Number(e.target.value))}
          />
        </label>
        <label className="block text-sm font-semibold">
          Maximum working hours per Monday–Sunday week
          <input
            type="number"
            min="0"
            max="168"
            required
            className={field}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          />
        </label>
        <button type="submit" className={primary} disabled={!userId}>
          {busy ? "Saving…" : "Save eligibility & limits"}
        </button>
      </fieldset>
    </form>
  );
}
function TemplateEditor({
  data,
  date,
  busy,
  error,
  onClose,
  onAction,
}: {
  data: ScheduleData;
  date: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onAction: (p: Mutation) => Promise<boolean>;
}) {
  const [start, setStart] = useState(date);
  const [name, setName] = useState("");
  const [include, setInclude] = useState(false);
  const [templateId, setTemplateId] = useState(data.templates[0]?.id || "");
  const [target, setTarget] = useState(addDays(date, 7));
  const [weeks, setWeeks] = useState(1);
  return (
    <Modal label="Schedule templates and repeats" onClose={onClose}>
      <div className="mx-auto w-full max-w-2xl rounded-3xl bg-white p-6">
        <h2 className="text-xl font-bold">Templates & repeats</h2>
        <p className="mt-2 text-sm text-slate-600">
          Save any seven-day draft pattern and repeat it for up to 12 weeks. New
          shifts stay in the draft and are checked for each actual date before
          publishing.
        </p>
        <form
          className="mt-5 space-y-3 rounded-xl border p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await onAction({
              action: "SAVE_TEMPLATE",
              name,
              startDate: start,
              includeAssignments: include,
            });
          }}
        >
          <h3 className="font-bold">Save a seven-day pattern</h3>
          <fieldset disabled={busy} className="space-y-3">
            <label className="block text-sm">
              Template name
              <input
                required
                maxLength={80}
                className={field}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              First day of source pattern
              <input
                type="date"
                required
                className={field}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={include}
                onChange={(e) => setInclude(e.target.checked)}
              />
              Include staff assignments and break patterns
            </label>
            <button type="submit" className={button}>
              Save template
            </button>
          </fieldset>
        </form>
        <form
          className="mt-4 space-y-3 rounded-xl border p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await onAction({
              action: "APPLY_TEMPLATE",
              templateId,
              startDate: target,
              weeks,
            });
          }}
        >
          <h3 className="font-bold">Apply a repeating pattern</h3>
          <fieldset
            disabled={busy || !data.templates.length}
            className="space-y-3"
          >
            <label className="block text-sm">
              Template
              <select
                required
                className={field}
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                <option value="">Choose a template</option>
                {data.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.entries.length} shifts
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                Target start date
                <input
                  type="date"
                  required
                  className={field}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Number of weeks
                <input
                  type="number"
                  min="1"
                  max="12"
                  required
                  className={field}
                  value={weeks}
                  onChange={(e) => setWeeks(Number(e.target.value))}
                />
              </label>
            </div>
            <button type="submit" className={primary}>
              Add repeated shifts to draft
            </button>
            <button
              type="button"
              className={`${button} ml-2`}
              disabled={!templateId}
              onClick={() => {
                if (
                  window.confirm(
                    "Delete this saved template? Existing shifts stay in place.",
                  )
                )
                  void onAction({ action: "DELETE_TEMPLATE", templateId });
              }}
            >
              Delete template
            </button>
          </fieldset>
          {!data.templates.length && (
            <p className="text-sm text-slate-500">
              Save your first template above.
            </p>
          )}
        </form>
        {error && (
          <p role="alert" className="mt-4 text-sm text-rose-800">
            {error}
          </p>
        )}
        <button className={`${button} mt-5`} disabled={busy} onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}
