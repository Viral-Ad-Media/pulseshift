import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Dashboard } from "../components/Dashboard";
import { Layout } from "../components/Layout";
import { api } from "../services/api";
import {
  monthlyHours,
  saveScheduleSnapshot,
  clearScheduleSnapshots,
  offlineHTML,
} from "../services/dashboard";
import { WorkforceData } from "../services/workforce";
import {
  Role,
  ScheduleData,
  ScheduledShift,
  Organization,
  User,
} from "../types";
vi.mock("../services/api", async (original) => {
  const actual = await original<typeof import("../services/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn() } };
});
const user: User = {
  id: "staff",
  name: "Jordan Nurse",
  avatar: "",
  role: Role.NURSE,
};
const other: User = {
  id: "other",
  name: "Sam Nurse",
  avatar: "",
  role: Role.NURSE,
};
const shift: ScheduledShift = {
  id: "s",
  title: "Ward care",
  department: "Ward A",
  location: "Main",
  role: "Nurse",
  requiredCount: 2,
  localStart: "2027-01-11T08:00",
  localEnd: "2027-01-11T16:00",
  startsAt: "2027-01-11T08:00Z",
  endsAt: "2027-01-11T16:00Z",
  assignments: [
    { userId: "staff", breakMinutes: 30, breakStartMinutes: 240 },
    { userId: "other", breakMinutes: 0, breakStartMinutes: 0 },
  ],
  requiresAcknowledgement: true,
  publicationVersion: 3,
};
const data: WorkforceData = {
  revision: 1,
  permissions: { admin: false, departments: [] },
  preferences: [],
  credentials: [],
  vacancies: [],
  swaps: [],
  timesheets: [],
  rates: [],
  access: [],
  staffUnits: [],
  exceptions: [],
  sites: [],
  imports: [],
  settings: {
    currency: "USD",
    overtimeThresholdHours: null,
    overtimeMultiplier: null,
    credentialRules: [],
  },
  assignmentResponses: [],
  independentVerificationConfigured: false,
};
const schedule: ScheduleData = {
  revision: 3,
  timezone: "UTC",
  shifts: [shift],
  published: [shift],
  profiles: [],
  templates: [],
  issues: [],
  acknowledgements: [],
};
const props = {
  orgId: "org",
  orgName: "Clinic",
  timezone: "UTC",
  user,
  users: [user, other],
  schedule,
  workforce: data,
  requests: [],
  date: new Date(2027, 0, 11),
  onDateChange: vi.fn(),
  onRefresh: vi.fn(async () => {}),
  onNavigate: vi.fn(),
  onRequest: vi.fn(),
  onManageTeam: vi.fn(),
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockResolvedValue({ notifications: [] });
  vi.mocked(api.post).mockResolvedValue({ revision: 2 });
});
it("monthly planned hours split overnight work at the month boundary and exclude breaks", () => {
  const overnight = {
    ...shift,
    localStart: "2027-01-31T20:00",
    localEnd: "2027-02-01T04:00",
    startsAt: "2027-01-31T20:00Z",
    endsAt: "2027-02-01T04:00Z",
    assignments: [{ userId: "staff", breakMinutes: 30, breakStartMinutes: 60 }],
  };
  const accepted = {
    ...data,
    assignmentResponses: [
      {
        shiftId: "s",
        publicationVersion: 3,
        userId: "staff",
        decision: "ACCEPT",
      },
    ],
  };
  const january = monthlyHours(
    [overnight],
    "staff",
    "2027-01",
    "UTC",
    accepted,
    Date.parse("2027-01-31T22:00Z"),
  );
  const february = monthlyHours(
    [overnight],
    "staff",
    "2027-02",
    "UTC",
    accepted,
  );
  expect(january.planned).toBe(3.5);
  expect(january.confirmed).toBe(3.5);
  expect(january.estimatedToDate).toBe(1.5);
  expect(february.planned).toBe(4);
  expect(january.recorded).toBe(0);
});
it("clock changes use elapsed time and missing attendance stays unknown", () => {
  const dst = {
    ...shift,
    localStart: "2027-03-14T01:00",
    localEnd: "2027-03-14T04:00",
    startsAt: "2027-03-14T06:00Z",
    endsAt: "2027-03-14T08:00Z",
    assignments: [{ userId: "staff", breakMinutes: 0, breakStartMinutes: 0 }],
  };
  const hours = monthlyHours(
    [dst],
    "staff",
    "2027-03",
    "America/New_York",
    null,
  );
  expect(hours.planned).toBe(2);
  expect(hours.recorded).toBeNull();
  expect(hours.confirmed).toBeNull();
});
it("the dashboard displays the team calendar and accepts the exact published assignment", async () => {
  render(<Dashboard {...props} />);
  expect(
    screen.getByRole("heading", { name: "Monthly overview" }),
  ).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "View assignments 2027-01-11" }),
  );
  expect(screen.getByText(/Jordan Nurse, Sam Nurse/)).toBeTruthy();
  fireEvent.click(
    screen.getAllByRole("button", {
      name: "Accept assignment",
    })[0],
  );
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(
      "/orgs/org/workforce",
      expect.objectContaining({
        action: "RESPOND_ASSIGNMENT",
        decision: "ACCEPT",
        publicationVersion: 3,
        scheduleRevision: 3,
      }),
    ),
  );
  expect(props.onRefresh).toHaveBeenCalledTimes(1);
});
it("declining an assignment needs an explicit choice and routes to the real server action", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(false);
  render(<Dashboard {...props} />);
  fireEvent.click(
    screen.getAllByRole("button", { name: "Decline assignment" })[0],
  );
  expect(api.post).not.toHaveBeenCalled();
  vi.mocked(window.confirm).mockReturnValue(true);
  fireEvent.click(
    screen.getAllByRole("button", { name: "Decline assignment" })[0],
  );
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(
      "/orgs/org/workforce",
      expect.objectContaining({ decision: "DECLINE" }),
    ),
  );
  vi.mocked(window.confirm).mockRestore();
});
it("account, team and sign-out actions live in a slide-out panel, not header buttons", () => {
  const onAccount = vi.fn(),
    onTeam = vi.fn(),
    onLogout = vi.fn();
  const organization: Organization = {
    id: "org",
    name: "Clinic",
    slug: "clinic",
    plan: "TEAM",
    timezone: "UTC",
    requestLimit: 120,
    aiCredits: 80,
    aiUsed: 0,
    ownerName: "Owner",
    seats: { used: 2, total: 5 },
    trialStatus: "ACTIVE",
  };
  render(
    <Layout
      currentUser={user}
      currentOrg={organization}
      organizations={[organization]}
      isAdmin={false}
      onAccount={onAccount}
      onManageTeam={onTeam}
      onLogout={onLogout}
      onPanelToggle={vi.fn()}
      onOrgChange={vi.fn()}
      onRefresh={vi.fn()}
      viewMode="DASHBOARD"
      onViewModeChange={vi.fn()}
      timeView="MONTH"
      onTimeViewChange={vi.fn()}
      scope="TEAM"
      onScopeChange={vi.fn()}
      currentDate={new Date()}
      onDateChange={vi.fn()}
      onCreateClick={vi.fn()}
      usageSummary={{
        requestsUsed: 0,
        requestLimit: 120,
        aiUsed: 0,
        aiLimit: 80,
      }}
      workspaceMetrics={{
        teamMembers: 2,
        pendingApprovals: 0,
        scheduledToday: 1,
        upcomingLeave: 0,
      }}
      onUpgradePlan={vi.fn()}
    >
      Dashboard content
    </Layout>,
  );
  expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Open profile for Jordan Nurse" }),
  );
  const panel = screen.getByRole("dialog", { name: "Your workspace account" });
  fireEvent.click(
    within(panel).getByRole("button", { name: "Account & security" }),
  );
  expect(onAccount).toHaveBeenCalledOnce();
  fireEvent.click(
    screen.getByRole("button", { name: "Open profile for Jordan Nurse" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Team & invitations" }));
  expect(onTeam).toHaveBeenCalledOnce();
  fireEvent.click(
    screen.getByRole("button", { name: "Open profile for Jordan Nurse" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
  expect(onLogout).toHaveBeenCalledOnce();
});
it("offline downloads escape content, remain read-only and browser copies clear at sign-out", () => {
  const snapshot = saveScheduleSnapshot(
    "staff",
    "org",
    "Clinic",
    "UTC",
    [{ ...shift, title: "<script>alert(1)</script>" }],
    { staff: "Jordan", other: "Sam" },
  );
  const html = offlineHTML(snapshot);
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;");
  expect(html).toContain("Read-only snapshot");
  expect(localStorage.getItem("pulseshift-offline-last")).toBeTruthy();
  clearScheduleSnapshots();
  expect(localStorage.getItem("pulseshift-offline-last")).toBeNull();
});
