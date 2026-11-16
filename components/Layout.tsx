import React, { useState, useEffect, useRef } from "react";
import { Organization, User, ViewMode, TimeView } from "../types";
import { Modal } from "./Modal";
import { PulseMark, NavIcon } from "./PulseBrand";
import { formatDateKey } from "../services/dates";
import { workspaceToday, dateFromKey } from "../services/dates";
interface LayoutProps {
  children: React.ReactNode;
  currentUser: User;
  currentOrg: Organization;
  organizations: Organization[];
  isAdmin: boolean;
  canReviewWorkforce?: boolean;
  onLogout: () => void;
  onManageTeam: () => void;
  onAccount: () => void;
  onPanelToggle: () => void;
  onOrgChange: (id: string) => void;
  onRefresh: () => void;
  notificationCount?: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  timeView: TimeView;
  onTimeViewChange: (view: TimeView) => void;
  scope: "MY" | "TEAM";
  onScopeChange: (scope: "MY" | "TEAM") => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onCreateClick: () => void;
  usageSummary: {
    requestsUsed: number;
    requestLimit: number;
    aiUsed: number;
    aiLimit: number;
  };
  workspaceMetrics: {
    teamMembers: number;
    pendingApprovals: number;
    scheduledToday: number | null;
    upcomingLeave: number;
  };
  onUpgradePlan: () => void;
}
export function Layout({
  children,
  currentUser,
  currentOrg,
  organizations,
  isAdmin,
  canReviewWorkforce = isAdmin,
  onLogout,
  onManageTeam,
  onAccount,
  onOrgChange,
  onRefresh,
  notificationCount = 0,
  viewMode,
  onViewModeChange,
  timeView,
  onTimeViewChange,
  scope,
  onScopeChange,
  currentDate,
  onDateChange,
  onCreateClick,
  usageSummary,
  workspaceMetrics,
  onUpgradePlan,
}: LayoutProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () =>
      Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),select,a[href]",
        ) || [],
      );
    focusables()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileNavOpen(false);
      }
      if (event.key === "Tab") {
        const nodes = focusables(),
          first = nodes[0],
          last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [mobileNavOpen]);
  const nav: Array<{ id: ViewMode; label: string }> = [
    { id: "DASHBOARD", label: "Dashboard" },
    { id: "SCHEDULE", label: "Shift planner" },
    {
      id: "ACTIVITY",
      label: `Inbox & history${notificationCount ? ` (${notificationCount})` : ""}`,
    },
    { id: "LIST", label: "Approvals" },
    { id: "DISPATCH", label: "Availability" },
    { id: "WORKFORCE", label: "Workforce centre" },
  ];
  const move = (direction: number) => {
    const next = new Date(currentDate);
    if (timeView === "MONTH") next.setMonth(next.getMonth() + direction, 1);
    else
      next.setDate(next.getDate() + direction * (timeView === "WEEK" ? 7 : 1));
    onDateChange(next);
  };
  const management: Array<{ id: ViewMode; label: string }> = [
    ...(canReviewWorkforce
      ? [
          { id: "REPORTS" as const, label: "Reports" },
          { id: "AUDIT" as const, label: "Audit history" },
        ]
      : []),
    ...(isAdmin
      ? [
          { id: "IMPORTS" as const, label: "Imports" },
          { id: "INTEGRATIONS" as const, label: "Integrations" },
          { id: "SETTINGS" as const, label: "Settings" },
        ]
      : []),
  ];
  const title =
    [...nav, ...management].find((item) => item.id === viewMode)?.label ||
    "Your workspace";
  const navigate = (mode: ViewMode) => {
    onViewModeChange(mode);
    setMobileNavOpen(false);
  };
  const navButton = (item: { id: ViewMode; label: string }) => (
    <button
      key={item.id}
      aria-current={viewMode === item.id ? "page" : undefined}
      className={`sidebar-link ${viewMode === item.id ? "is-active" : ""}`}
      onClick={() => navigate(item.id)}
    >
      <NavIcon name={item.id} />
      <span>{item.id === "ACTIVITY" ? "Inbox & history" : item.label}</span>
      {item.id === "ACTIVITY" && notificationCount > 0 ? (
        <span className="nav-count">{notificationCount}</span>
      ) : null}
      {viewMode === item.id ? <span className="active-dot" /> : null}
    </button>
  );
  return (
    <div className="workspace-app">
      <a className="skip-link" href="#workspace-content">
        Skip to content
      </a>
      <div
        className="workspace-shell"
        aria-hidden={profileOpen || help ? true : undefined}
        inert={profileOpen || help ? true : undefined}
      >
        {mobileNavOpen && (
          <button
            className="sidebar-backdrop"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
          />
        )}
        <aside
          ref={sidebarRef}
          role={mobileNavOpen ? "dialog" : undefined}
          aria-modal={mobileNavOpen ? true : undefined}
          id="workspace-navigation"
          className={`workspace-sidebar ${mobileNavOpen ? "is-open" : ""}`}
          aria-label="Workspace sidebar"
        >
          <div className="sidebar-brand-row">
            <button
              className="brand-lockup"
              onClick={() => navigate("DASHBOARD")}
              aria-label="PulseShift dashboard"
            >
              <PulseMark />
              <span>
                PulseShift<span className="brand-dot">.</span>
              </span>
            </button>
            <button
              className="mobile-close"
              aria-label="Close sidebar"
              onClick={() => setMobileNavOpen(false)}
            >
              ✕
            </button>
          </div>
          <label className="sidebar-workspace">
            <span>WORKSPACE</span>
            <select
              aria-label="Active workspace"
              value={currentOrg.id}
              onChange={(e) => {
                onOrgChange(e.target.value);
                setMobileNavOpen(false);
              }}
            >
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <span className="workspace-caption">
              <span className="status-dot" />{" "}
              {isAdmin ? "Workspace administrator" : "Team member"}
            </span>
          </label>
          <nav aria-label="Main navigation">
            <p className="nav-section-label">YOUR WORKSPACE</p>
            {nav.map(navButton)}
            <button
              className="sidebar-link"
              onClick={() => {
                setMobileNavOpen(false);
                onManageTeam();
              }}
            >
              <NavIcon name="TEAM" />
              <span>Team & invitations</span>
            </button>
            {management.length > 0 && (
              <>
                <p className="nav-section-label management-label">MANAGEMENT</p>
                {management.map(navButton)}
              </>
            )}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-plan">
              <span className="plan-badge">{currentOrg.plan}</span>
              <p>
                {currentOrg.seats.used} of {currentOrg.seats.total} seats in use
              </p>
              <button onClick={onUpgradePlan}>
                Manage workspace plan <span aria-hidden="true">↗</span>
              </button>
            </div>
            <button
              className="sidebar-link help-link"
              onClick={() => {
                setHelp(true);
                setMobileNavOpen(false);
              }}
            >
              <NavIcon name="HELP" />
              <span>Help & getting started</span>
            </button>
            <span className="sidebar-footnote">
              Made for the people who care.
            </span>
          </div>
        </aside>
        <div className="workspace-body">
          <header className="workspace-topbar">
            <div className="topbar-location">
              <button
                className="mobile-menu icon-button"
                aria-label="Open navigation"
                aria-expanded={mobileNavOpen}
                aria-controls="workspace-navigation"
                onClick={() => setMobileNavOpen((v) => !v)}
              >
                <NavIcon name="MENU" />
              </button>
              <span className="topbar-workspace-name">
                {currentOrg.name}
                <span aria-hidden="true"> / </span>
              </span>
              <span className="topbar-page">{title}</span>
            </div>
            <div className="topbar-actions">
              <span className="timezone-label">{currentOrg.timezone}</span>
              <button
                className="icon-button"
                aria-label="Refresh workspace"
                title="Refresh workspace"
                onClick={onRefresh}
              >
                <NavIcon name="REFRESH" />
              </button>
              <span className="topbar-divider" />
              <button
                aria-label={`Open profile for ${currentUser.name}`}
                aria-expanded={profileOpen}
                className="profile-trigger"
                onClick={() => setProfileOpen(true)}
              >
                <span className="profile-avatar">
                  {currentUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span className="profile-copy">
                  <strong>{currentUser.name}</strong>
                  <small>
                    {currentUser.title ||
                      (isAdmin ? "Administrator" : "Team member")}
                  </small>
                </span>
                <span className="profile-open-icon" aria-hidden="true">
                  ↗
                </span>
              </button>
            </div>
          </header>
          <div className="workspace-page">
            {viewMode === "LIST" && (
              <section className="request-page-heading">
                <div>
                  <span className="eyebrow">TIME OFF & AVAILABILITY</span>
                  <h1>Approvals</h1>
                  <p>
                    {isAdmin
                      ? "Review your team’s requests and submit your own time off."
                      : "Request time off, share availability, and follow each decision."}
                  </p>
                </div>
                <div className="request-create-controls">
                  <label>
                    Request date
                    <input
                      aria-label="Request date"
                      type="date"
                      value={formatDateKey(currentDate)}
                      onChange={(e) => {
                        if (e.target.value)
                          onDateChange(dateFromKey(e.target.value));
                      }}
                    />
                  </label>
                  <button className="brand-button" onClick={onCreateClick}>
                    + Create request
                  </button>
                </div>
              </section>
            )}
            {viewMode !== "DASHBOARD" && (
              <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4">
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
                  <span>
                    <strong className="text-lg text-slate-900">
                      {workspaceMetrics.teamMembers}
                    </strong>{" "}
                    staff
                  </span>
                  <span>
                    <strong className="text-lg text-slate-900">
                      {workspaceMetrics.pendingApprovals}
                    </strong>{" "}
                    pending requests
                  </span>
                  <span>
                    <strong className="text-lg text-slate-900">
                      {workspaceMetrics.scheduledToday === null
                        ? "Unavailable"
                        : workspaceMetrics.scheduledToday}
                    </strong>{" "}
                    assigned today
                  </span>
                  <span>
                    <strong className="text-lg text-slate-900">
                      {workspaceMetrics.upcomingLeave}
                    </strong>{" "}
                    upcoming leave
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {currentOrg.timezone}
                </span>
              </section>
            )}
            {["SCHEDULE", "DISPATCH", "CALENDAR"].includes(viewMode) && (
              <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-3">
                <div className="flex items-center gap-3">
                  <button
                    aria-label="Previous schedule period"
                    className="rounded-xl border px-3 py-2"
                    onClick={() => move(-1)}
                  >
                    ←
                  </button>
                  <span className="text-sm font-semibold">
                    {currentDate.toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <button
                    aria-label="Next schedule period"
                    className="rounded-xl border px-3 py-2"
                    onClick={() => move(1)}
                  >
                    →
                  </button>
                  <button
                    className="rounded-xl border px-3 py-2 text-sm"
                    onClick={() =>
                      onDateChange(
                        dateFromKey(workspaceToday(currentOrg.timezone)),
                      )
                    }
                  >
                    Today
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex rounded-xl bg-slate-100 p-1">
                    {(["MY", "TEAM"] as const).map((s) => (
                      <button
                        key={s}
                        aria-pressed={scope === s}
                        className={`rounded-lg px-3 py-2 text-xs font-bold ${scope === s ? "bg-white shadow-sm" : ""}`}
                        onClick={() => onScopeChange(s)}
                      >
                        {s === "MY" ? "My" : "Team"}
                      </button>
                    ))}
                  </div>
                  <div className="flex rounded-xl bg-slate-100 p-1">
                    {(
                      [
                        "DAY",
                        ...(viewMode === "SCHEDULE" ? ["WEEK"] : []),
                        "MONTH",
                      ] as TimeView[]
                    ).map((v) => (
                      <button
                        key={v}
                        aria-pressed={timeView === v}
                        className={`rounded-lg px-3 py-2 text-xs font-bold ${timeView === v ? "bg-white shadow-sm" : ""}`}
                        onClick={() => onTimeViewChange(v)}
                      >
                        {v[0] + v.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}
            <main
              id="workspace-content"
              tabIndex={-1}
              className="workspace-main relative min-h-[520px]"
            >
              {children}
            </main>
            <footer className="flex flex-wrap justify-between gap-3 px-1 text-xs text-slate-400">
              <span>PulseShift · {currentOrg.name}</span>
              <button
                className="font-semibold hover:text-slate-700"
                onClick={() => setHelp(true)}
              >
                How to use PulseShift
              </button>
            </footer>
          </div>
        </div>
      </div>
      {profileOpen && (
        <Modal
          label="Your workspace account"
          variant="drawer"
          onClose={() => setProfileOpen(false)}
        >
          <aside className="min-h-screen space-y-6 bg-white p-6 text-slate-900">
            <div className="flex justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
                Your workspace
              </p>
              <button
                aria-label="Close account panel"
                className="rounded-xl border px-3 py-2"
                onClick={() => setProfileOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-xl font-bold text-sky-800">
                {currentUser.name[0]}
              </div>
              <h2 className="mt-4 text-2xl font-extrabold">
                {currentUser.name}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {currentUser.title || currentUser.role}
              </p>
              <p className="mt-3 text-sm font-semibold">{currentOrg.name}</p>
            </div>
            <label className="block text-sm font-semibold">
              Active workspace
              <select
                aria-label="Switch workspace from account panel"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3"
                value={currentOrg.id}
                onChange={(e) => {
                  setProfileOpen(false);
                  onOrgChange(e.target.value);
                }}
              >
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-3">
              {[
                [
                  "Account & security",
                  () => {
                    setProfileOpen(false);
                    onAccount();
                  },
                ],
                [
                  "Team & invitations",
                  () => {
                    setProfileOpen(false);
                    onManageTeam();
                  },
                ],
                [
                  "Plan & workspace usage",
                  () => {
                    setProfileOpen(false);
                    onUpgradePlan();
                  },
                ],
                [
                  "How to use PulseShift",
                  () => {
                    setProfileOpen(false);
                    setHelp(true);
                  },
                ],
              ].map(([label, action]) => (
                <button
                  key={String(label)}
                  className="flex w-full items-center justify-between rounded-2xl border p-4 text-left text-sm font-semibold hover:bg-slate-50"
                  onClick={action as () => void}
                >
                  {String(label)}
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </div>
            <div className="rounded-2xl border p-4 text-xs leading-7 text-slate-500">
              <p>
                Plan: <strong>{currentOrg.plan}</strong>
                {currentOrg.trialStatus === "ACTIVE"
                  ? ` · ${currentOrg.trialDaysRemaining} trial days left`
                  : ""}
              </p>
              <p>
                Seats: {currentOrg.seats.used}/{currentOrg.seats.total}
              </p>
              <p>
                Active requests: {usageSummary.requestsUsed}/
                {usageSummary.requestLimit}
              </p>
              <p>
                AI credits used: {usageSummary.aiUsed}/{usageSummary.aiLimit}
              </p>
            </div>
            <button
              className="w-full rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left text-sm font-bold text-rose-700"
              onClick={() => {
                setProfileOpen(false);
                onLogout();
              }}
            >
              Sign out
            </button>
          </aside>
        </Modal>
      )}
      {help && (
        <Modal label="How to use PulseShift" onClose={() => setHelp(false)}>
          <section className="mx-auto max-w-2xl space-y-5 rounded-3xl bg-white p-6">
            <h2 className="text-2xl font-bold">How to use PulseShift</h2>
            <ol className="list-decimal space-y-4 pl-5 text-sm leading-6">
              <li>
                <strong>Dashboard:</strong> browse the month, select a day, and
                switch between your assignments and the whole team. Planned and
                estimated hours are separate from clock-in records.
              </li>
              <li>
                <strong>Request leave:</strong> open Approvals, choose a date
                and Create request, select PTO or Sick, enter a note, and
                submit. Managers decide requests in Approvals.
              </li>
              <li>
                <strong>Accept work:</strong> open your assignment on the
                Dashboard and select Accept assignment. Decline opens a
                replacement vacancy and alerts managers.
              </li>
              <li>
                <strong>Plan shifts:</strong> administrators set eligible roles,
                create draft shifts in Shift planner, assign staff, review
                conflicts, and publish. Drafts remain private.
              </li>
              <li>
                <strong>Record actual time:</strong> open Workforce centre → My
                work. Clock in, start/end breaks, and clock out. Another manager
                reviews your recorded time.
              </li>
              <li>
                <strong>Workforce tools:</strong> use Open shifts for
                replacement invitations, Swaps for colleague trades, and
                Credentials for expiry records. Managers have reports and time
                approvals.
              </li>
              <li>
                <strong>Your profile:</strong> click your name in the header for
                Account, Team, Plan, and Sign out.
              </li>
            </ol>
            <p className="text-xs text-slate-500">
              The local test database is separate from your hosted account.
              Billing and recovery emails need configured providers.
            </p>
            <button
              className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"
              onClick={() => setHelp(false)}
            >
              Got it
            </button>
          </section>
        </Modal>
      )}
    </div>
  );
}
