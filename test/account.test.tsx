import React from "react";
import { beforeEach, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkspaceSetup } from "../components/WorkspaceSetup";
import { AccountModal } from "../components/AccountModal";
import App from "../App";
import { api, setAuthToken } from "../services/api";
import { Role } from "../types";
vi.mock("../services/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
  setAuthToken: vi.fn(),
  getSessionVersion: () => 0,
}));
beforeEach(() => vi.resetAllMocks());

it("an authenticated account with no memberships restores into setup after reload", async () => {
  localStorage.setItem("pulseshift_token", "better-auth-session");
  vi.mocked(api.get).mockResolvedValueOnce({
    user: { id: "user", name: "Luqman", email: "user@example.com" },
    orgs: [],
    memberships: [],
    setupRequired: true,
  });
  render(<App />);
  await waitFor(() =>
    expect(screen.getByText("Finish your workspace setup")).toBeTruthy(),
  );
  expect(localStorage.getItem("pulseshift_token")).toBe("better-auth-session");
});
it("failed invitation setup retains the token and displays a retryable error", async () => {
  const submit = vi.fn().mockRejectedValue(new Error("Invitation expired"));
  render(<WorkspaceSetup name="Luqman" onSubmit={submit} onLogout={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Invitation token (optional)"), {
    target: { value: "invite-token" },
  });
  fireEvent.click(screen.getByText("Join workspace"));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toBe("Invitation expired"),
  );
  expect(
    (screen.getByLabelText("Invitation token (optional)") as HTMLInputElement)
      .value,
  ).toBe("invite-token");
  expect(submit.mock.calls[0][0].inviteToken).toBe("invite-token");
});
it("password change stores the rotated Better Auth session token", async () => {
  vi.mocked(api.post).mockResolvedValueOnce({ token: "rotated-session" });
  const changed = vi.fn();
  render(<AccountModal onClose={vi.fn()} onSessionChange={changed} />);
  fireEvent.change(screen.getByLabelText("Current password"), {
    target: { value: "oldpass" },
  });
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: "replacement-password" },
  });
  fireEvent.click(screen.getByText("Change password"));
  await waitFor(() => expect(changed).toHaveBeenCalledWith("rotated-session"));
  expect(setAuthToken).toHaveBeenCalledWith("rotated-session");
  expect(api.post).toHaveBeenCalledWith("/api/auth/change-password", {
    currentPassword: "oldpass",
    newPassword: "replacement-password",
    revokeOtherSessions: true,
  });
});

const organization = {
  id: "org",
  name: "Clinic",
  slug: "clinic",
  plan: "TEAM",
  timezone: "Africa/Lagos",
  requestLimit: 120,
  aiCredits: 80,
  aiUsed: 0,
  ownerName: "Luqman",
  seats: { total: 5, used: 1 },
  trialStatus: "ACTIVE",
};
const workspaceSession = {
  user: { id: "user", name: "Luqman", email: "user@example.com" },
  orgs: [organization],
  memberships: [{ orgId: "org", role: Role.ADMIN }],
};
const schedule = {
  revision: 0,
  timezone: "Africa/Lagos",
  shifts: [],
  published: [],
  profiles: [],
  templates: [],
  issues: [],
  acknowledgements: [],
};
const workspaceResponse = (path: string) => {
  if (path === "/me") return workspaceSession;
  if (path.endsWith("/full"))
    return { org: organization, users: [], requests: [] };
  if (path.endsWith("/schedule")) return schedule;
  if (path.endsWith("/notifications")) return { notifications: [], unread: 0 };
  throw new Error(`Unexpected endpoint: ${path}`);
};

