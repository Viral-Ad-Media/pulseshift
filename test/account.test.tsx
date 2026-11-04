import React from "react";
import { it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkspaceSetup } from "../components/WorkspaceSetup";
import { AccountModal } from "../components/AccountModal";
import App from "../App";
import { api, setAuthToken } from "../services/api";
vi.mock("../services/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
  setAuthToken: vi.fn(),
  getSessionVersion: () => 0,
}));
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
