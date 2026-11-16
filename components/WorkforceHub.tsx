import React, { useState, useRef } from "react";
import { User, ScheduleData } from "../types";
import { api } from "../services/api";
import { workspaceToday } from "../services/dates";
import {
  WorkforceData,
  workforceAction,
  downloadAuthenticated,
} from "../services/workforce";
import { shiftTimeLabel } from "../services/scheduling";
import { TeamTime } from "./TeamTime";
const button =
  "rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50";
const primary =
  "rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50";
const input =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm";
type Field = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
};
function Form({
  title,
  fields,
  submit,
  busy,
  onSubmit,
  children,
}: {
  title: string;
  fields: Field[];
  submit: string;
  busy: boolean;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  children?: React.ReactNode;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  return (
    <form
      className="space-y-4 rounded-2xl border bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(values);
      }}
    >
      <h3 className="font-bold">{title}</h3>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <label key={f.key} className="block text-sm font-semibold">
            {f.label}
            {f.options ? (
              <select
                className={input}
                required={f.required !== false}
                value={values[f.key] || ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.key]: e.target.value }))
                }
              >
                <option value="">Choose…</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={input}
                type={f.type || "text"}
                required={f.required !== false}
                step={f.type === "number" ? "any" : undefined}
                placeholder={f.placeholder}
                value={values[f.key] || ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.key]: e.target.value }))
                }
              />
            )}
          </label>
        ))}
      </fieldset>
      {children}
      <button className={primary} disabled={busy}>
        {busy ? "Saving…" : submit}
      </button>
    </form>
  );
}
export type WorkforcePage =
  "REPORTS" | "AUDIT" | "IMPORTS" | "SETTINGS" | "INTEGRATIONS";
