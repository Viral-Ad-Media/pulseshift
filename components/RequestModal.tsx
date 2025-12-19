import React, { useState, useEffect } from 'react';
import { RequestType, ShiftRequest, RequestStatus } from '../types';
import { analyzeRequestConflict } from '../services/gemini';

interface RequestModalProps {
  date: Date;
  existingRequest?: ShiftRequest;
  onClose: () => void;
  onSubmit: (type: RequestType, notes: string) => void;
  onDelete?: () => void;
}

export const RequestModal: React.FC<RequestModalProps> = ({ 
  date, 
  existingRequest,
  onClose, 
  onSubmit,
  onDelete 
}) => {
  const [activeTab, setActiveTab] = useState<RequestType>(existingRequest?.type || RequestType.WORK);
  const [notes, setNotes] = useState(existingRequest?.notes || '');
  const [aiAnalysis, setAiAnalysis] = useState<{ loading: boolean, allowed: boolean, message: string | null }>({ 
    loading: true, 
    allowed: true, 
    message: null 
  });

  const dateStr = date.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' });
  const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const isEditable = !existingRequest || existingRequest.status === RequestStatus.PENDING;

  useEffect(() => {
    // Simulate checking availability with AI
    let mounted = true;
    
    const check = async () => {
      setAiAnalysis({ loading: true, allowed: true, message: null });
      // Random mock "currentRequests" count for demo variety
      const mockCount = Math.floor(Math.random() * 6); 
      const result = await analyzeRequestConflict(isoDate, activeTab, mockCount);
      
      if (mounted) {
        setAiAnalysis({ 
          loading: false, 
          allowed: result.allowed,
          message: result.message 
        });
      }
    };
    check();

    return () => { mounted = false; };
  }, [activeTab, isoDate]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
        <div className="p-6 pb-0">
           <div className="flex justify-between items-start mb-4">
             <div>
               <h3 className="text-xl font-bold text-slate-800">
                 {existingRequest ? 'Manage Request' : 'New Request'}
               </h3>
               <p className="text-slate-500 text-sm mt-1">{dateStr}</p>
             </div>
             <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
               <i className="fa-solid fa-xmark text-xl"></i>
             </button>
           </div>

           {/* Tabs */}
           <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
             {Object.values(RequestType).map((type) => (
               <button
                 key={type}
                 onClick={() => isEditable && setActiveTab(type)}
                 disabled={!isEditable}
                 className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all
                   ${activeTab === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
                   ${!isEditable ? 'opacity-70 cursor-not-allowed' : ''}
                 `}
               >
                 {type === 'WORK' ? 'Work' : type}
               </button>
             ))}
           </div>

           {/* AI Insight */}
           {!existingRequest && (
             <div className={`mb-6 p-4 rounded-xl border flex gap-3 transition-colors ${
               aiAnalysis.loading ? 'bg-slate-50 border-slate-100' : 
               aiAnalysis.allowed ? 'bg-sky-50 border-sky-100' : 'bg-amber-50 border-amber-100'
             }`}>
                <div className={`mt-0.5 ${
                  aiAnalysis.loading ? 'text-sky-500' : 
                  aiAnalysis.allowed ? 'text-sky-500' : 'text-amber-500'
                }`}>
                  {aiAnalysis.loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 
                   aiAnalysis.allowed ? <i className="fa-solid fa-wand-magic-sparkles"></i> : <i className="fa-solid fa-triangle-exclamation"></i>}
                </div>
                <div className="text-sm">
                  <p className={`font-semibold mb-1 ${
                    aiAnalysis.allowed ? 'text-slate-800' : 'text-amber-800'
                  }`}>
                    {aiAnalysis.allowed ? 'Availability Insight' : 'High Demand Alert'}
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    {aiAnalysis.loading ? 'Analyzing schedule conflicts...' : aiAnalysis.message}
                  </p>
                </div>
             </div>
           )}

           {existingRequest && existingRequest.status !== RequestStatus.PENDING && (
              <div className={`mb-6 p-3 rounded-xl border flex gap-3
                ${existingRequest.status === RequestStatus.APPROVED ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}
              `}>
                <div className={`text-sm ${existingRequest.status === RequestStatus.APPROVED ? 'text-green-700' : 'text-red-700'}`}>
                  This request has been <strong>{existingRequest.status.toLowerCase()}</strong>.
                </div>
              </div>
           )}

           <div className="mb-6">
             <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
             <textarea 
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
               disabled={!isEditable}
               placeholder="Add any specific details..."
               className="w-full p-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none h-24 text-sm disabled:bg-slate-50 disabled:text-slate-500"
             />
           </div>
        </div>

        <div className="p-6 pt-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          {onDelete && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to cancel this request?')) onDelete();
              }}
              className="px-4 py-2.5 rounded-xl font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
            >
              {existingRequest?.status === RequestStatus.PENDING ? 'Delete' : 'Cancel'}
            </button>
          )}
          
          <div className="flex-1"></div>

          <button 
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
          
          {isEditable && (
            <button 
              onClick={() => onSubmit(activeTab, notes)}
              className="py-2.5 px-6 rounded-xl font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
            >
              {existingRequest ? 'Save Changes' : 'Submit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};