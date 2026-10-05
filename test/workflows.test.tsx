import React from "react";
import { describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { Calendar } from "../components/Calendar";
import { RequestModal } from "../components/RequestModal";
import { Modal } from "../components/Modal";
import { workspaceToday } from "../services/dates";
import { mergeRequest } from "../services/requests";
import { RequestStatus, RequestType, Role, ShiftRequest } from "../types";
import { analyzeRequestConflict } from "../services/gemini";
vi.mock("../services/gemini", () => ({
  analyzeRequestConflict: vi.fn(),
  generateAdminResponse: vi.fn(),
}));
const request: ShiftRequest = {
  id: "req",
  orgId: "org",
  userId: "nurse",
  userName: "Jake",
  date: "2026-10-06",
  type: RequestType.WORK,
  status: RequestStatus.APPROVED,
  createdAt: 0,
  version: 2,
};
it("dispatch shows date-only coverage and passes clicked request identity", () => {
  const open = vi.fn();
  render(
    <Calendar
      currentDate={new Date(2026, 9, 6)}
      requests={[request]}
      viewMode="DISPATCH"
      timeView="DAY"
      users={[{ id: "nurse", name: "Jake", avatar: "", role: Role.NURSE }]}
      workspaceLabel="Clinic"
      selectedDate={null}
      onDateClick={vi.fn()}
      onMonthChange={vi.fn()}
      onRequestOpen={open}
    />,
  );
  expect(screen.queryByText("8 AM")).toBeNull();
  fireEvent.click(screen.getByText("Work approved — date only"));
  expect(open.mock.calls[0][1]).toEqual(request);
});
it("workspace Today uses organization timezone across a midnight boundary", () => {
  const date = new Date("2026-10-06T01:00:00Z");
  expect(workspaceToday("America/Chicago", date)).toBe("2026-10-05");
  expect(workspaceToday("Asia/Tokyo", date)).toBe("2026-10-06");
});
it("request merging preserves concurrent responses and rejects stale versions", () => {
  let list = mergeRequest([], request);
  list = mergeRequest(list, { ...request, id: "second" });
  expect(list).toHaveLength(2);
  expect(mergeRequest(list, { ...request, version: 1 })).toBe(list);
});
it("failed save keeps the modal and draft, and blocks duplicate submits", async () => {
  let reject: (e: Error) => void;
  const submit = vi.fn(
    () =>
      new Promise<void>((resolve, r) => {
        reject = r;
      }),
  );
  render(
    <RequestModal
      orgId="org"
      date={new Date(2026, 9, 6)}
      aiEnabled={false}
      onClose={vi.fn()}
      onSubmit={submit}
    />,
  );
  fireEvent.change(
    screen.getByPlaceholderText(
      "Add context for operations or staffing coverage...",
    ),
    { target: { value: "Keep this draft" } },
  );
  fireEvent.click(screen.getByText("Submit request"));
  expect((screen.getByText("Saving...") as HTMLButtonElement).disabled).toBe(
    true,
  );
  fireEvent.click(screen.getByText("Saving..."));
  expect(submit).toHaveBeenCalledTimes(1);
  await act(async () => reject!(new Error("Network failed")));
  expect(screen.getByRole("alert").textContent).toBe("Network failed");
  expect(
    (
      screen.getByPlaceholderText(
        "Add context for operations or staffing coverage...",
      ) as HTMLTextAreaElement
    ).value,
  ).toBe("Keep this draft");
});
it("AI callback rerenders do not generate a second charged request", async () => {
  const analyze = vi.mocked(analyzeRequestConflict);
  analyze.mockResolvedValue({
    allowed: true,
    message: "Advisory only",
    available: true,
    aiUsed: 5,
  });
  const usage = vi.fn();
  const props = {
    orgId: "org-unique",
    date: new Date(2026, 9, 6),
    aiEnabled: true,
    onClose: vi.fn(),
    onSubmit: async () => {},
    onAiUsage: usage,
  };
  const { rerender } = render(
    <React.StrictMode>
      <RequestModal {...props} />
    </React.StrictMode>,
  );
  await waitFor(() => expect(screen.getByText("Advisory only")).toBeTruthy());
  expect(analyze).toHaveBeenCalledTimes(1);
  rerender(
    <React.StrictMode>
      <RequestModal {...props} onAiUsage={() => {}} />
    </React.StrictMode>,
  );
  expect(analyze).toHaveBeenCalledTimes(1);
  expect(usage).toHaveBeenCalledWith(5);
});
it("modal Escape closes and restores focus", () => {
  const close = vi.fn();
  const trigger = document.createElement("button");
  document.body.append(trigger);
  trigger.focus();
  const { unmount } = render(
    <Modal label="Test dialog" onClose={close}>
      <button>Inside</button>
    </Modal>,
  );
  expect(document.activeElement?.textContent).toBe("Inside");
  fireEvent.keyDown(document, { key: "Escape" });
  expect(close).toHaveBeenCalledTimes(1);
  unmount();
  expect(document.activeElement).toBe(trigger);
  trigger.remove();
});
