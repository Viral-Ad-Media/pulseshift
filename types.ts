export enum Role {
  NURSE = "NURSE",
  ADMIN = "ADMIN",
}

export type PlanTier = "ESSENTIALS" | "TEAM" | "BUSINESS";
export type TrialStatus = "ACTIVE" | "EXPIRED" | "NONE";

export enum RequestType {
  WORK = "WORK",
  PTO = "PTO",
  SICK = "SICK",
}

export enum RequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  orgId?: string;
  title?: string;
}

export interface ShiftRequest {
  id: string;
  version: number;
  userId: string;
  userName: string; // Denormalized for simpler UI
  date: string; // ISO Date string YYYY-MM-DD
  orgId?: string;
  type: RequestType;
  status: RequestStatus;
  notes?: string;
  adminResponse?: string;
  createdAt: number;
}

export interface DayStatus {
  date: string;
  isHoliday: boolean;
  isHighDemand: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry?: string;
  plan: PlanTier;
  timezone: string;
  requestLimit: number;
  aiCredits: number;
  aiUsed: number;
  ownerName: string;
  seats: { total: number; used: number };
  trialEndsOn?: string;
  trialStatus: TrialStatus;
  trialDaysRemaining?: number;
}

export interface PlanLimits {
  tier: PlanTier;
  requestLimit: number;
  aiCredits: number;
  support: string;
  features: string[];
}

export interface SessionState {
  orgId: string;
  userId: string;
}

export type ViewMode =
  | "DASHBOARD"
  | "WORKFORCE"
  | "SETTINGS"
  | "REPORTS"
  | "AUDIT"
  | "IMPORTS"
  | "INTEGRATIONS"
  | "SCHEDULE"
  | "LIST"
  | "CALENDAR"
  | "DISPATCH"
  | "ACTIVITY";
export type TimeView = "DAY" | "WEEK" | "MONTH";
export interface Assignment {
  userId: string;
  breakStartMinutes: number;
  breakMinutes: number;
}
export interface ScheduledShift {
  id: string;
  title: string;
  department: string;
  location: string;
  role: string;
  requiredCount: number;
  localStart: string;
  localEnd: string;
  startsAt: string;
  endsAt: string;
  assignments: Assignment[];
  requiresAcknowledgement: boolean;
  publicationVersion?: number;
}
export interface SchedulingProfile {
  userId: string;
  roles: string[];
  minRestHours: number;
  maxWeeklyHours: number;
}
export interface ScheduleTemplate {
  id: string;
  name: string;
  entries: Array<{ dayOffset: number; title: string }>;
}
export interface ScheduleData {
  revision: number;
  timezone: string;
  shifts: ScheduledShift[];
  published: ScheduledShift[];
  profiles: SchedulingProfile[];
  templates: ScheduleTemplate[];
  issues: Array<{ shiftId: string; code: string; message: string }>;
  acknowledgements: Array<{
    shiftId: string;
    publicationVersion: number;
    userId: string;
    acknowledgedAt: string;
  }>;
}
export interface InboxNotification {
  id: string;
  kind: string;
  message: string;
  entityId: string;
  createdAt: string;
  readAt: string | null;
}