it("missing planner endpoints preserve a signed-in workspace and leave availability accessible", async () => {
  localStorage.setItem("pulseshift_token", "better-auth-session");
  let unavailable = true;
  vi.mocked(api.get).mockImplementation(async (path) => {
    if (path.endsWith("/schedule") && unavailable)
      throw Object.assign(new Error("Cannot GET schedule"), { status: 404 });
    return workspaceResponse(path);
  });
  render(<App />);
  await screen.findByText("You’re signed in");
  expect(screen.queryByText("Finish your workspace setup")).toBeNull();
  expect(screen.queryByText("Unable to load your workspace")).toBeNull();
  expect(localStorage.getItem("pulseshift_token")).toBe("better-auth-session");
  fireEvent.click(screen.getByText("Open availability & leave"));
  await screen.findByText("Clinic — daily availability");
  expect(screen.getByText("Unavailable")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Shift planner" }));
  unavailable = false;
  fireEvent.click(screen.getByText("Retry planner connection"));
  await screen.findByText("A clear plan for every shift");
});

it("sign-in succeeds against an older API without either optional feature endpoint", async () => {
  vi.mocked(api.post).mockResolvedValueOnce({
    ...workspaceSession,
    token: "signed-in-session",
  });
  vi.mocked(api.get).mockImplementation(async (path) => {
    if (path.endsWith("/schedule") || path.endsWith("/notifications"))
      throw Object.assign(new Error("Endpoint missing"), { status: 404 });
    return workspaceResponse(path);
  });
  render(<App />);
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "user@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "existing-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await screen.findByText("You’re signed in");
  expect(localStorage.getItem("pulseshift_token")).toBe("signed-in-session");
  expect(api.post).toHaveBeenCalledWith("/auth/login", {
    email: "user@example.com",
    password: "existing-password",
  });
});

it("a temporary planner error does not lock a user out of their existing workspace", async () => {
  localStorage.setItem("pulseshift_token", "better-auth-session");
  vi.mocked(api.get).mockImplementation(async (path) => {
    if (path.endsWith("/schedule"))
      throw Object.assign(new Error("Service unavailable"), { status: 503 });
    return workspaceResponse(path);
  });
  render(<App />);
  await screen.findByText("You’re signed in");
  fireEvent.click(screen.getByText("Open availability & leave"));
  await screen.findByText("Clinic — daily availability");
});

it("an unauthorized planner response still expires the session", async () => {
  localStorage.setItem("pulseshift_token", "expired-session");
  vi.mocked(api.get).mockImplementation(async (path) => {
    if (path.endsWith("/schedule"))
      throw Object.assign(new Error("Session expired"), { status: 401 });
    return workspaceResponse(path);
  });
  render(<App />);
  await screen.findByRole("button", { name: "Sign in" });
  expect(localStorage.getItem("pulseshift_token")).toBeNull();
});

it("a core workspace failure keeps a retry screen instead of displaying incomplete data", async () => {
  localStorage.setItem("pulseshift_token", "better-auth-session");
  vi.mocked(api.get).mockImplementation(async (path) => {
    if (path.endsWith("/full"))
      throw Object.assign(new Error("Workspace unavailable"), { status: 503 });
    return workspaceResponse(path);
  });
  render(<App />);
  await screen.findByText("Unable to load your workspace");
  expect(screen.queryByText("Finish your workspace setup")).toBeNull();
});

it("a failed invitation does not discard successful login", async () => {
  window.history.replaceState(null, "", "/#invite=expired-invitation");
  vi.mocked(api.post)
    .mockResolvedValueOnce({ ...workspaceSession, token: "signed-in-session" })
    .mockRejectedValueOnce(
      Object.assign(new Error("Invitation expired"), { status: 409 }),
    );
  vi.mocked(api.get).mockImplementation(async (path) =>
    workspaceResponse(path),
  );
  try {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "Already have an account? Sign in" }),
    );
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "existing-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText("Monthly overview");
    expect(localStorage.getItem("pulseshift_token")).toBe("signed-in-session");
    expect(screen.getByText("Signed in. Invitation expired")).toBeTruthy();
  } finally {
    window.history.replaceState(null, "", "/");
  }
});

