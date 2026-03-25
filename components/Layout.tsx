import React from 'react';
import { Organization, User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User;
  currentOrg: Organization;
  organizations: Organization[];
  isAdmin: boolean;
  onLogout: () => void;
  onPanelToggle: () => void;
  onOrgChange: (orgId: string) => void;
  onRefresh: () => void;
  viewMode: 'LIST' | 'CALENDAR' | 'DISPATCH';
  onViewModeChange: (mode: 'LIST' | 'CALENDAR' | 'DISPATCH') => void;
  timeView: 'DAY' | 'MONTH';
  onTimeViewChange: (view: 'DAY' | 'MONTH') => void;
  scope: 'MY' | 'TEAM';
  onScopeChange: (scope: 'MY' | 'TEAM') => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onCreateClick: () => void;
  usageSummary: { requestsUsed: number; requestLimit: number; aiUsed: number; aiLimit: number };
  workspaceMetrics: { teamMembers: number; pendingApprovals: number; scheduledToday: number; upcomingLeave: number };
  onUpgradePlan: () => void;
}

const UsagePill: React.FC<{ label: string; used: number; limit: number }> = ({ label, used, limit }) => {
  const hasLimit = limit > 0;
  const percent = hasLimit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const barClass = percent >= 90 ? 'bg-amber-500' : 'bg-sky-500';

  return (
    <div className="min-w-[180px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs shadow-sm">
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-slate-500">
        <span>{label}</span>
        <span className="text-slate-700">{hasLimit ? `${used}/${limit}` : 'Unavailable'}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${barClass}`} style={{ width: `${percent}%` }}></div>
      </div>
      {!hasLimit && <p className="mt-2 text-[11px] text-slate-400">Included on higher plans</p>}
    </div>
  );
};

const MetricTile: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
        <i className={icon}></i>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-lg font-extrabold text-slate-950">{value}</p>
      </div>
    </div>
  </div>
);

export const Layout: React.FC<LayoutProps> = ({
  children,
  currentUser,
  currentOrg,
  organizations,
  isAdmin,
  onLogout,
  onPanelToggle,
  onOrgChange,
  onRefresh,
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
}) => {
  const primaryPanelLabel = isAdmin
    ? viewMode === 'LIST'
      ? 'Back to schedule'
      : 'Approval queue'
    : viewMode === 'LIST'
      ? 'Back to schedule'
      : 'My requests';

  const listTabLabel = isAdmin ? 'Approvals' : 'My Requests';
  const trialLabel = currentOrg.trialStatus === 'ACTIVE' && currentOrg.trialDaysRemaining !== undefined
    ? `${currentOrg.trialDaysRemaining} trial day${currentOrg.trialDaysRemaining === 1 ? '' : 's'} left`
    : currentOrg.trialStatus === 'EXPIRED'
      ? 'Trial expired'
      : `${currentOrg.plan} plan`;

  const shiftDate = (increment: number) => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + increment);
    onDateChange(nextDate);
  };

  return (
    <div className="flex min-h-screen flex-col bg-transparent">
      <header className="sticky top-0 z-30 border-b border-white/60 bg-slate-950/95 text-white backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sky-300">
                <i className="fa-solid fa-heart-pulse text-lg"></i>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl font-extrabold tracking-tight">PulseShift</span>
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-100">
                    {currentOrg.plan}
                  </span>
                  <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-200">
                    {trialLabel}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-300">
                  Staffing workspace for {currentOrg.name} in {currentOrg.timezone}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onRefresh}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                <i className="fa-solid fa-rotate mr-2 text-xs"></i>
                Refresh
              </button>
              <button
                onClick={onPanelToggle}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                <i className="fa-solid fa-list-check mr-2 text-xs"></i>
                {primaryPanelLabel}
              </button>
              <button
                onClick={onUpgradePlan}
                className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400"
              >
                <i className="fa-solid fa-rocket mr-2 text-xs"></i>
                Manage plan
              </button>
              <button
                onClick={onCreateClick}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                <i className="fa-solid fa-plus mr-2 text-xs"></i>
                Create request
              </button>
              <button
                onClick={onLogout}
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Workspace</p>
                <select
                  value={currentOrg.id}
                  onChange={(event) => onOrgChange(event.target.value)}
                  className="mt-1 bg-transparent font-semibold text-white outline-none"
                >
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id} className="text-slate-900">
                      {organization.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Workspace owner</p>
                <p className="mt-1 font-semibold">{currentOrg.ownerName}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Seats</p>
                <p className="mt-1 font-semibold">
                  {currentOrg.seats.used}/{currentOrg.seats.total} assigned
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <img src={currentUser.avatar} alt={currentUser.name} className="h-11 w-11 rounded-2xl border border-white/10 object-cover" />
              <div>
                <p className="text-sm font-semibold text-white">{currentUser.name}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {currentUser.title || currentUser.role}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 px-4 py-4 lg:px-6 lg:py-5">
        <section className="rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'LIST', label: listTabLabel, icon: 'fa-solid fa-list-check' },
                  { id: 'CALENDAR', label: 'Calendar', icon: 'fa-regular fa-calendar' },
                  { id: 'DISPATCH', label: 'Dispatch', icon: 'fa-solid fa-timeline' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onViewModeChange(item.id as 'LIST' | 'CALENDAR' | 'DISPATCH')}
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      viewMode === item.id
                        ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10'
                        : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    <i className={`${item.icon} mr-2 text-xs`}></i>
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-2xl bg-slate-100 p-1 text-xs font-semibold text-slate-500">
                  <button
                    onClick={() => onScopeChange('MY')}
                    className={`rounded-2xl px-4 py-2 transition ${scope === 'MY' ? 'bg-white text-slate-950 shadow-sm' : ''}`}
                  >
                    My
                  </button>
                  <button
                    onClick={() => onScopeChange('TEAM')}
                    className={`rounded-2xl px-4 py-2 transition ${scope === 'TEAM' ? 'bg-white text-slate-950 shadow-sm' : ''}`}
                  >
                    Team
                  </button>
                </div>

                {viewMode !== 'LIST' && (
                  <div className="flex rounded-2xl bg-slate-100 p-1 text-xs font-semibold text-slate-500">
                    {[
                      { id: 'DAY', label: 'Day' },
                      { id: 'MONTH', label: 'Month' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onTimeViewChange(item.id as 'DAY' | 'MONTH')}
                        className={`rounded-2xl px-4 py-2 transition ${
                          timeView === item.id ? 'bg-white text-slate-950 shadow-sm' : ''
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                <MetricTile icon="fa-solid fa-user-group" label="Staff" value={`${workspaceMetrics.teamMembers}`} />
                <MetricTile
                  icon="fa-solid fa-clock-rotate-left"
                  label="Pending"
                  value={`${workspaceMetrics.pendingApprovals}`}
                />
                <MetricTile
                  icon="fa-solid fa-briefcase-medical"
                  label="Scheduled Today"
                  value={`${workspaceMetrics.scheduledToday}`}
                />
                <MetricTile
                  icon="fa-solid fa-bed-pulse"
                  label="Upcoming Leave"
                  value={`${workspaceMetrics.upcomingLeave}`}
                />
              </div>

              <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Schedule date</p>
                    <p className="mt-1 text-lg font-extrabold text-slate-950">
                      {currentDate.toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => onDateChange(new Date())}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Today
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-2 py-2">
                  <button
                    onClick={() => shiftDate(-1)}
                    className="rounded-2xl px-4 py-3 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                  >
                    <i className="fa-solid fa-chevron-left text-xs"></i>
                  </button>
                  <span className="text-sm font-semibold text-slate-700">Move through the schedule</span>
                  <button
                    onClick={() => shiftDate(1)}
                    className="rounded-2xl px-4 py-3 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                  >
                    <i className="fa-solid fa-chevron-right text-xs"></i>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col gap-3 md:flex-row">
                <UsagePill label="Requests" used={usageSummary.requestsUsed} limit={usageSummary.requestLimit} />
                <UsagePill label="AI Credits" used={usageSummary.aiUsed} limit={usageSummary.aiLimit} />
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                PulseShift tracks plan usage per workspace, so seats, request volume, and AI automation stay scoped to
                the active organization.
              </div>
            </div>
          </div>
        </section>

        <main className="relative min-h-[520px] flex-1 overflow-hidden rounded-[32px] border border-white/70 bg-white/75 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          {children}
        </main>
      </div>
    </div>
  );
};
