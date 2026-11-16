import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TeamTime } from "../components/TeamTime";
import { attendanceRows } from "../services/attendance";
import { WorkforceData, TimeEntry } from "../services/workforce";
import { Role, ScheduleData, ScheduledShift } from "../types";

const shift: ScheduledShift = {
  id: "shift",
  title: "Morning shift",
  department: "Ward A",
  location: "Main clinic",
  role: "Nurse",
  requiredCount: 1,
  localStart: "2026-11-14T08:00",
  localEnd: "2026-11-14T16:00",
  startsAt: "2026-11-14T07:00:00Z",
  endsAt: "2026-11-14T15:00:00Z",
  publicationVersion: 3,
  assignments: [{ userId: "staff", breakMinutes: 0, breakStartMinutes: 0 }],
  requiresAcknowledgement: true,
};
const schedule: ScheduleData = {
  revision: 1,
  timezone: "Africa/Lagos",
  shifts: [shift],
  published: [shift],
  profiles: [],
  templates: [],
  issues: [],
  acknowledgements: [],
};
const workforce: WorkforceData = {
  revision: 1,
  permissions: { admin: true, departments: [] },
  preferences: [],
  credentials: [],
  vacancies: [],
  swaps: [],
  timesheets: [],
  rates: [],
  access: [],
  staffUnits: [],
  sites: [],
  exceptions: [],
  imports: [],
  settings: {
    currency: "USD",
    overtimeThresholdHours: null,
    overtimeMultiplier: null,
    credentialRules: [],
  },
  independentVerificationConfigured: false,
  assignmentResponses: [
    {
      shiftId: "shift",
      userId: "staff",
      publicationVersion: 3,
      decision: "ACCEPT",
    },
  ],
};
const record: TimeEntry = {
  id: "time",
  userId: "staff",
  shiftId: "shift",
  department: "Ward A",
  location: "Main clinic",
  timezone: "Africa/Lagos",
  clockIn: "2026-11-14T07:00:00Z",
  clockOut: "2026-11-14T15:00:00Z",
  breaks: [{ start: "2026-11-14T11:00:00Z", end: "2026-11-14T11:30:00Z" }],
  status: "PENDING",
  version: 2,
};
const users = [
  { id: "staff", name: "Taiwo", role: Role.NURSE, avatar: "" },
  { id: "owner", name: "Lamie", role: Role.ADMIN, avatar: "" },
];
const props = {
  data: workforce,
  schedule,
  users,
  currentUserId: "owner",
  busy: false,
  onAction: vi.fn(async () => {}),
  onRefresh: vi.fn(async () => {}),
};
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-16T12:00:00Z"));
  vi.clearAllMocks();
});
afterEach(() => vi.useRealTimers());

it("shows an accepted past assignment even without attendance, without inventing worked hours or an absence", () => {
  render(<TeamTime {...props} />);
  expect(
    screen.getByRole("article", { name: "Taiwo · Morning shift" }),
  ).toBeTruthy();
  expect(screen.getByText("Accepted", { exact: true })).toBeTruthy();
  expect(screen.getAllByText("Not recorded", { exact: true })).toHaveLength(2);
  expect(screen.getByText("No time submitted")).toBeTruthy();
  expect(
    screen.getByText(/This shift has ended without a clock-in record/),
  ).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Approve recorded time" }),
  ).toBeNull();
  expect(screen.queryByText("8.00h")).toBeNull();
});

it("requires acceptance of the current published version", () => {
  const data = {
    ...workforce,
    assignmentResponses: [
      { ...workforce.assignmentResponses[0], publicationVersion: 2 },
    ],
  };
  render(<TeamTime {...props} data={data} />);
  expect(screen.getByText("Awaiting response", { exact: true })).toBeTruthy();
  expect(screen.queryByText("Accepted", { exact: true })).toBeNull();
});

it("keeps an open clock-in unapproved until a clock-out is recorded", () => {
  render(
    <TeamTime
      {...props}
      data={{
        ...workforce,
        timesheets: [{ ...record, clockOut: null, status: "OPEN" }],
      }}
    />,
  );
  expect(screen.getByText("Still clocked in")).toBeTruthy();
  expect(screen.getByText("Awaiting clock-out")).toBeTruthy();
  expect(screen.getByText("In progress", { exact: true })).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Approve recorded time" }),
  ).toBeNull();
});

it("shows actual net hours and submits approval with the record version", () => {
  render(<TeamTime {...props} data={{ ...workforce, timesheets: [record] }} />);
  expect(screen.getByText("7.50h", { exact: true })).toBeTruthy();
  expect(
    screen.getByText("Awaiting approval", { exact: true, selector: "dd" }),
  ).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Approve recorded time" }),
  );
  expect(props.onAction).toHaveBeenCalledWith({
    action: "APPROVE_TIME",
    timesheetId: "time",
    version: 2,
  });
});

