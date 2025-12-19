import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from './components/Layout';
import { Calendar } from './components/Calendar';
import { RequestModal } from './components/RequestModal';
import { AdminPanel } from './components/AdminPanel';
import { MyShifts } from './components/MyShifts';
import { User, Role, ShiftRequest, RequestType, RequestStatus, Organization, SessionState } from './types';

const STORAGE_KEY = 'pulseshift_saas_v1';

const formatDateKey = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const ORGANIZATIONS: Organization[] = [
  {
    id: 'org-summit',
    name: 'Summit Health Network',
    slug: 'summit-health',
    industry: 'Hospitals',
    plan: 'TEAM',
    timezone: 'America/New_York',
    requestLimit: 120,
    aiCredits: 80,
    aiUsed: 12,
    ownerName: 'Bruce Parks',
    seats: { total: 12, used: 9 },
  },
  {
    id: 'org-lumen',
    name: 'Lumen Home Care',
    slug: 'lumen-home',
    industry: 'Home Health',
    plan: 'ESSENTIALS',
    timezone: 'America/Chicago',
    requestLimit: 40,
    aiCredits: 10,
    aiUsed: 3,
    ownerName: 'Carla Gomez',
    seats: { total: 8, used: 5 },
    trialEndsOn: '2025-03-12',
  },
];

const USERS: User[] = [
  { id: 'u1', name: 'Jake Avery', title: 'Field RN', role: Role.NURSE, orgId: 'org-summit', avatar: 'https://i.pravatar.cc/150?u=u1' },
  { id: 'u2', name: 'Sergio Good', title: 'Infusion RN', role: Role.NURSE, orgId: 'org-summit', avatar: 'https://i.pravatar.cc/150?u=u2' },
  { id: 'u3', name: "Luke O'Conner", title: 'Charge RN', role: Role.NURSE, orgId: 'org-summit', avatar: 'https://i.pravatar.cc/150?u=u3' },
  { id: 'u4', name: 'Erick Perez', title: 'PRN', role: Role.NURSE, orgId: 'org-summit', avatar: 'https://i.pravatar.cc/150?u=u4' },
  { id: 'a1', name: 'Bruce Parks', title: 'Director', role: Role.ADMIN, orgId: 'org-summit', avatar: 'https://i.pravatar.cc/150?u=a1' },
  { id: 'u5', name: 'Devon Isaacs', title: 'RN Case Manager', role: Role.NURSE, orgId: 'org-lumen', avatar: 'https://i.pravatar.cc/150?u=u5' },
  { id: 'u6', name: 'Maya Cho', title: 'Scheduler', role: Role.NURSE, orgId: 'org-lumen', avatar: 'https://i.pravatar.cc/150?u=u6' },
  { id: 'a2', name: 'Carla Gomez', title: 'Clinical Ops', role: Role.ADMIN, orgId: 'org-lumen', avatar: 'https://i.pravatar.cc/150?u=a2' },
];

const DEFAULT_REQUESTS: Record<string, ShiftRequest[]> = (() => {
  const today = new Date();
  const tomorrow = new Date();
  const nextWeek = new Date();
  tomorrow.setDate(today.getDate() + 1);
  nextWeek.setDate(today.getDate() + 7);

  const todayStr = formatDateKey(today);
  const tomorrowStr = formatDateKey(tomorrow);
  const nextWeekStr = formatDateKey(nextWeek);

  return {
    'org-summit': [
      { id: 'req-1', orgId: 'org-summit', userId: 'u1', userName: 'Jake Avery', date: todayStr, type: RequestType.WORK, status: RequestStatus.APPROVED, createdAt: Date.now(), notes: 'OR coverage' },
      { id: 'req-2', orgId: 'org-summit', userId: 'u2', userName: 'Sergio Good', date: todayStr, type: RequestType.WORK, status: RequestStatus.APPROVED, createdAt: Date.now() - 1000, notes: 'Cath lab follow-up' },
      { id: 'req-3', orgId: 'org-summit', userId: 'u3', userName: "Luke O'Conner", date: todayStr, type: RequestType.WORK, status: RequestStatus.APPROVED, createdAt: Date.now() - 2000, notes: 'Half day' },
      { id: 'req-4', orgId: 'org-summit', userId: 'u4', userName: 'Erick Perez', date: tomorrowStr, type: RequestType.PTO, status: RequestStatus.APPROVED, createdAt: Date.now() - 3000 },
      { id: 'req-5', orgId: 'org-summit', userId: 'u1', userName: 'Jake Avery', date: nextWeekStr, type: RequestType.SICK, status: RequestStatus.PENDING, createdAt: Date.now() - 4000, notes: 'Pre-op appointment' },
    ],
    'org-lumen': [
      { id: 'req-6', orgId: 'org-lumen', userId: 'u5', userName: 'Devon Isaacs', date: tomorrowStr, type: RequestType.WORK, status: RequestStatus.APPROVED, createdAt: Date.now() - 5000 },
      { id: 'req-7', orgId: 'org-lumen', userId: 'u6', userName: 'Maya Cho', date: nextWeekStr, type: RequestType.PTO, status: RequestStatus.PENDING, createdAt: Date.now() - 6000, notes: 'Family event' },
      { id: 'req-8', orgId: 'org-lumen', userId: 'u5', userName: 'Devon Isaacs', date: todayStr, type: RequestType.SICK, status: RequestStatus.REJECTED, createdAt: Date.now() - 7000, notes: 'Sick day request exceeded cap' },
    ],
  };
})();

