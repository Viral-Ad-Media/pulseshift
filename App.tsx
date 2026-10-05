import React, { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "./components/Layout";
import { Calendar } from "./components/Calendar";
import { RequestModal } from "./components/RequestModal";
import { AdminPanel } from "./components/AdminPanel";
import { MyShifts } from "./components/MyShifts";
import { PlanModal } from "./components/PlanModal";
import {
  Organization,
  RequestStatus,
  RequestType,
  Role,
  ShiftRequest,
  User,
} from "./types";
import { api, setAuthToken } from "./services/api";
import { TeamModal } from "./components/TeamModal";
import { Modal } from "./components/Modal";
import { formatDateKey, workspaceToday, dateFromKey } from "./services/dates";
import { mergeRequest } from "./services/requests";

type Membership = { orgId: string; role: Role };
type Notice = { type: "success" | "error" | "info"; message: string };
type SessionUser = {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  title?: string;
};
type SignupPayload = {
  name: string;
  orgName: string;
  email: string;
  password: string;
  timezone: string;
  inviteToken?: string;
};

const TOKEN_KEY = "pulseshift_token";
const WORKSPACE_KEY = "pulseshift_workspace";

const resolvePreferredOrg = (
  memberships: Membership[],
  preferredOrgId: string | null,
) =>
  memberships.some((membership) => membership.orgId === preferredOrgId)
    ? preferredOrgId
    : memberships[0]?.orgId || null;

const AuthCard: React.FC<{
  onLogin: (email: string, password: string) => void;
  onSignup: (payload: SignupPayload) => void;
  loading: boolean;
  error: string | null;
}> = ({ onLogin, onSignup, loading, error }) => {
  const [mode, setMode] = useState<"login" | "signup">(() =>
    window.location.hash.includes("invite=") ? "signup" : "login",
  );
  const [inviteToken, setInviteToken] = useState(
    () =>
      new URLSearchParams(window.location.hash.slice(1)).get("invite") || "",
  );
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (mode === "login") {
      setName("");
      setOrgName("");
      setEmail("");
      setPassword("");
      return;
    }

    setEmail("");
    setPassword("");
  }, [mode]);

  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago";
  const isDisabled =
    loading ||
    !email.trim() ||
    !password.trim() ||
    (mode === "signup" &&
      (!name.trim() ||
        (!inviteToken && !orgName.trim()) ||
        password.length < 12));

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/50 bg-white/90 shadow-[0_28px_90px_rgba(15,23,42,0.12)] backdrop-blur xl:grid-cols-[1.05fr_minmax(0,0.95fr)]">
        <section className="hidden bg-slate-950 p-10 text-white xl:flex xl:flex-col">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-sky-200">
            <i className="fa-solid fa-heart-pulse"></i>
            PulseShift
          </div>
          <h1 className="mt-8 text-5xl font-extrabold leading-tight">
            Healthcare scheduling that feels like a real SaaS workspace.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
            Manage multi-tenant workspaces, staff requests, AI-assisted
            approvals, usage limits, and plan upgrades from one scheduling
            surface built for care teams.
          </p>

          <div className="mt-10 grid gap-4">
            {[
              "Multi-organization auth and workspace switching",
              "Server-side plan limits and AI credit metering",
              "Approval flows for PTO, sick leave, and work coverage",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200"
              >
                <i className="fa-solid fa-check text-emerald-400"></i>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="p-6 sm:p-10">
          <div className="xl:hidden">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
              <i className="fa-solid fa-heart-pulse"></i>
              PulseShift
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-sky-600">
              {mode === "login" ? "Welcome back" : "Create workspace"}
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-950">
              {mode === "login"
                ? "Sign in to your staffing workspace"
                : "Launch a new scheduling workspace"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {mode === "login"
                ? "Sign in with your workspace account."
                : `Start a Team trial or join an invited workspace. Browser timezone: ${timezone}.`}
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="mt-8 space-y-5">
            {mode === "signup" && (
              <>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Your name
                  </span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    placeholder="Alex Morgan"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    {inviteToken
                      ? "Joining an invited workspace"
                      : "Workspace name"}
                  </span>
                  <input
                    disabled={Boolean(inviteToken)}
                    value={orgName}
                    onChange={(event) => setOrgName(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    placeholder="Northstar Clinic"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Invitation token (optional)
                  </span>
                  <input
                    value={inviteToken}
                    onChange={(event) => setInviteToken(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                  />
                </label>
              </>
            )}

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="name@company.com"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                minLength={mode === "signup" ? 12 : undefined}
                placeholder={
                  mode === "signup" ? "At least 12 characters" : "Password"
                }
              />
            </label>
          </div>

          <button
            onClick={() => {
              if (mode === "login") {
                onLogin(email, password);
                return;
              }

              onSignup({
                name,
                orgName,
                email,
                password,
                timezone,
                inviteToken: inviteToken || undefined,
              });
            }}
            disabled={isDisabled}
            className="mt-8 w-full rounded-2xl bg-slate-950 px-4 py-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Working..."
              : mode === "login"
                ? "Sign in"
                : "Create workspace"}
          </button>

          <button
            onClick={() =>
              setMode((current) => (current === "login" ? "signup" : "login"))
            }
            className="mt-4 w-full text-center text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            {mode === "login"
              ? "Need a workspace? Create one"
              : "Already have an account? Sign in"}
          </button>
        </section>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const sessionGeneration = useRef(0);
  const saveInProgress = useRef(false);
  const switchGeneration = useRef(0);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [detailRequest, setDetailRequest] = useState<ShiftRequest | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<SessionUser | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [orgUsers, setOrgUsers] = useState<Record<string, User[]>>({});
  const [requestsByOrg, setRequestsByOrg] = useState<
    Record<string, ShiftRequest[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [viewMode, setViewMode] = useState<"LIST" | "CALENDAR" | "DISPATCH">(
    "DISPATCH",
  );
  const [timeView, setTimeView] = useState<"DAY" | "MONTH">("DAY");
  const [scope, setScope] = useState<"MY" | "TEAM">("TEAM");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingRequest, setEditingRequest] = useState<
    ShiftRequest | undefined
  >(undefined);

  useEffect(() => {
    if (!notice) return undefined;

    const timeout = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const showNotice = (type: Notice["type"], message: string) =>
    setNotice({ type, message });

  const loadOrg = async (orgId: string) => {
    const generation = sessionGeneration.current;
    const response = await api.get(`/orgs/${orgId}/full`);
    if (generation !== sessionGeneration.current) return;
    setOrgs((previous) => {
      const others = previous.filter(
        (organization) => organization.id !== response.org.id,
      );
      return [...others, response.org];
    });
    setOrgUsers((previous) => ({ ...previous, [orgId]: response.users }));
    setRequestsByOrg((previous) => ({
      ...previous,
      [orgId]: response.requests,
    }));
  };

  const hydrateSession = async (
    session: {
      token: string;
      user: SessionUser;
      memberships: Membership[];
      orgs: Organization[];
    },
    preferredOrgId?: string | null,
  ) => {
    setCurrentOrgId(null);
    setAuthToken(session.token);
    setOrgUsers({});
    setRequestsByOrg({});
    localStorage.setItem(TOKEN_KEY, session.token);
    setTokenState(session.token);
    setAuthUser({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      avatar: session.user.avatar,
      title: session.user.title,
    });
    setMemberships(session.memberships);
    setOrgs(session.orgs);

    const resolvedOrgId = resolvePreferredOrg(
      session.memberships,
      preferredOrgId ?? localStorage.getItem(WORKSPACE_KEY),
    );
    const org = session.orgs.find((o) => o.id === resolvedOrgId);
    if (org) setCurrentDate(dateFromKey(workspaceToday(org.timezone)));
    if (resolvedOrgId) {
      localStorage.setItem(WORKSPACE_KEY, resolvedOrgId);
      await loadOrg(resolvedOrgId);
      setCurrentOrgId(resolvedOrgId);
    }
  };

  const fetchMe = async (incomingToken?: string) => {
    const generation = sessionGeneration.current;
    try {
      setLoading(true);
      const data = await api.get("/me");
      if (generation !== sessionGeneration.current) return;
      await hydrateSession(
        {
          token: incomingToken || token || "",
          user: {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            avatar: data.user.avatar,
            title: data.user.title,
          },
          memberships: data.memberships,
          orgs: data.orgs,
        },
        localStorage.getItem(WORKSPACE_KEY),
      );
      setAuthError(null);
    } catch (error: any) {
      if (generation !== sessionGeneration.current) return;
      if ((error as any).status !== 401) {
        setAuthError(
          error.message || "Unable to load workspace. Retry sign in.",
        );
        return;
      }
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(WORKSPACE_KEY);
      setAuthToken(null);
      setTokenState(null);
      setAuthUser(null);
      setMemberships([]);
      setOrgs([]);
      setCurrentOrgId(null);
      setOrgUsers({});
      setRequestsByOrg({});
      setAuthError(error.message || "Unable to load account");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      setBootstrapping(false);
      return;
    }

    setAuthToken(savedToken);
    setTokenState(savedToken);
    fetchMe(savedToken).finally(() => setBootstrapping(false));
  }, []);

  const handleLogin = async (email: string, password: string) => {
    sessionGeneration.current += 1;
    try {
      setLoading(true);
      let response = await api.post("/auth/login", { email, password });
      const invitation = new URLSearchParams(window.location.hash.slice(1)).get(
        "invite",
      );
      if (invitation) {
        setAuthToken(response.token);
        const joined = await api.post("/invitations/accept", {
          token: invitation,
        });
        response = { ...joined, token: response.token };
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }
      await hydrateSession(response);
      setAuthError(null);
      showNotice("success", "Signed in successfully.");
    } catch (error: any) {
      setAuthError(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (payload: SignupPayload) => {
    sessionGeneration.current += 1;
    try {
      setLoading(true);
      const response = await api.post("/auth/signup", payload);
      await hydrateSession(response, response.memberships[0]?.orgId || null);
      setAuthError(null);
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
      showNotice(
        "success",
        payload.inviteToken
          ? "You joined the workspace."
          : "Workspace created. Your Team trial is ready.",
      );
    } catch (error: any) {
      setAuthError(error.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    void api.post("/auth/logout").catch(() => {});
    sessionGeneration.current += 1;
    switchGeneration.current += 1;
    setIsTeamModalOpen(false);
    setDetailRequest(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(WORKSPACE_KEY);
    setAuthToken(null);
    setTokenState(null);
    setAuthUser(null);
    setMemberships([]);
    setOrgs([]);
    setCurrentOrgId(null);
    setOrgUsers({});
    setRequestsByOrg({});
    setSelectedDate(null);
    setEditingRequest(undefined);
    setIsModalOpen(false);
    setIsPlanModalOpen(false);
    setViewMode("DISPATCH");
    setTimeView("DAY");
    setScope("TEAM");
    setCurrentDate(new Date());
    setAuthError(null);
    setNotice(null);
  };

  const handleOrgChange = async (orgId: string) => {
    const previousOrgId = currentOrgId;
    const switchId = ++switchGeneration.current;

    try {
      setLoading(true);
      setScope("TEAM");
      setIsModalOpen(false);
      setDetailRequest(null);
      setIsTeamModalOpen(false);
      setSelectedDate(null);
      setEditingRequest(undefined);
      await loadOrg(orgId);
      if (switchId !== switchGeneration.current) return;
      setCurrentOrgId(orgId);
      const organization = orgs.find((o) => o.id === orgId);
      if (organization)
        setCurrentDate(dateFromKey(workspaceToday(organization.timezone)));
      localStorage.setItem(WORKSPACE_KEY, orgId);
      showNotice("info", "Workspace context updated.");
    } catch (error: any) {
      if (switchId !== switchGeneration.current) return;
      if (previousOrgId) {
        setCurrentOrgId(previousOrgId);
      }
      showNotice("error", error.message || "Failed to load workspace");
    } finally {
      setLoading(false);
    }
  };

  const refreshCurrentOrg = async () => {
    if (!currentOrgId) return;

    try {
      setLoading(true);
      await loadOrg(currentOrgId);
      showNotice("info", "Workspace refreshed.");
    } catch (error: any) {
      showNotice("error", error.message || "Unable to refresh workspace");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRequestModal = (
    date: Date,
    clickedRequest?: ShiftRequest,
  ) => {
    if (clickedRequest && clickedRequest.userId !== currentUser?.id) {
      setDetailRequest(clickedRequest);
      return;
    }
    setSelectedDate(date);
    const dateKey = formatDateKey(date);
    const existing = currentRequests.find(
      (request) =>
        request.userId === currentUser?.id && request.date === dateKey,
    );
    setEditingRequest(existing);
    setIsModalOpen(true);
  };

  const handleMonthChange = (increment: number) => {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + increment);
    setCurrentDate(nextDate);
  };

  const handleSubmitRequest = async (type: RequestType, notes: string) => {
    if (!selectedDate || !currentOrgId || saveInProgress.current) return;
    saveInProgress.current = true;
    const generation = sessionGeneration.current;

    try {
      const payload = {
        date: formatDateKey(selectedDate),
        type,
        notes,
        version: editingRequest?.version,
      };
      const response = editingRequest
        ? await api.put(
            `/orgs/${currentOrgId}/requests/${editingRequest.id}`,
            payload,
          )
        : await api.post(`/orgs/${currentOrgId}/requests`, payload);
      if (generation !== sessionGeneration.current) return;
      setRequestsByOrg((previous) => ({
        ...previous,
        [currentOrgId]: mergeRequest(
          previous[currentOrgId] || [],
          response.request,
        ),
      }));
      setIsModalOpen(false);
      setEditingRequest(undefined);
      showNotice(
        "success",
        editingRequest ? "Request updated." : "Request submitted.",
      );
    } catch (error: any) {
      showNotice("error", error.message || "Unable to save request");
      throw error;
    } finally {
      saveInProgress.current = false;
    }
  };

  const handleDeleteRequest = async () => {
    if (!editingRequest || !currentOrgId) return;

    try {
      await api.del(`/orgs/${currentOrgId}/requests/${editingRequest.id}`, {
        version: editingRequest.version,
      });
      setRequestsByOrg((previous) => ({
        ...previous,
        [currentOrgId]: (previous[currentOrgId] || []).filter(
          (request) => request.id !== editingRequest.id,
        ),
      }));
      setIsModalOpen(false);
      setEditingRequest(undefined);
      showNotice("success", "Request removed.");
    } catch (error: any) {
      showNotice("error", error.message || "Unable to delete request");
      throw error;
    }
  };

  const handleCancelMyRequest = async (requestId: string) => {
    if (!currentOrgId) return;

    try {
      const request = currentRequests.find((r) => r.id === requestId);
      if (!request) return;
      await api.del(`/orgs/${currentOrgId}/requests/${requestId}`, {
        version: request.version,
      });
      setRequestsByOrg((previous) => ({
        ...previous,
        [currentOrgId]: (previous[currentOrgId] || []).filter(
          (request) => request.id !== requestId,
        ),
      }));
      showNotice("success", "Request canceled.");
    } catch (error: any) {
      showNotice("error", error.message || "Unable to cancel request");
    }
  };

  const handleUpdateRequestStatus = async (
    id: string,
    status: RequestStatus,
    response?: string,
  ) => {
    if (!currentOrgId) return;

    try {
      const request = currentRequests.find((r) => r.id === id);
      if (!request) return;
      const result = await api.put(`/orgs/${currentOrgId}/requests/${id}`, {
        status,
        adminResponse: response,
        version: request.version,
      });
      setRequestsByOrg((previous) => ({
        ...previous,
        [currentOrgId]: (previous[currentOrgId] || []).map((request) =>
          request.id === id ? result.request : request,
        ),
      }));
      showNotice("success", `Request ${status.toLowerCase()}.`);
    } catch (error: any) {
      showNotice("error", error.message || "Unable to update request");
      throw error;
    }
  };

  const handleAiUsage = (aiUsed?: number, _aiLimit?: number) => {
    if (!currentOrgId || aiUsed === undefined) return;

    setOrgs((previous) => {
      let changed = false;
      const next = previous.map((organization) => {
        if (organization.id !== currentOrgId) return organization;
        if (organization.aiUsed >= aiUsed) return organization;
        changed = true;
        return { ...organization, aiUsed };
      });

      return changed ? next : previous;
    });
  };

  const handleAcceptInvitation = async (inviteToken: string) => {
    await api.post("/invitations/accept", { token: inviteToken });
    await fetchMe(token || undefined);
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  };

  const handlePanelToggle = () => {
    setViewMode((current) => (current === "LIST" ? "DISPATCH" : "LIST"));
  };

  const currentOrg = useMemo(
    () => orgs.find((organization) => organization.id === currentOrgId) || null,
    [orgs, currentOrgId],
  );
  const currentMembership = useMemo(
    () =>
      memberships.find((membership) => membership.orgId === currentOrgId) ||
      null,
    [memberships, currentOrgId],
  );
  const currentUser: User | null = useMemo(() => {
    if (!authUser || !currentOrg || !currentMembership) return null;

    return {
      id: authUser.id,
      name: authUser.name,
      avatar: authUser.avatar || "https://i.pravatar.cc/100?u=pulseshift",
      role: currentMembership.role,
      orgId: currentOrg.id,
      title: authUser.title,
    };
  }, [authUser, currentOrg, currentMembership]);

  const currentRequests = (currentOrgId && requestsByOrg[currentOrgId]) || [];
  const usersForOrg = (currentOrgId && orgUsers[currentOrgId]) || [];
  const todayKey = workspaceToday(currentOrg?.timezone || "America/Chicago");
  const aiEnabled = currentOrg
    ? currentOrg.plan !== "ESSENTIALS" &&
      currentOrg.aiUsed < currentOrg.aiCredits
    : false;
  const aiDisabledReason =
    currentOrg?.plan === "ESSENTIALS"
      ? "AI conflict checks are available on Team plans and above."
      : "You have used all AI credits for this workspace.";

  const visibleRequests =
    scope === "MY"
      ? currentRequests.filter((request) => request.userId === currentUser?.id)
      : currentRequests;
  const visibleUsers =
    scope === "MY"
      ? usersForOrg.filter((user) => user.id === currentUser?.id)
      : usersForOrg;

  const usageSummary = useMemo(
    () => ({
      requestsUsed: currentRequests.length,
      requestLimit: currentOrg?.requestLimit || 0,
      aiUsed: currentOrg?.aiUsed || 0,
      aiLimit: currentOrg?.aiCredits || 0,
    }),
    [currentOrg, currentRequests.length],
  );

  const workspaceMetrics = useMemo(() => {
    const pendingApprovals = currentRequests.filter(
      (request) => request.status === RequestStatus.PENDING,
    ).length;
    const scheduledToday = currentRequests.filter(
      (request) =>
        request.status === RequestStatus.APPROVED &&
        request.type === RequestType.WORK &&
        request.date === todayKey,
    ).length;
    const upcomingLeave = currentRequests.filter(
      (request) =>
        request.status === RequestStatus.APPROVED &&
        request.type !== RequestType.WORK &&
        request.date >= todayKey,
    ).length;

    return {
      teamMembers: usersForOrg.length,
      pendingApprovals,
      scheduledToday,
      upcomingLeave,
    };
  }, [currentRequests, todayKey, usersForOrg.length]);

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-3xl border border-slate-200 bg-white/85 px-6 py-5 text-sm font-semibold text-slate-700 shadow-lg backdrop-blur">
          Restoring workspace...
        </div>
      </div>
    );
  }

  if (!token || !authUser || !currentOrgId || !currentUser || !currentOrg) {
    return (
      <AuthCard
        onLogin={handleLogin}
        onSignup={handleSignup}
        loading={loading}
        error={authError}
      />
    );
  }

  return (
    <>
      <Layout
        currentUser={currentUser}
        currentOrg={currentOrg}
        organizations={orgs}
        isAdmin={currentMembership?.role === Role.ADMIN}
        onLogout={handleLogout}
        onManageTeam={() => setIsTeamModalOpen(true)}
        onPanelToggle={handlePanelToggle}
        onOrgChange={handleOrgChange}
        onRefresh={refreshCurrentOrg}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        timeView={timeView}
        onTimeViewChange={setTimeView}
        scope={scope}
        onScopeChange={setScope}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        onCreateClick={() => handleOpenRequestModal(currentDate)}
        usageSummary={usageSummary}
        workspaceMetrics={workspaceMetrics}
        onUpgradePlan={() => setIsPlanModalOpen(true)}
      >
        {notice && (
          <div className="pointer-events-none absolute right-4 top-4 z-40">
            <div
              className={`rounded-2xl border px-4 py-3 text-sm shadow-lg ${
                notice.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : notice.type === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-sky-200 bg-sky-50 text-sky-700"
              }`}
            >
              {notice.message}
            </div>
          </div>
        )}

        {loading && (
          <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm">
            Syncing workspace...
          </div>
        )}

        {currentMembership?.role === Role.ADMIN && viewMode === "LIST" ? (
          <div className="p-5 md:p-8">
            <AdminPanel
              requests={currentRequests}
              onUpdateRequest={handleUpdateRequestStatus}
              onAiUsage={handleAiUsage}
              aiEnabled={aiEnabled}
              aiDisabledReason={aiDisabledReason}
              todayKey={todayKey}
            />
          </div>
        ) : viewMode === "LIST" ? (
          <div className="p-5 md:p-8">
            <MyShifts
              requests={currentRequests.filter(
                (request) => request.userId === currentUser.id,
              )}
              onEdit={(request) => {
                const [year, month, day] = request.date.split("-").map(Number);
                handleOpenRequestModal(new Date(year, month - 1, day));
              }}
              onCancel={handleCancelMyRequest}
            />
          </div>
        ) : (
          <Calendar
            currentDate={currentDate}
            requests={visibleRequests}
            viewMode={viewMode}
            timeView={timeView}
            users={visibleUsers}
            workspaceLabel={currentOrg.name}
            selectedDate={selectedDate}
            onDateClick={(date) => setSelectedDate(date)}
            onMonthChange={handleMonthChange}
            onRequestOpen={handleOpenRequestModal}
          />
        )}

        {isModalOpen && selectedDate && currentOrg && (
          <RequestModal
            orgId={currentOrg.id}
            date={selectedDate}
            existingRequest={editingRequest}
            onClose={() => {
              setIsModalOpen(false);
              setEditingRequest(undefined);
            }}
            onSubmit={handleSubmitRequest}
            onDelete={editingRequest ? handleDeleteRequest : undefined}
            aiEnabled={aiEnabled}
            aiDisabledReason={aiDisabledReason}
            onAiUsage={handleAiUsage}
          />
        )}
      </Layout>

      {detailRequest && (
        <Modal
          label="Staffing request details"
          onClose={() => setDetailRequest(null)}
        >
          <div className="rounded-3xl bg-white p-6">
            <h2 className="text-2xl font-bold">{detailRequest.userName}</h2>
            <p className="mt-3">
              {detailRequest.date} — {detailRequest.type} —{" "}
              {detailRequest.status}
            </p>
            {detailRequest.notes && (
              <p className="mt-3">{detailRequest.notes}</p>
            )}
            {detailRequest.adminResponse && (
              <p className="mt-3">{detailRequest.adminResponse}</p>
            )}
            <button
              className="mt-5 rounded-xl border px-4 py-3"
              onClick={() => setDetailRequest(null)}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
      {isTeamModalOpen && currentOrg && (
        <TeamModal
          orgId={currentOrg.id}
          users={usersForOrg}
          isAdmin={currentMembership?.role === Role.ADMIN}
          onClose={() => setIsTeamModalOpen(false)}
          onRefresh={() => fetchMe(token || undefined)}
          onAccept={handleAcceptInvitation}
        />
      )}
      {isPlanModalOpen && currentOrg && (
        <PlanModal
          organization={currentOrg}
          usageSummary={usageSummary}
          onClose={() => setIsPlanModalOpen(false)}
        />
      )}
    </>
  );
};

export default App;
