import React from 'react';
import { ShiftRequest, RequestStatus, RequestType } from '../types';

interface MyShiftsProps {
  requests: ShiftRequest[];
  onEdit: (request: ShiftRequest) => void;
  onCancel: (requestId: string) => void;
}

export const MyShifts: React.FC<MyShiftsProps> = ({ requests, onEdit, onCancel }) => {
  const sortedRequests = [...requests].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.APPROVED: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case RequestStatus.REJECTED: return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  const getTypeIcon = (type: RequestType) => {
    switch (type) {
      case RequestType.WORK: return 'fa-user-nurse';
      case RequestType.PTO: return 'fa-plane';
      case RequestType.SICK: return 'fa-bed-pulse';
      default: return 'fa-calendar';
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-sky-600">My Workspace</p>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-950">My schedule requests</h2>
          <p className="mt-2 text-sm text-slate-500">Track approvals, edit pending submissions, and keep your availability current.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {sortedRequests.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-[28px] border border-dashed border-slate-300 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 text-2xl">
              <i className="fa-regular fa-calendar-xmark"></i>
            </div>
            <h3 className="text-lg font-semibold text-slate-950">No requests yet</h3>
            <p className="text-slate-500">Open any date in the schedule to create your first staffing request.</p>
          </div>
        ) : (
          sortedRequests.map((req) => (
            <div key={req.id} className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm hover:shadow-md transition-all group">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
                
                {/* Date Box */}
                <div className="flex-shrink-0 w-16 h-16 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-slate-700">
                  <span className="text-xs font-bold uppercase">{new Date(req.date + 'T00:00:00').toLocaleString('default', { month: 'short' })}</span>
                  <span className="text-xl font-bold">{new Date(req.date + 'T00:00:00').getDate()}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                     <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusColor(req.status)}`}>
                        <i className={`fa-solid ${req.status === RequestStatus.APPROVED ? 'fa-check' : req.status === RequestStatus.REJECTED ? 'fa-xmark' : 'fa-clock'}`}></i>
                        {req.status}
                     </span>
                     <span className="text-xs text-slate-400">
                       Submitted {new Date(req.createdAt).toLocaleDateString()}
                     </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className={`fa-solid ${getTypeIcon(req.type)} text-slate-400 text-sm`}></i>
                    <h4 className="text-lg font-semibold text-slate-800">
                      {req.type === RequestType.WORK ? 'Shift Request' : req.type}
                    </h4>
                  </div>
                  {req.notes && (
                    <p className="text-sm text-slate-500 mt-1 truncate">"{req.notes}"</p>
                  )}
                  {req.adminResponse && (
                    <div className="mt-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 inline-block">
                      <span className="font-semibold text-slate-700">Admin:</span> {req.adminResponse}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0">
                  {req.status === RequestStatus.PENDING && (
                    <button 
                      onClick={() => onEdit(req)}
                      className="flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  {(req.status === RequestStatus.PENDING || req.status === RequestStatus.APPROVED) && (
                    <button 
                      onClick={() => {
                        if (confirm('Are you sure you want to cancel this request?')) {
                          onCancel(req.id);
                        }
                      }}
                      className="flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  {req.status === RequestStatus.REJECTED && (
                     <button 
                      onClick={() => onCancel(req.id)}
                      className="flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Dismiss
                    </button>
                  )}
                </div>

              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
