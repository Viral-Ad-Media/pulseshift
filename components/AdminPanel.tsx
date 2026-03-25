import React, { useMemo, useState } from 'react';
import { RequestStatus, ShiftRequest } from '../types';
import { generateAdminResponse } from '../services/gemini';

interface AdminPanelProps {
  requests: ShiftRequest[];
  onUpdateRequest: (id: string, status: RequestStatus, adminResponse?: string) => Promise<void> | void;
  onAiUsage?: (aiUsed?: number, aiLimit?: number) => void;
  aiEnabled: boolean;
  aiDisabledReason?: string;
}

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const AdminPanel: React.FC<AdminPanelProps> = ({
  requests,
  onUpdateRequest,
  onAiUsage,
  aiEnabled,
  aiDisabledReason,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const pendingRequests = useMemo(
    () =>
      requests
        .filter((request) => request.status === RequestStatus.PENDING)
        .sort((left, right) => left.createdAt - right.createdAt),
    [requests]
  );

  const todayKey = formatDateKey(new Date());
  const approvedToday = requests.filter(
    (request) => request.status === RequestStatus.APPROVED && request.date === todayKey
  ).length;
  const rejectedRequests = requests.filter((request) => request.status === RequestStatus.REJECTED).length;

  const handleAction = async (request: ShiftRequest, action: 'APPROVE' | 'REJECT') => {
    setProcessingId(request.id);

    try {
      const status = action === 'APPROVE' ? RequestStatus.APPROVED : RequestStatus.REJECTED;
      let adminResponse =
        action === 'APPROVE'
          ? 'Your request has been approved by staffing operations.'
          : 'Your request has been declined by staffing operations.';

      if (aiEnabled) {
        try {
          const result = await generateAdminResponse(request.orgId || '', request.userName, request.date, request.type, action);
          adminResponse = result.message || adminResponse;
          if (result.aiUsed !== undefined) onAiUsage?.(result.aiUsed, result.aiCredits);
        } catch (error) {
          console.error('AI response generation failed, falling back to manual copy.', error);
        }
      }

      await onUpdateRequest(request.id, status, adminResponse);
    } catch (error) {
      console.error('Unable to process approval action', error);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-sky-600">Admin Queue</p>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-950">Request approval workflow</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Review incoming staffing requests, make a decision, and optionally send AI-generated responses when credits
            are available.
          </p>
        </div>
        {!aiEnabled && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {aiDisabledReason || 'AI automation is unavailable. Manual approvals still work normally.'}
          </div>
        )}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {[
          { label: 'Pending approvals', value: pendingRequests.length, icon: 'fa-solid fa-hourglass-half' },
          { label: 'Approved today', value: approvedToday, icon: 'fa-solid fa-check-double' },
          { label: 'Rejected requests', value: rejectedRequests, icon: 'fa-solid fa-ban' },
        ].map((card) => (
          <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <i className={card.icon}></i>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{card.label}</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-950">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4">
        {pendingRequests.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-2xl text-slate-400">
              <i className="fa-solid fa-check-double"></i>
            </div>
            <h3 className="text-lg font-semibold text-slate-950">All caught up</h3>
            <p className="mt-2 text-sm text-slate-500">There are no pending requests in the queue right now.</p>
          </div>
        ) : (
          pendingRequests.map((request) => (
            <article
              key={request.id}
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                        request.type === 'WORK'
                          ? 'bg-sky-100 text-sky-700'
                          : request.type === 'PTO'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {request.type}
                    </span>
                    <span className="text-sm text-slate-400">
                      Submitted {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="mt-3 text-xl font-bold text-slate-950">
                    {request.userName}{' '}
                    <span className="font-medium text-slate-500">requested</span>{' '}
                    {new Date(`${request.date}T00:00:00`).toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h4>

                  {request.notes && (
                    <p className="mt-3 inline-flex rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm italic text-slate-600">
                      "{request.notes}"
                    </p>
                  )}
                </div>

                <div className="flex w-full items-center gap-3 lg:w-auto">
                  <button
                    onClick={() => handleAction(request, 'REJECT')}
                    disabled={processingId === request.id}
                    className="flex-1 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleAction(request, 'APPROVE')}
                    disabled={processingId === request.id}
                    className="flex-1 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 disabled:opacity-60 lg:flex-none"
                  >
                    {processingId === request.id && <i className="fa-solid fa-circle-notch mr-2 animate-spin"></i>}
                    Approve
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};
