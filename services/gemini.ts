import { GoogleGenAI } from "@google/genai";
import { RequestType } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const analyzeRequestConflict = async (
  date: string,
  type: RequestType,
  currentRequestsOnDate: number
): Promise<{ allowed: boolean; message: string }> => {
  if (!apiKey) {
    // Fallback if no API key
    return { allowed: true, message: "System check passed (AI Offline)." };
  }

  const prompt = `
    You are a scheduling assistant for a hospital.
    Date requested: ${date}
    Request Type: ${type}
    Current confirmed staff on this day: ${currentRequestsOnDate} (Mock data: assume capacity is 5).

    Analyze if this request should be flagged as "High Demand" or "Unavailable" based on the date (e.g., major holidays) and the current load.
    
    Return a JSON object:
    {
      "isHighDemand": boolean,
      "message": "Short friendly warning or confirmation message."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '{}';
    const json = JSON.parse(text);
    
    return {
      allowed: !json.isHighDemand, // Simplified logic: High demand = warning
      message: json.message || "Date processed."
    };
  } catch (error) {
    console.error("Gemini analysis failed", error);
    return { allowed: true, message: "Standard availability check." };
  }
};

export const generateAdminResponse = async (
  userName: string,
  date: string,
  type: RequestType,
  decision: 'APPROVE' | 'REJECT',
  reason?: string
): Promise<string> => {
  if (!apiKey) return decision === 'APPROVE' ? "Approved." : "Request denied.";

  const prompt = `
    Draft a short, professional, and empathetic notification for a nurse named ${userName}.
    Topic: Their ${type} request for ${date} has been ${decision}D.
    ${reason ? `Reason/Context: ${reason}` : ''}
    Keep it under 2 sentences.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text?.trim() || "";
  } catch (error) {
    return `Your request has been updated to ${decision}.`;
  }
};