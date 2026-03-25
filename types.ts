export enum Role {
  NURSE = 'NURSE',
  ADMIN = 'ADMIN'
}

export type PlanTier = 'ESSENTIALS' | 'TEAM' | 'BUSINESS';
export type TrialStatus = 'ACTIVE' | 'EXPIRED' | 'NONE';

export enum RequestType {
  WORK = 'WORK',
  PTO = 'PTO',
  SICK = 'SICK'
}

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
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
