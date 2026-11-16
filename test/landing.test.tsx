import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LandingPage } from "../components/LandingPage";

beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
const open = () =>
  render(
    <LandingPage onGetStarted={vi.fn()}>
      <p>Sign-in form</p>
    </LandingPage>,
  );
it("demonstrates publication, acceptance, attendance and approval without a workspace API", () => {
  open();
  expect(
    screen.getByRole("table", { name: "Example weekly staff schedule" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Publish example" }));
  expect(screen.getByText("Response needed", { exact: true })).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Accept example assignment" }),
  );
  expect(screen.getByText("Accepted", { exact: true })).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "View example attendance" }),
  );
  expect(screen.getAllByText("Not recorded", { exact: true })).toHaveLength(2);
  expect(screen.getByText("No time submitted", { exact: true })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Record example time" }));
  expect(screen.getByText("Awaiting review", { exact: true })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Approve example time" }));
  expect(screen.getByText("Approved", { exact: true })).toBeTruthy();
  expect(
    screen.getByText(/7.5 recorded hours approved by the example manager/),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Reset example" }));
  fireEvent.click(screen.getByRole("button", { name: /Follow the hours/ }));
  expect(screen.getByText("No time submitted", { exact: true })).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Accept the example first" }),
  ).toBeTruthy();
});

it("opens workspace creation from its homepage call to action and supports pausing motion", () => {
  const start = vi.fn();
  render(
    <LandingPage onGetStarted={start}>
      <p>Sign-in form</p>
    </LandingPage>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Plan your next week" }));
  expect(start).toHaveBeenCalledOnce();
  expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Pause motion" }));
  expect(
    screen
      .getByRole("button", { name: "Resume motion" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
});
