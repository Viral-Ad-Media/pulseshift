import { api } from "./api";
import { RequestType } from "../types";
export const analyzeRequestConflict = (
  orgId: string,
  date: string,
  type: RequestType,
): Promise<{
  allowed: boolean;
  message: string;
  available: boolean;
  aiUsed?: number;
  aiCredits?: number;
}> => api.post("/ai/analyze", { orgId, date, type });
export const generateAdminResponse = (
  orgId: string,
  requestId: string,
  decision: "APPROVE" | "REJECT",
): Promise<{ message: string; aiUsed?: number; aiCredits?: number }> =>
  api.post("/ai/respond", { orgId, requestId, decision });