it("shows approved time and reviewer while identifying a pending correction", () => {
  render(
    <TeamTime
      {...props}
      data={{
        ...workforce,
        timesheets: [
          {
            ...record,
            status: "APPROVED",
            approvedBy: "owner",
            approvedAt: "2026-11-15T10:00:00Z",
            correction: { reason: "Break was shorter" },
          },
        ],
      }}
    />,
  );
  expect(screen.getByText("Approved", { exact: true })).toBeTruthy();
  expect(
    screen.getByText(/Approved recorded hours: 7.50h · Reviewed by Lamie/),
  ).toBeTruthy();
  expect(
    screen.getByText(/Correction awaiting review: Break was shorter/),
  ).toBeTruthy();
});

it("includes overnight month boundaries and retains records after the original assignment is removed", () => {
  const overnight = {
    ...shift,
    localStart: "2026-10-31T22:00",
    localEnd: "2026-11-01T06:00",
    startsAt: "2026-10-31T21:00:00Z",
    endsAt: "2026-11-01T05:00:00Z",
  };
  expect(
    attendanceRows([overnight], workforce, "2026-11", "Africa/Lagos"),
  ).toHaveLength(1);
  const rows = attendanceRows(
    [],
    { ...workforce, timesheets: [record] },
    "2026-11",
    "Africa/Lagos",
  );
  expect(rows).toHaveLength(1);
  expect(rows[0].shift).toBeNull();
  expect(rows[0].response).toBe("UNKNOWN");
  expect(rows[0].records[0].id).toBe("time");
  expect(
    attendanceRows([shift], workforce, "2026-12", "Africa/Lagos"),
  ).toHaveLength(0);
});

it("respects department scope and filters out rows that do not match the selected status", () => {
  const data = {
    ...workforce,
    permissions: { admin: false, departments: ["Ward B"] },
    timesheets: [record],
  };
  expect(attendanceRows([shift], data, "2026-11", "Africa/Lagos")).toHaveLength(
    0,
  );
  render(<TeamTime {...props} />);
  fireEvent.change(screen.getByLabelText("Attendance status"), {
    target: { value: "APPROVED" },
  });
  expect(
    screen.getByText("No matching assignments or time records"),
  ).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Attendance status"), {
    target: { value: "MISSING" },
  });
  expect(
    screen.getByRole("article", { name: "Taiwo · Morning shift" }),
  ).toBeTruthy();
});

it("prevents self-approval of a submitted time record", () => {
  render(
    <TeamTime
      {...props}
      currentUserId="staff"
      data={{ ...workforce, timesheets: [record] }}
    />,
  );
  expect(
    screen
      .getByRole("button", { name: "Approve recorded time" })
      .hasAttribute("disabled"),
  ).toBe(true);
  expect(
    screen.getByText("Another manager must review your time."),
  ).toBeTruthy();
});

it("retains an earlier acceptance after a replacement search removes the assignee", () => {
  // Regression: Taiwo accepted v4, then opening a replacement removed her in v5.
  const published = { ...shift, publicationVersion: 5, assignments: [] };
  const data = {
    ...workforce,
    assignmentResponses: [
      { ...workforce.assignmentResponses[0], publicationVersion: 4 },
    ],
  };
  render(
    <TeamTime
      {...props}
      schedule={{ ...schedule, published: [published] }}
      data={data}
    />,
  );
  expect(
    screen.getByRole("article", { name: "Taiwo · Morning shift" }),
  ).toBeTruthy();
  expect(
    screen.getByText("Accepted earlier version", { exact: true }),
  ).toBeTruthy();
  expect(
    screen.getByText("Removed from current assignment.", { exact: true }),
  ).toBeTruthy();
  expect(screen.getByText("No time submitted", { exact: true })).toBeTruthy();
  expect(screen.getAllByText("Not recorded", { exact: true })).toHaveLength(2);
  fireEvent.change(screen.getByLabelText("Attendance status"), {
    target: { value: "ACCEPTED" },
  });
  expect(
    screen.getByRole("article", { name: "Taiwo · Morning shift" }),
  ).toBeTruthy();
});

it("does not duplicate time records when a removed assignment has an earlier acceptance", () => {
  const data = { ...workforce, timesheets: [record] };
  const rows = attendanceRows(
    [{ ...shift, publicationVersion: 4, assignments: [] }],
    data,
    "2026-11",
    "Africa/Lagos",
  );
  expect(rows).toHaveLength(1);
  expect(rows[0].historical).toBe(true);
  expect(rows[0].records.map((t) => t.id)).toEqual(["time"]);
});
