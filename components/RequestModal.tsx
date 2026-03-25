import React, { useEffect, useState } from 'react';
import { RequestStatus, RequestType, ShiftRequest } from '../types';
import { analyzeRequestConflict } from '../services/gemini';

interface RequestModalProps {
  date: Date;
  orgId: string;
  existingRequest?: ShiftRequest;
  onClose: () => void;
  onSubmit: (type: RequestType, notes: string) => void;
  onDelete?: () => void;
  aiEnabled: boolean;
  aiDisabledReason?: string;
  onAiUsage?: (aiUsed?: number) => void;
}

type AiState = { loading: boolean; allowed: boolean; message: string | null };
type CachedAiAnalysis = { allowed: boolean; message: string; aiUsed?: number; cachedAt: number };

const analysisResultCache = new Map<string, CachedAiAnalysis>();
const analysisPromiseCache = new Map<string, Promise<CachedAiAnalysis>>();
const ANALYSIS_CACHE_TTL_MS = 30000;

export const RequestModal: React.FC<RequestModalProps> = ({
  date,
  orgId,
  existingRequest,
  onClose,
  onSubmit,
  onDelete,
  aiEnabled,
  aiDisabledReason,
  onAiUsage,
}) => {
  const [activeTab, setActiveTab] = useState<RequestType>(existingRequest?.type || RequestType.WORK);
  const [notes, setNotes] = useState(existingRequest?.notes || '');
  const [aiAnalysis, setAiAnalysis] = useState<AiState>({
    loading: true,
    allowed: true,
    message: null,
  });

  const dateStr = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const isEditable = !existingRequest || existingRequest.status === RequestStatus.PENDING;
  const cacheKey = `${orgId}:${isoDate}:${activeTab}`;
  const submitDisabled = !isEditable || (!existingRequest && aiEnabled && aiAnalysis.loading);

  useEffect(() => {
    if (!aiEnabled || existingRequest) {
      setAiAnalysis({
        loading: false,
        allowed: true,
        message: aiDisabledReason || 'AI conflict checks are unavailable for this request.',
      });
      return;
    }

    const cached = analysisResultCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt > ANALYSIS_CACHE_TTL_MS) {
      analysisResultCache.delete(cacheKey);
    }

    const freshCached = analysisResultCache.get(cacheKey);
    if (freshCached) {
      setAiAnalysis({ loading: false, allowed: freshCached.allowed, message: freshCached.message });
      if (freshCached.aiUsed !== undefined) onAiUsage?.(freshCached.aiUsed);
      return;
    }

    let mounted = true;
    setAiAnalysis({ loading: true, allowed: true, message: null });

    const pendingAnalysis =
      analysisPromiseCache.get(cacheKey) ||
      analyzeRequestConflict(orgId, isoDate, activeTab)
        .then((result) => {
          const nextResult = {
            allowed: result.allowed,
            message: result.message,
            aiUsed: result.aiUsed,
            cachedAt: Date.now(),
          };
          analysisResultCache.set(cacheKey, nextResult);
          return nextResult;
        })
        .finally(() => {
          analysisPromiseCache.delete(cacheKey);
        });

    analysisPromiseCache.set(cacheKey, pendingAnalysis);

    pendingAnalysis
      .then((result) => {
        if (!mounted) return;

        setAiAnalysis({
          loading: false,
          allowed: result.allowed,
          message: result.message,
        });
        onAiUsage?.(result.aiUsed);
      })
      .catch((error: Error) => {
        if (!mounted) return;
        setAiAnalysis({
          loading: false,
          allowed: true,
          message: error.message || 'Standard availability check.',
        });
      });

    return () => {
      mounted = false;
    };
  }, [activeTab, aiDisabledReason, aiEnabled, cacheKey, existingRequest, isoDate, onAiUsage, orgId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-2xl animate-fade-in-up">
        <div className="border-b border-slate-100 px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-sky-600">Request</p>
              <h3 className="mt-2 text-2xl font-extrabold text-slate-950">
                {existingRequest ? 'Manage staffing request' : 'Create staffing request'}
              </h3>
              <p className="mt-2 text-sm text-slate-500">{dateStr}</p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="grid grid-cols-3 gap-2 rounded-3xl bg-slate-100 p-1">
            {Object.values(RequestType).map((type) => (
              <button
                key={type}
                onClick={() => isEditable && setActiveTab(type)}
                disabled={!isEditable}
                className={`rounded-[20px] px-4 py-3 text-sm font-semibold transition ${
                  activeTab === type ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'
                } ${!isEditable ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {type === 'WORK' ? 'Work' : type}
              </button>
            ))}
          </div>

          {!existingRequest && (
            <div
              className={`rounded-3xl border px-4 py-4 ${
                aiAnalysis.loading
                  ? 'border-slate-200 bg-slate-50'
                  : aiAnalysis.allowed
                    ? 'border-sky-100 bg-sky-50'
                    : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 text-sm">
                  {aiAnalysis.loading ? (
                    <i className="fa-solid fa-circle-notch animate-spin text-sky-500"></i>
                  ) : aiAnalysis.allowed ? (
                    <i className="fa-solid fa-wand-magic-sparkles text-sky-500"></i>
                  ) : (
                    <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
                  )}
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-slate-900">
                    {aiAnalysis.loading ? 'Checking staffing impact' : aiAnalysis.allowed ? 'Availability insight' : 'Manual review suggested'}
                  </p>
                  <p className="mt-1 leading-6 text-slate-600">
                    {aiAnalysis.loading ? 'Reviewing current coverage and leave activity for this day...' : aiAnalysis.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {existingRequest && existingRequest.status !== RequestStatus.PENDING && (
            <div
              className={`rounded-3xl border px-4 py-4 text-sm ${
                existingRequest.status === RequestStatus.APPROVED
                  ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                  : 'border-rose-100 bg-rose-50 text-rose-700'
              }`}
            >
              This request has already been {existingRequest.status.toLowerCase()}.
            </div>
          )}

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={!isEditable}
              placeholder="Add context for operations or staffing coverage..."
              className="h-28 w-full resize-none rounded-3xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center">
          {onDelete && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to cancel this request?')) onDelete();
              }}
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              {existingRequest?.status === RequestStatus.PENDING ? 'Delete request' : 'Cancel request'}
            </button>
          )}

          <div className="sm:flex-1"></div>

          <button
            onClick={onClose}
            className="rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
          >
            Close
          </button>

          {isEditable && (
            <button
              disabled={submitDisabled}
              onClick={() => onSubmit(activeTab, notes)}
              className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {existingRequest ? 'Save changes' : 'Submit request'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