it("setup completed elsewhere reloads the existing workspace after a conflict", async () => {
  localStorage.setItem("pulseshift_token", "better-auth-session");
  vi.mocked(api.get).mockImplementation(async (path) =>
    workspaceResponse(path),
  );
  vi.mocked(api.get).mockResolvedValueOnce({
    ...workspaceSession,
    orgs: [],
    memberships: [],
  });
  vi.mocked(api.post).mockRejectedValueOnce(
    Object.assign(new Error("Setup already complete"), { status: 409 }),
  );
  render(<App />);
  await screen.findByText("Finish your workspace setup");
  fireEvent.change(screen.getByLabelText("Workspace name"), {
    target: { value: "Clinic" },
  });
  fireEvent.click(screen.getByText("Create workspace"));
  await screen.findByRole("button", { name: "Shift planner" });
  expect(screen.queryByText("Finish your workspace setup")).toBeNull();
});

it("keeps the generated invitation visible after the workspace refresh and copies it", async () => {
  localStorage.setItem("pulseshift_token", "better-auth-session");
  vi.mocked(api.get).mockImplementation(async (path) => {
    if (path.endsWith("/invitations")) return { invitations: [] };
    return workspaceResponse(path);
  });
  vi.mocked(api.post).mockResolvedValueOnce({
    token: "new-invitation-token",
    invitation: { email: "staff@example.com" },
  });
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  render(<App />);
  await screen.findByText("Monthly overview");
  fireEvent.click(
    screen.getByRole("button", { name: "Open profile for Luqman" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Team & invitations" }));
  fireEvent.change(screen.getByLabelText("Invitation email"), {
    target: { value: "staff@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create invitation" }));
  await screen.findByText("Invitation created for staff@example.com");
  await waitFor(() =>
    expect(api.get).toHaveBeenCalledWith("/orgs/org/invitations"),
  );
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: "Create invitation" })
        .hasAttribute("disabled"),
    ).toBe(false),
  );
  const link = (screen.getByLabelText("Invitation link") as HTMLInputElement)
    .value;
  expect(link).toContain("#invite=new-invitation-token");
  expect(
    vi.mocked(api.get).mock.calls.filter(([path]) => path === "/me").length,
  ).toBe(2);
  fireEvent.click(screen.getByRole("button", { name: "Copy invitation link" }));
  await screen.findByRole("button", { name: "Link copied" });
  expect(writeText).toHaveBeenCalledWith(link);
});

const workforceFixture = {
  revision: 0,
  permissions: { admin: true, departments: [] },
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

it("opens management tools as standalone pages and keeps them out of workforce tabs", async () => {
  localStorage.setItem("pulseshift_token", "better-auth-session");
  vi.mocked(api.get).mockImplementation(async (path) =>
    path.endsWith("/workforce") ? workforceFixture : workspaceResponse(path),
  );
  render(<App />);
  await screen.findByText("Monthly overview");
  expect(screen.queryByRole("button", { name: /Create request/ })).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Request leave / availability" }),
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Reports" }));
  await screen.findByRole("heading", { name: "Reports" });
  expect(screen.getByLabelText("From date")).toBeTruthy();
  expect(
    screen.queryByRole("navigation", { name: "Workforce features" }),
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Workforce centre" }));
  await screen.findByRole("heading", { name: "Workforce centre" });
  const tabs = screen.getByRole("navigation", { name: "Workforce features" });
  expect(tabs.textContent).not.toMatch(
    /REPORTS|SETTINGS|AUDIT|IMPORTS|INTEGRATIONS/,
  );
});

it("creates requests only from Approvals and passes the chosen request date into the form", async () => {
  localStorage.setItem("pulseshift_token", "better-auth-session");
  vi.mocked(api.get).mockImplementation(async (path) =>
    workspaceResponse(path),
  );
  vi.mocked(api.post).mockResolvedValue({
    allowed: true,
    available: false,
    message: "",
  });
  render(<App />);
  await screen.findByText("Monthly overview");
  fireEvent.click(screen.getByRole("button", { name: "Approvals" }));
  fireEvent.change(screen.getByLabelText("Request date"), {
    target: { value: "2026-11-25" },
  });
  fireEvent.click(screen.getByRole("button", { name: "+ Create request" }));
  const dialog = await screen.findByRole("dialog");
  expect(dialog.textContent).toContain("November 25");
});
