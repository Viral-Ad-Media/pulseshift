import { api } from "./api";
export interface TimeEntry {
  id: string;
  userId: string;
  shiftId: string;
  department: string;
  location: string;
  timezone: string;
  clockIn: string;
  clockOut: string | null;
  breaks: Array<{ start: string; end: string | null }>;
  status: string;
  version: number;
  approvedBy?: string;
  approvedAt?: string;
  correction?: { reason: string };
}
export interface Credential {
  id: string;
  userId: string;
  type: string;
  expiresOn: string;
  status: string;
  fileId?: string;
}
export interface Vacancy {
  id: string;
  shiftId: string;
  department: string;
  status: string;
  reason?: string;
  createdAt: string;
  rounds: Array<{
    id: string;
    candidates: string[];
    declined: string[];
    expiresAt: string;
  }>;
}
export interface Swap {
  id: string;
  shiftId: string;
  tradeShiftId: string | null;
  department: string;
  fromUserId: string;
  toUserId: string;
  status: string;
}
export interface WorkforceData {
  departmentDrafts?: import("../types").ScheduledShift[];
  revision: number;
  permissions: { admin: boolean; departments: string[] };
  preferences: Array<{
    userId: string;
    unavailableWeekdays: number[];
    avoidNights: boolean;
  }>;
  credentials: Credential[];
  vacancies: Vacancy[];
  swaps: Swap[];
  timesheets: TimeEntry[];
  rates: Array<{ userId: string; hourlyCents: number }>;
  settings: {
    currency: string;
    overtimeThresholdHours: number | null;
    overtimeMultiplier: number | null;
    credentialRules: Array<{ role: string; types: string[] }>;
  };
  access: Array<{ userId: string; departments: string[] }>;
  staffUnits: Array<{ userId: string; departments: string[] }>;
  sites: Array<{ id: string; name: string; departments: string[] }>;
  exceptions: Array<{
    id: string;
    userId: string;
    department: string;
    note: string;
  }>;
  imports: Array<{ id: string; kind: string; count: number }>;
  independentVerificationConfigured: boolean;
  assignmentResponses: Array<{
    shiftId: string;
    publicationVersion: number;
    userId: string;
    decision: string;
  }>;
}
export async function workforceAction(
  orgId: string,
  data: WorkforceData,
  payload: Record<string, unknown>,
  operationId: string = crypto.randomUUID(),
) {
  if (!navigator.onLine)
    throw new Error(
      "Reconnect before making changes. Offline schedules are read-only.",
    );
  return api.post(`/orgs/${orgId}/workforce`, {
    revision: data.revision,
    operationId,
    ...payload,
  });
}
export async function downloadAuthenticated(path: string, name: string) {
  const blob = await api.download(path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