const buildDefaultSession = (): SessionState => {
  const defaultOrgId = ORGANIZATIONS[0].id;
  const defaultUser = USERS.find(u => u.orgId === defaultOrgId && u.role === Role.NURSE) || USERS.find(u => u.orgId === defaultOrgId) || USERS[0];
  return { orgId: defaultOrgId, userId: defaultUser.id };
};

const App: React.FC = () => {
  const [session, setSession] = useState<SessionState>(buildDefaultSession);
  const [organizations, setOrganizations] = useState<Organization[]>(ORGANIZATIONS);
  const [requestsByOrg, setRequestsByOrg] = useState<Record<string, ShiftRequest[]>>(DEFAULT_REQUESTS);

  // Navigation State
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR' | 'DISPATCH' | 'MAP'>('DISPATCH');
  const [timeView, setTimeView] = useState<'DAY' | 'WEEK' | 'MONTH' | 'INDIVIDUAL'>('DAY');
  const [scope, setScope] = useState<'MY' | 'TEAM'>('TEAM');
  const [currentDate, setCurrentDate] = useState(new Date());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingRequest, setEditingRequest] = useState<ShiftRequest | undefined>(undefined);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.session) setSession(parsed.session);
        if (parsed.requestsByOrg) setRequestsByOrg(parsed.requestsByOrg);
        if (parsed.organizations) setOrganizations(parsed.organizations);
      } catch (error) {
        console.warn('Unable to restore saved session', error);
      }
    } else {
      const legacy = localStorage.getItem('pulseShift_requests');
      if (legacy) {
        try {
          const parsedLegacy = JSON.parse(legacy);
          setRequestsByOrg(prev => ({ ...prev, [buildDefaultSession().orgId]: parsedLegacy }));
        } catch (error) {
          console.warn('Unable to migrate legacy requests', error);
        }
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ session, organizations, requestsByOrg }));
  }, [session, organizations, requestsByOrg]);

  const currentOrg = useMemo<Organization>(
    () => organizations.find(org => org.id === session.orgId) || organizations[0] || ORGANIZATIONS[0],
    [organizations, session.orgId]
  );
  const orgUsers = useMemo<User[]>(() => USERS.filter(u => u.orgId === currentOrg.id), [currentOrg]);
  const currentUser = useMemo<User>(
    () => orgUsers.find(u => u.id === session.userId) || orgUsers[0] || USERS[0],
    [orgUsers, session.userId]
  );

  const currentRequests = requestsByOrg[currentOrg.id] || [];
  const apiKey = (process.env.API_KEY || process.env.GEMINI_API_KEY || '').trim();
  const aiQuotaRemaining = Math.max(currentOrg.aiCredits - currentOrg.aiUsed, 0);
  const planSupportsAi = currentOrg.plan !== 'ESSENTIALS';
  const aiEnabled = planSupportsAi && Boolean(apiKey) && aiQuotaRemaining > 0;
  const aiDisabledReason = !planSupportsAi
    ? 'AI conflict checks are available on Team plans and above.'
    : !apiKey
      ? 'Add GEMINI_API_KEY to .env.local to enable AI checks.'
      : 'You have used all AI credits for this workspace.';

  const handleOrgChange = (orgId: string) => {
    const targetOrg = organizations.find(o => o.id === orgId);
    if (!targetOrg) return;
    const candidates = USERS.filter(u => u.orgId === orgId);
    if (candidates.length === 0) return;
    const preferred = candidates.find(u => u.role === currentUser.role) || candidates[0];
    setSession({ orgId, userId: preferred.id });
    setScope('TEAM');
    setSelectedDate(null);
    setEditingRequest(undefined);
  };

  const switchRole = () => {
    const next =
      currentUser.role === Role.NURSE
        ? orgUsers.find(u => u.role === Role.ADMIN)
        : orgUsers.find(u => u.role === Role.NURSE);
    if (next) {
      setSession(prev => ({ ...prev, userId: next.id }));
    }
  };

  const updateRequestsForCurrentOrg = (updater: (requests: ShiftRequest[]) => ShiftRequest[]) => {
    setRequestsByOrg(prev => ({
      ...prev,
      [currentOrg.id]: updater(prev[currentOrg.id] ?? []),
    }));
  };

  const handleOpenRequestModal = (date: Date) => {
    setSelectedDate(date);
    const dateStr = formatDateKey(date);
    const existing = currentRequests.find(r => r.userId === currentUser.id && r.date === dateStr);
    setEditingRequest(existing);
    setIsModalOpen(true);
  };

  const handleMonthChange = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
  };

  const handleSubmitRequest = (type: RequestType, notes: string) => {
    if (!selectedDate) return;
    const requestLimitReached = !editingRequest && currentRequests.length >= currentOrg.requestLimit;
    if (requestLimitReached) {
      alert('You have reached this workspace request limit. Upgrade to add more.');
      return;
    }

    if (editingRequest) {
      updateRequestsForCurrentOrg(prev =>
        prev.map(r => (r.id === editingRequest.id ? { ...r, type, notes } : r))
      );
    } else {
      const newRequest: ShiftRequest = {
        id: Math.random().toString(36).slice(2, 10),
        orgId: currentOrg.id,
        userId: currentUser.id,
        userName: currentUser.name,
        date: formatDateKey(selectedDate),
        type,
        status: RequestStatus.PENDING,
        notes,
        createdAt: Date.now(),
      };
      updateRequestsForCurrentOrg(prev => [...prev, newRequest]);
    }

    setIsModalOpen(false);
    setEditingRequest(undefined);
  };

  const handleDeleteRequest = () => {
    if (!editingRequest) return;
    updateRequestsForCurrentOrg(prev => prev.filter(r => r.id !== editingRequest.id));
    setIsModalOpen(false);
    setEditingRequest(undefined);
  };

  const handleAiUsage = () => {
    setOrganizations(prev =>
      prev.map(org =>
        org.id === currentOrg.id ? { ...org, aiUsed: Math.min(org.aiCredits, org.aiUsed + 1) } : org
      )
    );
  };

  // Filter requests based on Scope (My vs Team)
  const visibleRequests = scope === 'MY'
    ? currentRequests.filter(r => r.userId === currentUser.id)
    : currentRequests;

  const visibleUsers = scope === 'MY'
    ? orgUsers.filter(u => u.id === currentUser.id)
    : orgUsers;

  return (
    <Layout
      currentUser={currentUser}
      currentOrg={currentOrg}
      organizations={organizations}
      onOrgChange={handleOrgChange}
      onLogout={() => {}}
      onSwitchRole={switchRole}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      timeView={timeView}
      onTimeViewChange={setTimeView}
      scope={scope}
      onScopeChange={setScope}
      currentDate={currentDate}
      onDateChange={setCurrentDate}
      onCreateClick={() => handleOpenRequestModal(currentDate)}
      usageSummary={{
        requestsUsed: currentRequests.length,
        requestLimit: currentOrg.requestLimit,
        aiUsed: currentOrg.aiUsed,
        aiLimit: currentOrg.aiCredits,
      }}
      onUpgradePlan={() => alert('Upgrade flow coming soon.')}
    >

      {/* Admin view uses approval queue, otherwise nurse view or calendar */}
      {currentUser.role === Role.ADMIN && viewMode === 'LIST' ? (
        <div className="p-8">
          <AdminPanel
            requests={currentRequests}
            onUpdateRequest={(id, status, response) => {
              updateRequestsForCurrentOrg(prev =>
                prev.map(r => (r.id === id ? { ...r, status, adminResponse: response } : r))
              );
            }}
          />
        </div>
      ) : viewMode === 'LIST' ? (
        <div className="p-8">
          <MyShifts
            requests={currentRequests.filter(r => r.userId === currentUser.id)}
            onEdit={(req) => {
              const [y, m, d] = req.date.split('-').map(Number);
              handleOpenRequestModal(new Date(y, m - 1, d));
            }}
            onCancel={(id) => updateRequestsForCurrentOrg(prev => prev.filter(r => r.id !== id))}
          />
        </div>
      ) : (
        <Calendar
          currentDate={currentDate}
          requests={visibleRequests}
          viewMode={viewMode}
          timeView={timeView}
          users={visibleUsers}
          selectedDate={selectedDate}
          onDateClick={(d) => setSelectedDate(d)}
          onMonthChange={handleMonthChange}
          onRequestOpen={handleOpenRequestModal}
        />
      )}

      {isModalOpen && selectedDate && (
        <RequestModal
          date={selectedDate}
          existingRequest={editingRequest}
          onClose={() => {
            setIsModalOpen(false);
            setEditingRequest(undefined);
          }}
          onSubmit={handleSubmitRequest}
          onDelete={handleDeleteRequest}
          aiEnabled={aiEnabled}
          aiDisabledReason={aiDisabledReason}
          onAiUsage={handleAiUsage}
        />
      )}
    </Layout>
  );
};

export default App;
