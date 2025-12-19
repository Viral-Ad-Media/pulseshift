export enum Role {
  NURSE = 'NURSE',
  ADMIN = 'ADMIN'
}

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
}

export interface ShiftRequest {
  id: string;
  userId: string;
  userName: string; // Denormalized for simpler UI
  date: string; // ISO Date string YYYY-MM-DD
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