const standalonePages: WorkforcePage[] = [
  "REPORTS",
  "AUDIT",
  "IMPORTS",
  "SETTINGS",
  "INTEGRATIONS",
];
const pageTitles: Record<WorkforcePage, [string, string]> = {
  REPORTS: [
    "Reports",
    "A clearer view of coverage, working hours, and team workload.",
  ],
  AUDIT: [
    "Audit history",
    "Follow the changes, decisions, and people behind your workspace.",
  ],
  IMPORTS: [
    "Imports",
    "Bring your staff and schedules together. Preview every row before saving.",
  ],
  SETTINGS: [
    "Settings",
    "Set up the locations, departments, and working rules your team needs.",
  ],
  INTEGRATIONS: [
    "Integrations",
    "Connect your calendar and check the services available to your workspace.",
  ],
};
interface Props {
  page?: WorkforcePage;
  orgId: string;
  user: User;
  users: User[];
  schedule: ScheduleData;
  data: WorkforceData;
  onRefresh: () => Promise<void>;
}
export function WorkforceHub({
  orgId,
  user,
  users,
  schedule,
  data,
  onRefresh,
  page,
}: Props) {
  const [internalTab, setTab] = useState("MY WORK");
  const tab = page || internalTab;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [csv, setCsv] = useState("");
  const [importKind, setImportKind] = useState("SHIFTS");
  const [importPreview, setImportPreview] = useState<any>(null);
  const [allowUnknown, setAllowUnknown] = useState(false);
  const [invitations, setInvitations] = useState<
    Array<{ email: string; token: string }>
  >([]);
  const [billing, setBilling] = useState<any>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const guard = useRef(false);
  const pending = useRef<{
    hash: string;
    id: string;
    revision: number;
    scheduleRevision: number;
  } | null>(null);
  const manager =
    data.permissions.admin || data.permissions.departments.length > 0;
  const admin = data.permissions.admin;
  const canManage = (department: string) =>
    admin || data.permissions.departments.includes(department);
  const name = (id: string) =>
    users.find((u) => u.id === id)?.name || "Staff member";
  const memberOptions = users.map((u) => ({ value: u.id, label: u.name }));
  const upcoming = schedule.published.filter(
    (s) => Date.parse(s.endsAt) > Date.now(),
  );
  const shiftOptions = upcoming.map((s) => ({
    value: s.id,
    label: `${s.title} · ${s.localStart.replace("T", " ")} · ${s.department}`,
  }));
  const myShifts = upcoming.filter((s) =>
    s.assignments.some((a) => a.userId === user.id),
  );
  const send = async (payload: Record<string, unknown>) => {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const fingerprint = JSON.stringify(payload);
    if (pending.current?.hash !== fingerprint)
      pending.current = {
        hash: fingerprint,
        id: crypto.randomUUID(),
        revision: data.revision,
        scheduleRevision: schedule.revision,
      };
    try {
      const result = await workforceAction(
        orgId,
        { ...data, revision: pending.current.revision },
        { scheduleRevision: pending.current.scheduleRevision, ...payload },
        pending.current.id,
      );
      if (result.preview) return result;
      await onRefresh();
      pending.current = null;
      setNotice("Saved successfully.");
      return result;
    } catch (e) {
      if ((e as { status?: number }).status === 409) pending.current = null;
      setError(e instanceof Error ? e.message : "Unable to save");
      return null;
    } finally {
      guard.current = false;
      setBusy(false);
    }
  };
  const loadReport = async (values: Record<string, string>) => {
    setBusy(true);
    setError("");
    try {
      setReport(
        await api.get(
          `/orgs/${orgId}/workforce/reports?start=${encodeURIComponent(values.start)}&end=${encodeURIComponent(values.end)}`,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load report");
    } finally {
      setBusy(false);
    }
  };
  const actual = (t: (typeof data.timesheets)[number]) =>
    t.clockOut
      ? Math.max(
          0,
          (Date.parse(t.clockOut) -
            Date.parse(t.clockIn) -
            t.breaks.reduce(
              (n, b) =>
                n + (b.end ? Date.parse(b.end) - Date.parse(b.start) : 0),
              0,
            )) /
            3600000,
        ).toFixed(2) + "h"
      : "In progress";
  const changeTab = (t: string) => {
    setTab(t);
    setError("");
    setNotice("");
    setPreview(null);
  };
  if (page && !(page === "REPORTS" || page === "AUDIT" ? manager : admin))
    return (
      <section className="p-7">
        <h1 className="text-2xl font-bold">Access restricted</h1>
        <p className="mt-3 text-slate-500">
          Your workspace role does not have access to this page.
        </p>
      </section>
    );
  return (
    <section className="space-y-5 p-4 md:p-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
          {page ? "WORKSPACE MANAGEMENT" : "PEOPLE & OPERATIONS"}
        </p>
        <h1 className="mt-2 text-2xl font-extrabold">
          {page ? pageTitles[page][0] : "Workforce centre"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {page
            ? pageTitles[page][1]
            : "Your time, shift changes, and qualifications—all in one place."}
        </p>
      </div>
      {!page && (
        <nav
          aria-label="Workforce features"
          className="flex gap-2 overflow-x-auto pb-2"
        >
          {[
            "MY WORK",
            "OPEN SHIFTS",
            "SWAPS",
            "CREDENTIALS",
            ...(manager ? ["DEPARTMENT", "TEAM TIME", "REPORTS", "AUDIT"] : []),
            ...(admin
              ? ["BUILDER", "WHAT IF", "IMPORTS", "SETTINGS", "INTEGRATIONS"]
              : []),
          ]
            .filter((t) => !standalonePages.includes(t as WorkforcePage))
            .map((t) => (
              <button
                key={t}
                aria-pressed={tab === t}
                className={`whitespace-nowrap rounded-xl px-4 py-3 text-xs font-bold ${tab === t ? "bg-slate-950 text-white" : "border bg-white text-slate-600"}`}
                onClick={() => changeTab(t)}
              >
                {t}
              </button>
            ))}
        </nav>
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
      {tab === "MY WORK" && (
        <div className="space-y-5">
          <div className="rounded-2xl border bg-sky-50 p-4 text-sm text-sky-900">
            Clock-in records are actual attendance. Scheduled hours remain
            estimates. Clock in from one hour before a shift starts until it
            ends.
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {myShifts.map((s) => (
              <article key={s.id} className="rounded-2xl border bg-white p-4">
                <h3 className="font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {s.localStart.slice(0, 10)} · {shiftTimeLabel(s)} ·{" "}
                  {s.location}
                </p>
                <button
                  className={`${primary} mt-3`}
                  disabled={busy}
                  onClick={() =>
                    void send({ action: "CLOCK_IN", shiftId: s.id })
                  }
                >
                  Clock in to shift
                </button>
              </article>
            ))}
          </div>
          <h2 className="text-lg font-bold">Your timesheets</h2>
          {data.timesheets
            .filter((t) => t.userId === user.id)
            .map((t) => (
              <article key={t.id} className="rounded-2xl border bg-white p-4">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      {t.department} · {actual(t)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(t.clockIn).toLocaleString()} · {t.status}
                      {t.correction ? " · Correction awaiting review" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!t.clockOut && (
                      <>
                        <button
                          className={button}
                          disabled={busy}
                          onClick={() =>
                            void send({
                              action: t.breaks.some((b) => !b.end)
                                ? "END_BREAK"
                                : "START_BREAK",
                              timesheetId: t.id,
                              version: t.version,
                            })
                          }
                        >
                          {t.breaks.some((b) => !b.end)
                            ? "End break"
                            : "Start break"}
                        </button>
                        <button
                          className={primary}
                          disabled={busy}
                          onClick={() =>
                            void send({
                              action: "CLOCK_OUT",
                              timesheetId: t.id,
                              version: t.version,
                            })
                          }
                        >
                          Clock out
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
          {!data.timesheets.some((t) => t.userId === user.id) && (
            <p className="text-sm text-slate-500">
              No recorded time yet. Your first clock-in will appear here.
            </p>
          )}
          <Form
            title="Request a time correction"
            busy={busy}
            submit="Submit correction for review"
            fields={[
              {
                key: "timesheetId",
                label: "Closed timesheet",
                options: data.timesheets
                  .filter((t) => t.userId === user.id && t.clockOut)
                  .map((t) => ({
                    value: t.id,
                    label: `${t.department} · ${new Date(t.clockIn).toLocaleDateString()}`,
                  })),
              },
              {
                key: "localClockIn",
                label: `Correct clock-in (${schedule.timezone})`,
                type: "datetime-local",
              },
              {
                key: "localClockOut",
                label: `Correct clock-out (${schedule.timezone})`,
                type: "datetime-local",
              },
              {
                key: "breakMinutes",
                label: "Total actual break minutes",
                type: "number",
              },
              { key: "reason", label: "Reason for correction" },
            ]}
            onSubmit={async (v) => {
              const t = data.timesheets.find((t) => t.id === v.timesheetId);
              await send({
                action: "CORRECT_TIME",
                ...v,
                breakMinutes: Number(v.breakMinutes),
                version: t?.version,
              });
            }}
          />
          <Form
            title="Your scheduling preferences"
            busy={busy}
            submit="Save preferences"
            fields={[
              {
                key: "days",
                label: "Unavailable weekdays (0=Sunday to 6=Saturday)",
                required: false,
                placeholder: "0, 6",
              },
              {
                key: "avoidNights",
                label: "Avoid night shifts",
                options: [
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ],
              },
            ]}
            onSubmit={async (v) => {
              await send({
                action: "PREFERENCES",
                unavailableWeekdays: (v.days || "")
                  .split(",")
                  .filter((s) => s.trim())
                  .map(Number),
                avoidNights: v.avoidNights === "yes",
              });
            }}
          />
        </div>
      )}
      {tab === "OPEN SHIFTS" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Managers contact eligible staff in small rounds. Invitations expire,
            and eligibility is checked again when someone accepts. Messages are
            delivered in the app.
          </p>
          {manager && (
            <Form
              title="Open a replacement search"
              busy={busy}
              submit="Open vacancy"
              fields={[
                {
                  key: "shiftId",
                  label: "Published shift",
                  options: shiftOptions,
                },
                {
                  key: "absentUserId",
                  label: "Remove absent staff member (optional)",
                  options: memberOptions,
                  required: false,
                },
                { key: "reason", label: "Manager note", required: false },
              ]}
              onSubmit={async (v) => {
                await send({ action: "OPEN_VACANCY", ...v });
              }}
            />
          )}
          {data.vacancies.map((v) => {
            const s = schedule.published.find((s) => s.id === v.shiftId);
            const offered = v.rounds.some(
              (r) =>
                r.candidates.includes(user.id) &&
                !r.declined.includes(user.id) &&
                Date.parse(r.expiresAt) > Date.now(),
            );
            return (
              <article key={v.id} className="rounded-2xl border bg-white p-5">
                <h3 className="font-bold">
                  {s?.title || "Assignment"} · {v.status}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {s?.localStart.replace("T", " ")} · {v.department}
                </p>
                {v.reason && <p className="mt-2 text-sm">{v.reason}</p>}
                <p className="mt-2 text-xs text-slate-500">
                  {v.rounds.length} contact rounds
                </p>
                {canManage(v.department) && v.status === "OPEN" && (
                  <button
                    className={`${primary} mt-3`}
                    disabled={busy}
                    onClick={() =>
                      void send({
                        action: "CONTACT_ROUND",
                        vacancyId: v.id,
                        batchSize: 3,
                        minutes: 15,
                      })
                    }
                  >
                    Contact next 3 eligible staff
                  </button>
                )}
                {offered && v.status === "OPEN" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      className={primary}
                      disabled={busy}
                      onClick={() =>
                        void send({
                          action: "VACANCY_RESPONSE",
                          vacancyId: v.id,
                          decision: "ACCEPT",
                        })
                      }
                    >
                      Accept open shift
                    </button>
                    <button
                      className={button}
                      disabled={busy}
                      onClick={() =>
                        void send({
                          action: "VACANCY_RESPONSE",
                          vacancyId: v.id,
                          decision: "DECLINE",
                        })
                      }
                    >
                      Decline offer
                    </button>
                  </div>
                )}
              </article>
            );
          })}
          {!data.vacancies.length && (
            <p className="rounded-xl border border-dashed p-6 text-sm text-slate-500">
              No replacement searches or invitations yet.
            </p>
          )}
        </div>
      )}
      {tab === "SWAPS" && (
        <div className="space-y-4">
          <Form
            title="Offer or trade an assignment"
            busy={busy}
            submit="Send swap request"
            fields={[
              {
                key: "shiftId",
                label: "Your assignment",
                options: myShifts.map((s) => ({
                  value: s.id,
                  label: `${s.title} · ${s.localStart}`,
                })),
              },
              {
                key: "toUserId",
                label: "Colleague",
                options: memberOptions.filter((o) => o.value !== user.id),
              },
              {
                key: "tradeShiftId",
                label: "Colleague’s shift to trade (optional)",
                options: shiftOptions,
                required: false,
              },
            ]}
            onSubmit={async (v) => {
              await send({ action: "REQUEST_SWAP", ...v });
            }}
          />
          {data.swaps.map((s) => (
            <article key={s.id} className="rounded-2xl border bg-white p-5">
              <h3 className="font-bold">
                {name(s.fromUserId)} → {name(s.toUserId)} · {s.status}
              </h3>
              <p className="mt-2 text-sm">
                {schedule.published.find((x) => x.id === s.shiftId)?.title} ·{" "}
                {s.tradeShiftId ? "Two-way trade" : "Shift offer"}
              </p>
              {s.status === "PENDING" && s.toUserId === user.id && (
                <div className="mt-3 flex gap-2">
                  <button
                    className={primary}
                    disabled={busy}
                    onClick={() =>
                      void send({
                        action: "RESPOND_SWAP",
                        swapId: s.id,
                        decision: "ACCEPT",
                      })
                    }
                  >
                    Accept proposal
                  </button>
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() =>
                      void send({
                        action: "RESPOND_SWAP",
                        swapId: s.id,
                        decision: "DECLINE",
                      })
                    }
                  >
                    Decline proposal
                  </button>
                </div>
              )}
              {s.status === "ACCEPTED" && canManage(s.department) && (
                <button
                  className={`${primary} mt-3`}
                  disabled={busy}
                  onClick={() =>
                    void send({ action: "APPROVE_SWAP", swapId: s.id })
                  }
                >
                  Check and approve swap
                </button>
              )}
            </article>
          ))}
          <p className="text-xs text-slate-500">
            A colleague’s acceptance does not change the schedule. A different
            manager must approve it after fresh conflict and qualification
            checks.
          </p>
        </div>
      )}
      {tab === "CREDENTIALS" && (
        <div className="space-y-4">
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            Uploaded means a document was submitted. Reviewed means a manager
            checked it. Independent verification is{" "}
            {data.independentVerificationConfigured
              ? "configured"
              : "not connected"}
            ; manager review is not independent verification.
          </div>
          <label className="block rounded-2xl border bg-white p-5 text-sm font-semibold">
            Upload your supporting document (PDF, PNG or JPEG, up to 3 MB)
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              disabled={busy}
              className="mt-3 block text-sm"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                setError("");
                try {
                  if (file.size > 3 * 1024 * 1024)
                    throw new Error("Document exceeds 3 MB");
                  const base64 = await new Promise<string>(
                    (resolve, reject) => {
                      const r = new FileReader();
                      r.onload = () => resolve(String(r.result).split(",")[1]);
                      r.onerror = reject;
                      r.readAsDataURL(file);
                    },
                  );
                  const result = await api.post(
                    `/orgs/${orgId}/workforce/files`,
                    { name: file.name, contentType: file.type, base64 },
                  );
                  setFileId(result.id);
                  setNotice(
                    "Document uploaded. Complete its type and expiry below.",
                  );
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Upload failed");
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
          <Form
            title="Add your credential"
            busy={busy}
            submit="Submit credential"
            fields={[
              {
                key: "type",
                label: "Credential type",
                placeholder: "Registered nurse license",
              },
              { key: "expiresOn", label: "Expiry date", type: "date" },
            ]}
            onSubmit={async (v) => {
              const result = await send({ action: "CREDENTIAL", ...v, fileId });
              if (result) setFileId(null);
            }}
          />
          {data.credentials.map((c) => (
            <article key={c.id} className="rounded-2xl border bg-white p-4">
              <h3 className="font-bold">
                {name(c.userId)} · {c.type}
              </h3>
              <p
                className={`mt-2 text-sm ${c.expiresOn < workspaceToday(schedule.timezone) ? "text-rose-700" : "text-slate-500"}`}
              >
                {c.status} · Expires {c.expiresOn}
              </p>
              <div className="mt-3 flex gap-2">
                {c.fileId && (
                  <button
                    className={button}
                    onClick={() =>
                      void downloadAuthenticated(
                        `/orgs/${orgId}/workforce/files/${c.fileId}`,
                        "credential-document",
                      ).catch((e) => setError(e.message))
                    }
                  >
                    Download document
                  </button>
                )}
                {manager && c.userId !== user.id && c.status === "UPLOADED" && (
                  <button
                    className={primary}
                    disabled={busy}
                    onClick={() =>
                      void send({
                        action: "REVIEW_CREDENTIAL",
                        credentialId: c.id,
                      })
                    }
                  >
                    Mark manager-reviewed
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {tab === "DEPARTMENT" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Manage draft assignments in departments you are authorized to
            oversee. Changes stay private until you publish that department.
            Whole-workspace settings remain administrator-only.
          </p>
          {schedule.shifts
            .filter((s) => canManage(s.department))
            .map((s) => (
              <DepartmentAssignments
                key={`${s.id}-${schedule.revision}`}
                shift={s}
                users={users}
                busy={busy}
                onSave={async (userIds) => {
                  await send({
                    action: "DEPARTMENT_ASSIGN",
                    shiftId: s.id,
                    userIds,
                  });
                }}
              />
            ))}
          <Form
            title="Publish a department’s draft assignments"
            busy={busy}
            submit="Check and publish department"
            fields={[
              {
                key: "department",
                label: "Department",
                options: [
                  ...new Set(
                    schedule.shifts
                      .filter((s) => canManage(s.department))
                      .map((s) => s.department),
                  ),
                ].map((d) => ({ value: d, label: d })),
              },
            ]}
            onSubmit={async (v) => {
              await send({
                action: "DEPARTMENT_PUBLISH",
                department: v.department,
              });
            }}
          />
        </div>
      )}
      {tab === "TEAM TIME" && (
        <TeamTime
          data={data}
          schedule={schedule}
          users={users}
          currentUserId={user.id}
          busy={busy}
          onAction={send}
          onRefresh={onRefresh}
        />
      )}
      {tab === "BUILDER" && (
        <div className="space-y-4">
          <section className="space-y-4 rounded-2xl border bg-white p-5">
            <h2 className="font-bold">Explainable draft builder</h2>
            <p className="text-sm leading-6 text-slate-500">
              Create unfilled draft shifts in the planner first. The builder
              tries eligible staff with the lowest assigned minutes, respects
              preferences and current rules, and explains unfilled slots. This
              is a deterministic draft suggestion, not a guarantee of an optimal
              schedule.
            </p>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={allowUnknown}
                onChange={(e) => setAllowUnknown(e.target.checked)}
              />
              Allow candidates whose day availability is unknown (otherwise
              approved availability is required).
            </label>
            <button
              className={primary}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  setPreview(
                    await api.post(`/orgs/${orgId}/workforce/preview`, {
                      kind: "BUILD",
                      allowUnknownAvailability: allowUnknown,
                    }),
                  );
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Preview failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Preview suggested assignments
            </button>
          </section>
          {preview && (
            <section className="space-y-4 rounded-2xl border bg-white p-5">
              <h3 className="font-bold">Assignment explanations</h3>
              <ul className="space-y-3 text-sm">
                {preview.explanation?.map((e: any, i: number) => (
                  <li key={i}>{e.message}</li>
                ))}
              </ul>
              <button
                className={primary}
                disabled={busy}
                onClick={() =>
                  void send({
                    action: "APPLY_BUILD",
                    allowUnknownAvailability: allowUnknown,
                  })
                }
              >
                Recheck and apply suggestions to draft
              </button>
            </section>
          )}
        </div>
      )}
      {tab === "WHAT IF" && (
        <div className="space-y-4">
          <Form
            title="Preview a staff absence or leave day"
            busy={busy}
            submit="Preview impact without saving"
            fields={[
              {
                key: "absentUserId",
                label: "Staff member",
                options: memberOptions,
              },
              { key: "date", label: "Date to preview", type: "date" },
            ]}
            onSubmit={async (v) => {
              setBusy(true);
              setError("");
              try {
                setPreview(
                  await api.post(`/orgs/${orgId}/workforce/preview`, {
                    kind: "WHAT_IF",
                    ...v,
                  }),
                );
              } catch (e) {
                setError(e instanceof Error ? e.message : "Preview failed");
              } finally {
                setBusy(false);
              }
            }}
          />
          <Form
            title="Preview an extra shift"
            busy={busy}
            submit="Preview extra-shift impact"
            fields={[
              { key: "title", label: "Shift title" },
              { key: "department", label: "Department" },
              { key: "location", label: "Location" },
              { key: "role", label: "Required role" },
              {
                key: "requiredCount",
                label: "Required staff count",
                type: "number",
              },
              {
                key: "localStart",
                label: `Starts (${schedule.timezone})`,
                type: "datetime-local",
              },
              {
                key: "localEnd",
                label: `Ends (${schedule.timezone})`,
                type: "datetime-local",
              },
              {
                key: "userId",
                label: "Assign one staff member (optional)",
                options: memberOptions,
                required: false,
              },
            ]}
            onSubmit={async (v) => {
              setBusy(true);
              setError("");
              try {
                setPreview(
                  await api.post(`/orgs/${orgId}/workforce/preview`, {
                    kind: "WHAT_IF",
                    extraShift: {
                      ...v,
                      requiredCount: Number(v.requiredCount),
                      assignments: v.userId
                        ? [
                            {
                              userId: v.userId,
                              breakMinutes: 0,
                              breakStartMinutes: 0,
                            },
                          ]
                        : [],
                    },
                  }),
                );
              } catch (e) {
                setError(e instanceof Error ? e.message : "Preview failed");
              } finally {
                setBusy(false);
              }
            }}
          />
          {preview && (
            <section className="space-y-3 rounded-2xl border bg-white p-5">
              <h3 className="font-bold">Preview only — nothing changed</h3>
              <p className="text-sm">
                Estimated base cost before:{" "}
                {preview.before?.totalBaseCostCents === null
                  ? "Unknown (missing rates)"
                  : `$${(preview.before?.totalBaseCostCents / 100).toFixed(2)}`}
              </p>
              <p className="text-sm">
                Estimated base cost after:{" "}
                {preview.after?.totalBaseCostCents === null
                  ? "Unknown (missing rates)"
                  : `$${(preview.after?.totalBaseCostCents / 100).toFixed(2)}`}
              </p>
              <p className="text-xs text-slate-500">
                Base-rate comparison only. Overtime and tax are not included in
                this preview.
              </p>
              <ul className="space-y-2 text-sm text-amber-900">
                {preview.issues?.map((i: any, n: number) => (
                  <li key={n}>{i.message}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
      {tab === "REPORTS" && (
        <div className="space-y-4">
          <Form
            title="Management and fairness report"
            busy={busy}
            submit="Load report"
            fields={[
              { key: "start", label: "From date", type: "date" },
              { key: "end", label: "Through date", type: "date" },
            ]}
            onSubmit={loadReport}
          />
          {report && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ["Planned hours", report.plannedMinutes / 60],
                  ["Accepted hours", report.confirmedMinutes / 60],
                  ["Approved actual hours", report.approvedWorkedMinutes / 60],
                  ["Coverage gaps", report.coverageGaps],
                ].map(([label, value]) => (
                  <div className="rounded-2xl border bg-white p-4" key={label}>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-2 text-xl font-bold">
                      {Number(value).toFixed(1)}
                    </p>
                  </div>
                ))}
              </div>
              <section className="overflow-x-auto rounded-2xl border bg-white p-5">
                <h3 className="mb-4 font-bold">Fairness distribution</h3>
                <p className="mb-4 text-xs text-slate-500">
                  Night minutes: 22:00–06:00. Weekends: Saturday/Sunday. These
                  are planned assignments, not fatigue or legal compliance
                  scores.
                </p>
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr>
                      {[
                        "Staff",
                        "Planned hours",
                        "Night hours",
                        "Weekend hours",
                        "Overtime hours",
                      ].map((h) => (
                        <th key={h} className="border-b p-2">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.fairness.map((r: any) => (
                      <tr key={r.userId}>
                        <td className="p-2">{r.name}</td>
                        {[
                          "plannedMinutes",
                          "nightMinutes",
                          "weekendMinutes",
                          "plannedOvertimeMinutes",
                        ].map((k) => (
                          <td key={k} className="p-2">
                            {r[k] === null ? "Unknown" : (r[k] / 60).toFixed(1)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-4 text-sm">
                  Estimated gross pay:{" "}
                  {report.estimatedGrossCents === null
                    ? "Unknown — missing pay rates or overtime policy"
                    : `$${(report.estimatedGrossCents / 100).toFixed(2)}`}{" "}
                  · {report.unknownRateEntries} records with missing rates ·{" "}
                  {report.unknownPolicyEntries} with an unconfigured pay policy
                </p>
                <p className="mt-2 text-sm">
                  Open vacancies: {report.openVacancies} · Filled:{" "}
                  {report.filledVacancies} · Average fill time:{" "}
                  {report.averageFillMinutes === null
                    ? "Unknown"
                    : `${report.averageFillMinutes.toFixed(1)} minutes`}
                </p>
              </section>
              <Form
                title="Export approved payroll estimates"
                busy={busy}
                submit="Download payroll CSV"
                fields={[
                  { key: "start", label: "From date", type: "date" },
                  { key: "end", label: "Through date", type: "date" },
                ]}
                onSubmit={async (v) => {
                  try {
                    await downloadAuthenticated(
                      `/orgs/${orgId}/workforce/payroll.csv?start=${v.start}&end=${v.end}`,
                      "pulseshift-payroll.csv",
                    );
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Export failed");
                  }
                }}
              />
            </>
          )}
          <Form
            title="Record a fairness exception"
            busy={busy}
            submit="Save explanation"
            fields={[
              { key: "userId", label: "Staff member", options: memberOptions },
              { key: "department", label: "Department" },
              { key: "note", label: "Why this distribution is appropriate" },
            ]}
            onSubmit={async (v) => {
              await send({ action: "FAIRNESS_EXCEPTION", ...v });
            }}
          />
          {data.exceptions.map((e) => (
            <p key={e.id} className="rounded-xl border p-4 text-sm">
              <strong>
                {name(e.userId)} · {e.department}:
              </strong>{" "}
              {e.note}
            </p>
          ))}
        </div>
      )}
      {tab === "AUDIT" && (
        <div className="space-y-4">
          <Form
            title="Search activity history"
            busy={busy}
            submit="Search activity"
            fields={[
              { key: "q", label: "Action or record ID", required: false },
            ]}
            onSubmit={async (v) => {
              setError("");
              try {
                setAudit(
                  (
                    await api.get(
                      `/orgs/${orgId}/workforce/audit?q=${encodeURIComponent(v.q || "")}`,
                    )
                  ).events,
                );
              } catch (e) {
                setError(e instanceof Error ? e.message : "Search failed");
              }
            }}
          />
          {audit.map((e) => (
            <article key={e.id} className="rounded-xl border bg-white p-4">
              <p className="text-sm font-bold">
                {e.action.replaceAll("_", " ")} ·{" "}
                {e.actorId ? name(e.actorId) : "System"}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {new Date(e.createdAt).toLocaleString()} ·{" "}
                {e.department || "Workspace"} · {e.entityId || ""}
              </p>
            </article>
          ))}
        </div>
      )}
      {tab === "IMPORTS" && (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-white p-5">
            <h2 className="font-bold">Preview a CSV spreadsheet import</h2>
            <p className="mt-2 text-sm text-slate-500">
              Up to 200 rows. Staff imports create invitations, not accounts.
              Copy and share the generated links. Shift imports create private
              drafts.
            </p>
            <label className="mt-4 block text-sm font-semibold">
              Import type
              <select
                className={input}
                value={importKind}
                onChange={(e) => {
                  setImportKind(e.target.value);
                  setImportPreview(null);
                }}
              >
                <option value="SHIFTS">Draft shifts</option>
                <option value="STAFF">Staff invitations</option>
              </select>
            </label>
            <p className="mt-3 break-words rounded-lg bg-slate-50 p-3 font-mono text-xs">
              {importKind === "SHIFTS"
                ? "title,department,location,role,requiredCount,localStart,localEnd,emails"
                : "name,email"}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Use dates such as 2026-12-01T08:00. Separate assigned emails with
              semicolons. Export Excel or Google Sheets as CSV first.
            </p>
            <input
              className="mt-3 block text-sm"
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setCsv(await f.text());
                  setImportPreview(null);
                }
              }}
            />
            <label className="mt-3 block text-sm font-semibold">
              CSV contents
              <textarea
                className={`${input} h-40 font-mono`}
                value={csv}
                onChange={(e) => {
                  setCsv(e.target.value);
                  setImportPreview(null);
                }}
              />
            </label>
            <button
              className={`${primary} mt-3`}
              disabled={busy || !csv}
              onClick={async () => {
                const result = await send({
                  action: "IMPORT",
                  kind: importKind,
                  csv,
                  commit: false,
                });
                if (result) setImportPreview(result);
              }}
            >
              Preview and validate rows
            </button>
          </div>
          {importPreview && (
            <section className="space-y-3 rounded-2xl border bg-white p-5">
              <h3 className="font-bold">
                {importPreview.validRows.length} valid rows ·{" "}
                {importPreview.errors.length} errors
              </h3>
              {importPreview.errors.map((e: any) => (
                <p key={e.row} className="text-sm text-rose-700">
                  Row {e.row}: {e.message}
                </p>
              ))}
              <ul className="max-h-48 space-y-2 overflow-auto text-sm">
                {importPreview.validRows.map((r: any, i: number) => (
                  <li key={i}>
                    {r.title || r.name} · {r.localStart || r.email}
                  </li>
                ))}
              </ul>
              <button
                className={primary}
                disabled={busy || !!importPreview.errors.length}
                onClick={async () => {
                  const result = await send({
                    action: "IMPORT",
                    kind: importKind,
                    csv,
                    commit: true,
                    fingerprint: importPreview.fingerprint,
                  });
                  if (result) {
                    setInvitations(result.invitations || []);
                    setImportPreview(null);
                  }
                }}
              >
                Confirm import
              </button>
            </section>
          )}
          {invitations.map((i) => (
            <div key={i.email} className="rounded-xl border p-4 text-sm">
              <p>{i.email}</p>
              <button
                className={`${button} mt-2`}
                onClick={() =>
                  void navigator.clipboard
                    .writeText(`${window.location.origin}/#invite=${i.token}`)
                    .then(() => setNotice("Invitation link copied."))
                    .catch(() =>
                      setError(
                        "Clipboard unavailable. Use a browser that supports clipboard access.",
                      ),
                    )
                }
              >
                Copy invitation link
              </button>
            </div>
          ))}
        </div>
      )}
      {tab === "SETTINGS" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Form
            title="Hourly pay rate (USD)"
            busy={busy}
            submit="Save rate"
            fields={[
              { key: "userId", label: "Staff member", options: memberOptions },
              { key: "dollars", label: "Dollars per hour", type: "number" },
            ]}
            onSubmit={async (v) => {
              await send({
                action: "RATE",
                userId: v.userId,
                hourlyCents: Math.round(Number(v.dollars) * 100),
              });
            }}
          />
          <Form
            title="Overtime estimate policy"
            busy={busy}
            submit="Save pay policy"
            fields={[
              {
                key: "threshold",
                label: "Weekly threshold hours (blank = unknown)",
                type: "number",
                required: false,
              },
              {
                key: "multiplier",
                label: "Overtime multiplier (blank = unknown)",
                type: "number",
                required: false,
              },
            ]}
            onSubmit={async (v) => {
              await send({
                action: "SETTINGS",
                settings: {
                  ...data.settings,
                  overtimeThresholdHours: v.threshold
                    ? Number(v.threshold)
                    : null,
                  overtimeMultiplier: v.multiplier
                    ? Number(v.multiplier)
                    : null,
                },
              });
            }}
          >
            <p className="text-xs leading-6 text-slate-500">
              USD gross estimates only. Configure the policy that applies to
              your team. This does not calculate withholding, taxes, or issue
              payments.
            </p>
          </Form>
          <Form
            title="Required credentials by role"
            busy={busy}
            submit="Save credential requirement"
            fields={[
              { key: "role", label: "Scheduling role" },
              { key: "types", label: "Credential types, separated by commas" },
            ]}
            onSubmit={async (v) => {
              await send({
                action: "SETTINGS",
                settings: {
                  ...data.settings,
                  credentialRules: data.settings.credentialRules
                    .filter((r) => r.role !== v.role)
                    .concat({
                      role: v.role,
                      types: v.types
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    }),
                },
              });
            }}
          />
          <Form
            title="Department manager access"
            busy={busy}
            submit="Save manager permissions"
            fields={[
              { key: "userId", label: "Team member", options: memberOptions },
              {
                key: "departments",
                label: "Allowed departments, separated by commas",
                required: false,
              },
            ]}
            onSubmit={async (v) => {
              await send({
                action: "ACCESS",
                userId: v.userId,
                departments: (v.departments || "")
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              });
            }}
          />
          <Form
            title="Staff department membership"
            busy={busy}
            submit="Save staff departments"
            fields={[
              { key: "userId", label: "Team member", options: memberOptions },
              { key: "departments", label: "Departments, separated by commas" },
            ]}
            onSubmit={async (v) => {
              await send({
                action: "STAFF_UNITS",
                userId: v.userId,
                departments: v.departments
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              });
            }}
          />
          <Form
            title="Add a location"
            busy={busy}
            submit="Save location"
            fields={[
              { key: "name", label: "Location name" },
              { key: "departments", label: "Departments, separated by commas" },
            ]}
            onSubmit={async (v) => {
              await send({
                action: "SITE",
                name: v.name,
                departments: v.departments
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              });
            }}
          />
          <section className="rounded-2xl border bg-white p-5">
            <h3 className="font-bold">Current rates and locations</h3>
            {data.rates.map((r) => (
              <p key={r.userId} className="mt-3 text-sm">
                {name(r.userId)} · ${(r.hourlyCents / 100).toFixed(2)}/hour
              </p>
            ))}
            {data.sites.map((s) => (
              <p key={s.id} className="mt-3 text-sm">
                {s.name} · {s.departments.join(", ")}
              </p>
            ))}
          </section>
        </div>
      )}
      {tab === "INTEGRATIONS" && (
        <div className="space-y-4">
          <section className="space-y-4 rounded-2xl border bg-white p-5">
            <h2 className="font-bold">Calendar connection</h2>
            <p className="text-sm text-slate-500">
              Download your current assignments as a calendar file for Apple
              Calendar, Google Calendar or Outlook. This is an export, not an
              automatic two-way sync.
            </p>
            <button
              className={button}
              onClick={() =>
                void downloadAuthenticated(
                  `/orgs/${orgId}/workforce/calendar`,
                  "pulseshift.ics",
                ).catch((e) => setError(e.message))
              }
            >
              Download my calendar
            </button>
          </section>
          <section className="space-y-4 rounded-2xl border bg-white p-5">
            <h2 className="font-bold">Subscription billing</h2>
            <button
              className={button}
              onClick={async () => {
                try {
                  setBilling(await api.get(`/orgs/${orgId}/billing`));
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Unable to check billing",
                  );
                }
              }}
            >
              Check billing connection
            </button>
            {billing && (
              <>
                <p className="text-sm">
                  {billing.configured
                    ? "Billing provider connected."
                    : "Automatic billing is not connected. Configure provider credentials and plan prices before accepting payments."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {["TEAM", "BUSINESS"].map((plan) => (
                    <button
                      key={plan}
                      className={primary}
                      disabled={!billing.configured || busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const result = await api.post(
                            `/orgs/${orgId}/billing/checkout`,
                            { plan, operationId: crypto.randomUUID() },
                          );
                          window.location.assign(result.url);
                        } catch (e) {
                          setError(
                            e instanceof Error ? e.message : "Checkout failed",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Subscribe to {plan}
                    </button>
                  ))}
                  <button
                    className={button}
                    disabled={!billing.configured || busy}
                    onClick={async () => {
                      try {
                        window.location.assign(
                          (await api.post(`/orgs/${orgId}/billing/portal`)).url,
                        );
                      } catch (e) {
                        setError(
                          e instanceof Error ? e.message : "Portal unavailable",
                        );
                      }
                    }}
                  >
                    Manage subscription
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

function DepartmentAssignments({
  shift,
  users,
  busy,
  onSave,
}: {
  shift: ScheduleData["shifts"][number];
  users: User[];
  busy: boolean;
  onSave: (ids: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState(
    shift.assignments.map((a) => a.userId),
  );
  return (
    <form
      className="space-y-4 rounded-2xl border bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(selected);
      }}
    >
      <h3 className="font-bold">
        {shift.title} · {shift.department}
      </h3>
      <p className="text-sm text-slate-500">
        {shift.localStart.replace("T", " ")} · {shiftTimeLabel(shift)} ·{" "}
        {shift.requiredCount} required {shift.role}
      </p>
      <fieldset disabled={busy} className="grid gap-2 sm:grid-cols-2">
        {users.map((u) => (
          <label className="flex items-center gap-3 text-sm" key={u.id}>
            <input
              type="checkbox"
              checked={selected.includes(u.id)}
              onChange={(e) =>
                setSelected((ids) =>
                  e.target.checked
                    ? [...ids, u.id]
                    : ids.filter((id) => id !== u.id),
                )
              }
            />
            {u.name}
          </label>
        ))}
      </fieldset>
      <button className={primary} disabled={busy}>
        Save department draft assignments
      </button>
    </form>
  );
}
