import React, { useState } from 'react';
import { ShiftRequest, RequestStatus } from '../types';
import { generateAdminResponse } from '../services/gemini';

interface AdminPanelProps {
  requests: ShiftRequest[];
  onUpdateRequest: (id: string, status: RequestStatus, adminResponse?: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ requests, onUpdateRequest }) => {
  const pendingRequests = requests.filter(r => r.status === RequestStatus.PENDING).sort((a,b) => a.createdAt - b.createdAt);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAction = async (req: ShiftRequest, action: 'APPROVE' | 'REJECT') => {
    setProcessingId(req.id);
    
    // Generate AI response
    const status = action === 'APPROVE' ? RequestStatus.APPROVED : RequestStatus.REJECTED;
    const responseText = await generateAdminResponse(req.userName, req.date, req.type, action);
    
    onUpdateRequest(req.id, status, responseText);
    setProcessingId(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Request Approval Queue</h1>
        <p className="text-slate-500">Manage incoming schedule requests from staff.</p>
      </div>

      <div className="grid gap-4">
        {pendingRequests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 text-2xl">
              <i className="fa-solid fa-check-double"></i>
            </div>
            <h3 className="text-lg font-medium text-slate-900">All caught up!</h3>
            <p className="text-slate-500">No pending requests at the moment.</p>
          </div>
        ) : (
          pendingRequests.map(req => (
            <div key={req.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6 items-start md:items-center">
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide
                    ${req.type === 'WORK' ? 'bg-blue-100 text-blue-700' : ''}
                    ${req.type === 'PTO' ? 'bg-purple-100 text-purple-700' : ''}
                    ${req.type === 'SICK' ? 'bg-rose-100 text-rose-700' : ''}
                  `}>
                    {req.type}
                  </span>
                  <span className="text-sm text-slate-400">Requested on {new Date(req.createdAt).toLocaleDateString()}</span>
                </div>
                
                <h4 className="text-lg font-semibold text-slate-800 mb-1">
                  {req.userName} <span className="font-normal text-slate-500">for</span> {new Date(req.date).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric'})}
                </h4>
                
                {req.notes && (
                  <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg mt-2 italic border border-slate-100 inline-block">
                    "{req.notes}"
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => handleAction(req, 'REJECT')}
                  disabled={processingId === req.id}
                  className="flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleAction(req, 'APPROVE')}
                  disabled={processingId === req.id}
                  className="flex-1 md:flex-none px-6 py-2 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingId === req.id && <i className="fa-solid fa-circle-notch fa-spin"></i>}
                  Approve
                </button>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
};