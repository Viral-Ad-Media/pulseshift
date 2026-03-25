import { api } from './api';
import { RequestType } from '../types';

export const analyzeRequestConflict = async (
  orgId: string,
  date: string,
  type: RequestType
): Promise<{ allowed: boolean; message: string; aiUsed?: number; aiCredits?: number }> => {
  const res = await api.post('/ai/analyze', { orgId, date, type });
  return res;
};

export const generateAdminResponse = async (
  orgId: string,
  userName: string,
  date: string,
  type: RequestType,
  decision: 'APPROVE' | 'REJECT',
  reason?: string
): Promise<{ message: string; aiUsed?: number; aiCredits?: number }> => {
  const res = await api.post('/ai/respond', { orgId, userName, date, type, decision, reason });
  return res;
};
